<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ApprovalStatus;
use App\Enums\AuditAction;
use App\Enums\ExpenseStatus;
use App\Models\ApprovalStep;
use App\Models\Expense;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

final class ExpenseService
{
    public function __construct(
        private readonly PolicyEnforcementService $policyEnforcementService,
        private readonly AuditLogService $auditLogService
    ) {}

    /**
     * Create an expense atomically with optional line items and uploaded receipt images.
     *
     * @param  array<string, mixed>  $data
     * @param  array<UploadedFile>  $uploadedFiles
     */
    public function createExpense(User $user, array $data, array $uploadedFiles = []): Expense
    {
        $orgId = TenantContext::get() ?? throw new \RuntimeException('Tenant context missing.');

        // Pre-store uploaded files before DB transaction
        $disk = config('filesystems.default', 'local');
        $storedImagesData = [];
        foreach ($uploadedFiles as $index => $file) {
            $path = $file->store("receipts/{$orgId}", $disk);
            $storedImagesData[] = [
                'disk' => $disk,
                'file_path' => $path,
                'original_filename' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
                'sort_order' => $index,
            ];
        }

        try {
            $expense = DB::transaction(function () use ($user, $orgId, $data, $storedImagesData): Expense {
                $expense = Expense::create([
                    'uuid' => (string) Str::uuid(),
                    'organization_id' => $orgId,
                    'user_id' => $user->id,
                    'expense_category_id' => $data['expense_category_id'] ?? null,
                    'merchant_name' => $data['merchant_name'] ?? null,
                    'description' => $data['description'] ?? null,
                    'amount' => $data['amount'],
                    'tax_amount' => $data['tax_amount'] ?? null,
                    'tip_amount' => $data['tip_amount'] ?? null,
                    'currency_code' => strtoupper($data['currency_code']),
                    'expense_date' => $data['expense_date'],
                    'payment_method' => $data['payment_method'] ?? null,
                    'status' => ExpenseStatus::Draft,
                ]);

                if (! empty($data['line_items'])) {
                    foreach ($data['line_items'] as $sort => $item) {
                        $qty = (float) ($item['quantity'] ?? 1);
                        $unitPrice = (float) $item['unit_price'];
                        $expense->lineItems()->create([
                            'description' => $item['description'],
                            'quantity' => $qty,
                            'unit_price' => $unitPrice,
                            'total_price' => round($qty * $unitPrice, 2),
                            'sort_order' => $sort,
                        ]);
                    }
                }

                foreach ($storedImagesData as $imgData) {
                    $expense->receiptImages()->create($imgData);
                }

                return $expense;
            });

            // Evaluate policy flags
            $flags = $this->policyEnforcementService->evaluate($expense);
            if (! empty($flags)) {
                $meta = $expense->metadata ?? [];
                $meta['policy_flags'] = $flags;
                $expense->update(['metadata' => $meta]);
            }

            $freshExpense = $expense->fresh();

            $this->auditLogService->record(
                action: AuditAction::ExpenseCreated,
                auditable: $freshExpense,
                beforeState: null,
                afterState: $freshExpense->toArray(),
                actor: $user
            );

            return $freshExpense;
        } catch (\Throwable $e) {
            // Clean up stored files if DB transaction fails
            foreach ($storedImagesData as $imgData) {
                if (is_string($imgData['file_path'])) {
                    Storage::disk((string) $imgData['disk'])->delete($imgData['file_path']);
                }
            }

            throw $e;
        }
    }

    /**
     * Update a draft expense and sync line items atomically.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateExpense(Expense $expense, array $data): Expense
    {
        if (in_array($expense->status, [ExpenseStatus::Approved, ExpenseStatus::Reimbursed], true)) {
            throw new \RuntimeException('Approved expenses are immutable and cannot be updated.');
        }

        $beforeState = $expense->toArray();

        DB::transaction(function () use ($expense, $data): void {
            $expenseUpdates = array_diff_key($data, array_flip(['line_items', 'receipt_images']));
            if (! empty($expenseUpdates)) {
                $expense->update($expenseUpdates);
            }

            if (array_key_exists('line_items', $data) && is_array($data['line_items'])) {
                $expense->lineItems()->delete();
                foreach ($data['line_items'] as $sort => $item) {
                    $qty = (float) ($item['quantity'] ?? 1);
                    $unitPrice = (float) ($item['unit_price'] ?? 0);
                    $expense->lineItems()->create([
                        'description' => (string) $item['description'],
                        'quantity' => $qty,
                        'unit_price' => $unitPrice,
                        'total_price' => (float) ($item['total_price'] ?? round($qty * $unitPrice, 2)),
                        'sort_order' => $sort,
                    ]);
                }
            }
        });

        // Re-evaluate policy flags after updating details
        $flags = $this->policyEnforcementService->evaluate($expense);
        $meta = $expense->metadata ?? [];
        $meta['policy_flags'] = $flags;
        $expense->update(['metadata' => $meta]);

        $freshExpense = $expense->fresh();

        $this->auditLogService->record(
            action: AuditAction::ExpenseUpdated,
            auditable: $freshExpense,
            beforeState: $beforeState,
            afterState: $freshExpense->toArray()
        );

        return $freshExpense;
    }

    public function submitExpense(Expense $expense): Expense
    {
        if (! in_array($expense->status, [ExpenseStatus::Draft, ExpenseStatus::Rejected], true)) {
            throw new \RuntimeException('Only draft or rejected expenses can be submitted.');
        }

        $beforeState = $expense->toArray();

        $flags = $this->policyEnforcementService->evaluate($expense);
        $meta = $expense->metadata ?? [];
        $meta['policy_flags'] = $flags;

        $hasWarnings = array_filter($flags, fn ($f) => in_array($f['severity'], ['warning', 'critical'], true));
        $targetStatus = ! empty($hasWarnings) ? ExpenseStatus::UnderReview : ExpenseStatus::Submitted;

        $expense->update([
            'status' => $targetStatus,
            'submitted_at' => now(),
            'rejection_reason' => null,
            'metadata' => $meta,
        ]);

        $freshExpense = $expense->fresh();

        $this->auditLogService->record(
            action: AuditAction::ExpenseSubmitted,
            auditable: $freshExpense,
            beforeState: $beforeState,
            afterState: $freshExpense->toArray()
        );

        return $freshExpense;
    }

    public function approveExpense(Expense $expense, User $approver, ?string $comment = null): Expense
    {
        if ($approver->id === $expense->user_id) {
            throw new \RuntimeException('Users cannot approve their own expenses.');
        }

        $beforeState = $expense->toArray();

        DB::transaction(function () use ($expense, $approver, $comment): void {
            $expense->update([
                'status' => ExpenseStatus::Approved,
                'approved_at' => now(),
            ]);

            ApprovalStep::create([
                'expense_id' => $expense->id,
                'approver_id' => $approver->id,
                'step_order' => 1,
                'status' => ApprovalStatus::Approved,
                'comment' => $comment,
                'acted_at' => now(),
            ]);
        });

        $freshExpense = $expense->fresh();

        $this->auditLogService->record(
            action: AuditAction::ExpenseApproved,
            auditable: $freshExpense,
            beforeState: $beforeState,
            afterState: $freshExpense->toArray(),
            actor: $approver,
            metadata: ['comment' => $comment]
        );

        return $freshExpense;
    }

    public function rejectExpense(Expense $expense, User $approver, string $reason): Expense
    {
        if ($approver->id === $expense->user_id) {
            throw new \RuntimeException('Users cannot reject their own expenses.');
        }

        $beforeState = $expense->toArray();

        DB::transaction(function () use ($expense, $approver, $reason): void {
            $expense->update([
                'status' => ExpenseStatus::Rejected,
                'rejected_at' => now(),
                'rejection_reason' => $reason,
            ]);

            ApprovalStep::create([
                'expense_id' => $expense->id,
                'approver_id' => $approver->id,
                'step_order' => 1,
                'status' => ApprovalStatus::Rejected,
                'comment' => $reason,
                'acted_at' => now(),
            ]);
        });

        $freshExpense = $expense->fresh();

        $this->auditLogService->record(
            action: AuditAction::ExpenseRejected,
            auditable: $freshExpense,
            beforeState: $beforeState,
            afterState: $freshExpense->toArray(),
            actor: $approver,
            metadata: ['rejection_reason' => $reason]
        );

        return $freshExpense;
    }

    /**
     * @param  array<string, mixed>  $updates
     */
    public function adminCorrectExpense(Expense $expense, array $updates): Expense
    {
        throw new \RuntimeException('Approved expenses are immutable and cannot be updated.');
    }
}
