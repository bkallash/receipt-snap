<?php

use App\Enums\UserRole;
use App\Jobs\ProcessReceiptScan;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\Receipt;
use App\Models\ReceiptImage;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->organization = Organization::factory()->create();
    $this->organization->users()->attach($this->user->id, ['role' => UserRole::Owner->value, 'is_active' => true]);

    TenantContext::set($this->organization->id);
    $token = $this->user->createToken('test-token', ["org:{$this->organization->id}"])->plainTextToken;
    $this->withHeader('Authorization', "Bearer {$token}");
});

it('dispatches ProcessReceiptScan job when scanning expense with receipt images', function (): void {
    Queue::fake();

    $expense = Expense::factory()->create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
    ]);

    ReceiptImage::factory()->create([
        'expense_id' => $expense->id,
    ]);

    $response = $this->postJson("/api/v1/expenses/{$expense->uuid}/scan");

    $response->assertAccepted()
        ->assertJsonPath('message', 'Receipt scan job dispatched successfully.');

    Queue::assertPushed(ProcessReceiptScan::class, fn ($job) => $job->expenseId === $expense->id);
});

it('returns unprocessable if expense has no receipt images', function (): void {
    $expense = Expense::factory()->create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
    ]);

    $response = $this->postJson("/api/v1/expenses/{$expense->uuid}/scan");

    $response->assertUnprocessable()
        ->assertJsonPath('message', 'No receipt images attached to this expense.');
});

it('returns scan status for an expense', function (): void {
    $expense = Expense::factory()->create([
        'organization_id' => $this->organization->id,
        'user_id' => $this->user->id,
    ]);

    $receipt = Receipt::factory()->create([
        'expense_id' => $expense->id,
    ]);

    $response = $this->getJson("/api/v1/expenses/{$expense->uuid}/scan-status");

    $response->assertOk()
        ->assertJsonPath('status', 'completed')
        ->assertJsonPath('receipt.merchant_name', $receipt->merchant_name);
});
