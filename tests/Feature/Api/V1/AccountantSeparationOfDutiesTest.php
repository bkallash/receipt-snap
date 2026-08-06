<?php

declare(strict_types=1);

use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows accountant to view all organization expenses', function (): void {
    $accountant = User::factory()->create();
    $employee = User::factory()->create();
    $org = Organization::factory()->create();

    $org->users()->attach($accountant->id, ['role' => 'accountant', 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employee->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $expense = Expense::factory()->approved()->create([
        'user_id' => $employee->id,
        'organization_id' => $org->id,
        'amount' => 150.00,
    ]);

    $token = $accountant->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/v1/expenses/{$expense->uuid}");

    $response->assertOk()
        ->assertJsonPath('data.amount', '150.00');
});

it('prevents accountant from approving an expense due to separation of duties', function (): void {
    $accountant = User::factory()->create();
    $employee = User::factory()->create();
    $org = Organization::factory()->create();

    $org->users()->attach($accountant->id, ['role' => 'accountant', 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employee->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $expense = Expense::factory()->submitted()->create([
        'user_id' => $employee->id,
        'organization_id' => $org->id,
        'amount' => 200.00,
    ]);

    $token = $accountant->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/expenses/{$expense->uuid}/approve");

    $response->assertForbidden();
});

it('prevents accountant from rejecting an expense due to separation of duties', function (): void {
    $accountant = User::factory()->create();
    $employee = User::factory()->create();
    $org = Organization::factory()->create();

    $org->users()->attach($accountant->id, ['role' => 'accountant', 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employee->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $expense = Expense::factory()->submitted()->create([
        'user_id' => $employee->id,
        'organization_id' => $org->id,
    ]);

    $token = $accountant->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/expenses/{$expense->uuid}/reject", ['reason' => 'Invalid']);

    $response->assertForbidden();
});

it('allows accountant to create reimbursement batch and mark expenses as reimbursed', function (): void {
    $accountant = User::factory()->create();
    $employee = User::factory()->create();
    $org = Organization::factory()->create();

    $org->users()->attach($accountant->id, ['role' => 'accountant', 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employee->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $expense1 = Expense::factory()->approved()->create(['user_id' => $employee->id, 'organization_id' => $org->id, 'amount' => 100.00]);
    $expense2 = Expense::factory()->approved()->create(['user_id' => $employee->id, 'organization_id' => $org->id, 'amount' => 50.00]);

    $token = $accountant->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/reimbursement-batches', [
            'expense_uuids' => [$expense1->uuid, $expense2->uuid],
            'payment_method' => 'nacha_ach',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.total_amount', '150.00')
        ->assertJsonPath('data.claim_count', 2);

    $batchId = $response->json('data.id');

    $executeResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/reimbursement-batches/{$batchId}/execute");

    $executeResponse->assertOk()
        ->assertJsonPath('data.status', 'completed');

    $this->assertDatabaseHas('expenses', [
        'uuid' => $expense1->uuid,
        'status' => 'reimbursed',
    ]);
});
