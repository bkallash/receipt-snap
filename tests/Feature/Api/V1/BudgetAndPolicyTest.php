<?php

use App\Enums\BudgetPeriod;
use App\Models\Department;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows admin to create category with budget fields and query budget status', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/categories', [
            'name' => 'Software Subscriptions',
            'max_amount' => 500.00,
            'budget_amount' => 2000.00,
            'budget_currency' => 'USD',
            'budget_period' => BudgetPeriod::Monthly->value,
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Software Subscriptions')
        ->assertJsonPath('data.budget_amount', '2000.00')
        ->assertJsonPath('data.budget_period', 'monthly');

    $categoryId = $response->json('data.id');

    $statusResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/v1/categories/{$categoryId}/budget-status");

    $statusResponse->assertOk()
        ->assertJsonPath('budget_amount', 2000)
        ->assertJsonPath('spent_amount', 0)
        ->assertJsonPath('remaining_budget', 2000);
});

it('calculates department budget utilization correctly', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();

    $department = Department::create([
        'organization_id' => $org->id,
        'name' => 'Engineering',
        'budget_amount' => 1000.00,
        'budget_currency' => 'USD',
        'budget_period' => BudgetPeriod::Monthly,
    ]);

    $org->users()->attach($user->id, [
        'role' => 'employee',
        'department_id' => $department->id,
        'is_active' => true,
        'joined_at' => now(),
    ]);

    TenantContext::set($org->id);
    Expense::factory()->approved()->create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'amount' => 300.00,
        'expense_date' => now()->toDateString(),
    ]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson("/api/v1/departments/{$department->id}/budget-status");

    $response->assertOk()
        ->assertJsonPath('budget_amount', 1000)
        ->assertJsonPath('spent_amount', 300)
        ->assertJsonPath('remaining_budget', 700)
        ->assertJsonPath('utilization_percentage', 30);
});

it('flags missing receipt and weekend transaction on expense submission', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    // Last Saturday date (valid past/present date)
    $saturday = CarbonImmutable::parse('last Saturday');

    $createResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/expenses', [
            'merchant_name' => 'Weekend Restaurant',
            'amount' => 150.00, // > $25 threshold, no receipt image
            'currency_code' => 'USD',
            'expense_date' => $saturday->toDateString(),
        ]);

    $createResponse->assertCreated();
    $uuid = $createResponse->json('data.id');

    $submitResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/expenses/{$uuid}/submit");

    $submitResponse->assertOk()
        ->assertJsonPath('data.status', 'under_review');

    $flags = $submitResponse->json('data.policy_flags');
    $flagCodes = array_column($flags, 'code');

    expect($flagCodes)->toContain('MISSING_RECEIPT')
        ->toContain('WEEKEND_TRANSACTION');
});

it('filters expenses by flagged status', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);

    // Expense with policy flag
    $flaggedExpense = Expense::factory()->create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'amount' => 100.00,
        'metadata' => [
            'policy_flags' => [
                ['code' => 'MISSING_RECEIPT', 'severity' => 'warning', 'message' => 'Missing receipt.'],
            ],
        ],
    ]);

    // Clean expense without flags
    $cleanExpense = Expense::factory()->create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'amount' => 10.00,
        'metadata' => [],
    ]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/expenses?flagged=true');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $flaggedExpense->uuid);
});
