<?php

use App\Ai\Agents\ReceiptParserAgent;
use App\Enums\ExpenseStatus;
use App\Enums\ReceiptProcessingStatus;
use App\Jobs\ProcessReceiptScan;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\Receipt;
use App\Models\ReceiptImage;
use App\Models\User;
use App\Services\CircuitBreakerService;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->organization = Organization::factory()->create();
    $this->organization->users()->attach($this->user->id, ['role' => 'owner', 'is_active' => true]);

    TenantContext::set($this->organization->id);
    (new CircuitBreakerService)->reset();
});

it('parses receipt image and updates expense details using ReceiptParserAgent fake', function (): void {
    ReceiptParserAgent::fake([
        [
            'merchant_name' => 'Target',
            'receipt_date' => '2026-07-25',
            'subtotal' => 40.00,
            'tax' => 5.00,
            'tip' => 0.00,
            'total' => 45.00,
            'currency' => 'USD',
            'card_last_four' => '1234',
            'card_brand' => 'Visa',
            'confidence' => 95.0,
            'line_items' => [
                ['description' => 'Office Paper', 'quantity' => 2, 'unit_price' => 15.00, 'total_price' => 30.00],
                ['description' => 'Pens', 'quantity' => 1, 'unit_price' => 10.00, 'total_price' => 10.00],
            ],
        ],
    ]);

    $expense = Expense::factory()->create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'amount' => 0.00,
        'merchant_name' => null,
        'status' => ExpenseStatus::Draft,
    ]);

    ReceiptImage::factory()->create([
        'expense_id' => $expense->id,
    ]);

    ProcessReceiptScan::dispatchSync($expense->id);

    $receipt = Receipt::where('expense_id', $expense->id)->first();
    expect($receipt)->not->toBeNull()
        ->and($receipt->processing_status)->toBe(ReceiptProcessingStatus::Completed)
        ->and($receipt->merchant_name)->toBe('Target')
        ->and((float) $receipt->total)->toBe(45.00)
        ->and((float) $receipt->confidence_score)->toBe(95.00);

    $freshExpense = $expense->fresh();
    expect($freshExpense->merchant_name)->toBe('Target')
        ->and((float) $freshExpense->amount)->toBe(45.00);

    expect($freshExpense->lineItems)->toHaveCount(2);
});

it('sets expense to PendingScan when circuit breaker is open', function (): void {
    $circuitBreaker = new CircuitBreakerService;
    for ($i = 0; $i < 5; $i++) {
        $circuitBreaker->recordFailure();
    }

    $expense = Expense::factory()->create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
    ]);

    ReceiptImage::factory()->create([
        'expense_id' => $expense->id,
    ]);

    ProcessReceiptScan::dispatchSync($expense->id);

    expect($expense->fresh()->status)->toBe(ExpenseStatus::PendingScan);
});

it('uses default currency from config when currency is not detected', function (): void {
    config(['receipt-snap.default_currency' => 'EUR']);

    ReceiptParserAgent::fake([
        [
            'merchant_name' => 'Carrefour',
            'receipt_date' => '2026-07-25',
            'subtotal' => 20.00,
            'tax' => 4.00,
            'total' => 24.00,
            'confidence' => 90.0,
        ],
    ]);

    $expense = Expense::factory()->create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
        'amount' => 0.00,
        'status' => ExpenseStatus::Draft,
    ]);

    ReceiptImage::factory()->create([
        'expense_id' => $expense->id,
    ]);

    ProcessReceiptScan::dispatchSync($expense->id);

    $receipt = Receipt::where('expense_id', $expense->id)->first();
    expect($receipt->currency)->toBe('EUR');

    $freshExpense = $expense->fresh();
    expect($freshExpense->currency_code)->toBe('EUR');
});
