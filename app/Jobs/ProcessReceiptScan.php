<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Ai\Agents\ReceiptParserAgent;
use App\Enums\ExpenseStatus;
use App\Enums\ReceiptProcessingStatus;
use App\Jobs\Concerns\WithTenantContext;
use App\Models\Expense;
use App\Models\Receipt;
use App\Services\AiQuotaService;
use App\Services\CircuitBreakerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Files\Image;

final class ProcessReceiptScan implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels, WithTenantContext;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [10, 20, 40];

    public function __construct(
        public readonly int $expenseId,
    ) {
        $this->captureTenantContext();
    }

    public function uniqueId(): string
    {
        return (string) $this->expenseId;
    }

    public function handle(
        CircuitBreakerService $circuitBreaker,
        AiQuotaService $aiQuotaService,
    ): void {
        $this->bindTenantContext();

        $expense = Expense::with('receiptImages')->find($this->expenseId);

        if (! $expense) {
            return;
        }

        // Circuit breaker check
        if (! $circuitBreaker->isAvailable()) {
            Log::warning('Circuit breaker OPEN. Setting expense to PendingScan.', ['expense_id' => $this->expenseId]);
            $expense->update(['status' => ExpenseStatus::PendingScan]);

            Receipt::updateOrCreate(
                ['expense_id' => $expense->id],
                ['processing_status' => ReceiptProcessingStatus::Pending]
            );

            // Re-dispatch after recovery timeout
            self::dispatch($this->expenseId)->delay(now()->addMinutes(5));

            return;
        }

        $primaryImage = $expense->receiptImages()->orderBy('sort_order')->first();
        if (! $primaryImage) {
            Log::warning('No receipt images found for expense.', ['expense_id' => $this->expenseId]);

            return;
        }

        // Mark receipt as processing
        $receipt = Receipt::updateOrCreate(
            ['expense_id' => $expense->id],
            ['processing_status' => ReceiptProcessingStatus::Processing]
        );

        try {
            $providerName = (string) config('receipt-snap.ai.provider', 'gemini');
            $provider = Lab::tryFrom($providerName) ?? Lab::Gemini;
            $model = config('receipt-snap.ai.model');

            // Prompt agent via laravel/ai SDK
            $imageAttachment = Image::fromStorage($primaryImage->file_path, disk: $primaryImage->disk ?: 'local');
            $response = (new ReceiptParserAgent)->prompt(
                'Extract all structured receipt data from this image.',
                attachments: [$imageAttachment],
                provider: $provider,
                model: $model,
            );

            $data = method_exists($response, 'toArray') ? $response->toArray() : (array) $response;
            $confidence = (float) ($response['confidence'] ?? $data['confidence'] ?? 0.0);

            // Update receipt model
            $receipt->update([
                'merchant_name' => $response['merchant_name'] ?? $data['merchant_name'] ?? null,
                'receipt_date' => $response['receipt_date'] ?? $data['receipt_date'] ?? null,
                'subtotal' => isset($response['subtotal']) ? (float) $response['subtotal'] : (isset($data['subtotal']) ? (float) $data['subtotal'] : null),
                'tax' => isset($response['tax']) ? (float) $response['tax'] : (isset($data['tax']) ? (float) $data['tax'] : null),
                'tip' => isset($response['tip']) ? (float) $response['tip'] : (isset($data['tip']) ? (float) $data['tip'] : null),
                'total' => isset($response['total']) ? (float) $response['total'] : (isset($data['total']) ? (float) $data['total'] : null),
                'currency' => $response['currency'] ?? $data['currency'] ?? config('receipt-snap.default_currency', 'USD'),
                'card_last_four' => $response['card_last_four'] ?? $data['card_last_four'] ?? null,
                'card_brand' => $response['card_brand'] ?? $data['card_brand'] ?? null,
                'raw_ocr_text' => json_encode($data),
                'confidence_score' => $confidence,
                'parser_provider' => $providerName,
                'processing_status' => ReceiptProcessingStatus::Completed,
                'parsed_at' => now(),
            ]);

            // Save extracted line items if present
            $lineItems = $response['line_items'] ?? $data['line_items'] ?? [];
            if (! empty($lineItems) && is_array($lineItems)) {
                $expense->lineItems()->delete();
                foreach ($lineItems as $sort => $item) {
                    $qty = (float) ($item['quantity'] ?? 1);
                    $unitPrice = (float) ($item['unit_price'] ?? 0);
                    $expense->lineItems()->create([
                        'description' => (string) ($item['description'] ?? 'Item'),
                        'quantity' => $qty,
                        'unit_price' => $unitPrice,
                        'total_price' => (float) ($item['total_price'] ?? ($qty * $unitPrice)),
                        'sort_order' => $sort,
                    ]);
                }
            }

            // Auto-populate expense fields if confidence is high (>= threshold)
            $threshold = (float) config('receipt-snap.ai.confidence_threshold', 70.0);
            if ($confidence >= $threshold) {
                $updates = [];
                $merchant = $response['merchant_name'] ?? $data['merchant_name'] ?? null;
                $total = $response['total'] ?? $data['total'] ?? null;
                $tax = $response['tax'] ?? $data['tax'] ?? null;
                $tip = $response['tip'] ?? $data['tip'] ?? null;
                $currency = $response['currency'] ?? $data['currency'] ?? config('receipt-snap.default_currency', 'USD');
                $receiptDate = $response['receipt_date'] ?? $data['receipt_date'] ?? null;

                if (! empty($merchant)) {
                    $updates['merchant_name'] = $merchant;
                }
                if (! empty($total)) {
                    $updates['amount'] = (float) $total;
                }
                if (! empty($tax)) {
                    $updates['tax_amount'] = (float) $tax;
                }
                if (! empty($tip)) {
                    $updates['tip_amount'] = (float) $tip;
                }
                if (! empty($currency)) {
                    $updates['currency_code'] = strtoupper((string) $currency);
                }
                if (! empty($receiptDate)) {
                    $updates['expense_date'] = $receiptDate;
                }

                if ($expense->status === ExpenseStatus::PendingScan || $expense->status === ExpenseStatus::Draft) {
                    $updates['status'] = ExpenseStatus::Draft;
                }

                $expense->update($updates);
            }

            // Record success and increment quota
            $circuitBreaker->recordSuccess();
            $aiQuotaService->incrementUsage($expense->organization);

        } catch (\Throwable $e) {
            $circuitBreaker->recordFailure();

            $receipt->update([
                'processing_status' => ReceiptProcessingStatus::Failed,
            ]);

            Log::error('ProcessReceiptScan failed.', [
                'expense_id' => $this->expenseId,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
