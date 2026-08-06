<?php

declare(strict_types=1);

use App\Enums\AuditAction;
use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;
use App\Services\DuplicateDetectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

/**
 * @return array{0: Organization, 1: User}
 */
function createSearchOrgUser(UserRole $role): array
{
    $organization = Organization::factory()->create();
    $user = User::factory()->create(['name' => 'John Doe', 'email' => 'John.Doe@Example.com']);
    $organization->users()->attach($user->id, ['role' => $role->value, 'is_active' => true]);

    return [$organization, $user];
}

it('performs case-insensitive search in admin portal approval inbox', function (): void {
    [$org, $admin] = createSearchOrgUser(UserRole::Admin);
    $employee = User::factory()->create(['name' => 'Alice Smith', 'email' => 'alice@test.com']);
    $org->users()->attach($employee->id, ['role' => UserRole::Employee->value, 'is_active' => true]);

    Expense::factory()->create([
        'organization_id' => $org->id,
        'user_id' => $employee->id,
        'status' => ExpenseStatus::Submitted,
        'merchant_name' => 'Acme Supplies Corp',
        'description' => 'Office Printer Cartridges',
        'submitted_at' => now(),
    ]);

    Expense::factory()->create([
        'organization_id' => $org->id,
        'user_id' => $employee->id,
        'status' => ExpenseStatus::Submitted,
        'merchant_name' => 'Beta Logistics',
        'description' => 'Freight Delivery',
        'submitted_at' => now(),
    ]);

    // Lowercase query
    $this->actingAs($admin)
        ->get('/admin/approvals?search=acme')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('expenses.data', 1)
            ->where('expenses.data.0.merchant_name', 'Acme Supplies Corp')
        );

    // UPPERCASE query
    $this->actingAs($admin)
        ->get('/admin/approvals?search=ACME')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('expenses.data', 1)
            ->where('expenses.data.0.merchant_name', 'Acme Supplies Corp')
        );

    // MixedCase query matching description
    $this->actingAs($admin)
        ->get('/admin/approvals?search=pRiNtEr')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('expenses.data', 1)
            ->where('expenses.data.0.merchant_name', 'Acme Supplies Corp')
        );

    // Query matching user name
    $this->actingAs($admin)
        ->get('/admin/approvals?search=aLiCe')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('expenses.data', 2)
        );
});

it('performs case-insensitive search in accountant portal expenses lookup', function (): void {
    [$org, $accountant] = createSearchOrgUser(UserRole::Accountant);

    Expense::factory()->create([
        'organization_id' => $org->id,
        'merchant_name' => 'Starbucks Coffee',
        'uuid' => 'EXP-9988-ALPHA',
        'expense_date' => now()->toDateString(),
    ]);

    // Lowercase query by merchant
    $this->actingAs($accountant)
        ->get('/accountant/expenses?search=starbucks')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('expenses.data', 1)
            ->where('expenses.data.0.merchant_name', 'Starbucks Coffee')
        );

    // Mixed case query by UUID
    $this->actingAs($accountant)
        ->get('/accountant/expenses?search=exp-9988-alpha')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('expenses.data', 1)
            ->where('expenses.data.0.uuid', 'EXP-9988-ALPHA')
        );
});

it('performs case-insensitive search in accountant audit logs', function (): void {
    [$org, $accountant] = createSearchOrgUser(UserRole::Accountant);

    AuditLog::create([
        'uuid' => (string) Str::uuid(),
        'organization_id' => $org->id,
        'actor_id' => $accountant->id,
        'auditable_type' => Expense::class,
        'auditable_id' => 1001,
        'action' => AuditAction::ExpenseApproved,
        'checksum' => 'dummy',
    ]);

    // Mixed case search for action
    $this->actingAs($accountant)
        ->get('/accountant/audit-logs?search=ExPeNsE')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('logs.data', 1)
        );
});

it('performs case-insensitive merchant matching in DuplicateDetectionService', function (): void {
    $org = Organization::factory()->create();
    $user = User::factory()->create();

    Expense::factory()->create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'merchant_name' => 'Target Superstore',
        'amount' => 150.00,
        'expense_date' => now()->toDateString(),
    ]);

    $service = new DuplicateDetectionService;
    $duplicate = $service->checkDataDuplicate(150.00, 'target superstore', now()->toDateString());

    expect($duplicate)->not->toBeNull();
    expect($duplicate?->merchant_name)->toBe('Target Superstore');
});

it('performs case-insensitive search in API expense index endpoint', function (): void {
    [$org, $user] = createSearchOrgUser(UserRole::Owner);

    Expense::factory()->create([
        'organization_id' => $org->id,
        'user_id' => $user->id,
        'merchant_name' => 'Uber Eats',
        'description' => 'Team Lunch Catering',
        'expense_date' => now()->toDateString(),
    ]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', 'Bearer '.$token)
        ->getJson('/api/v1/expenses?search=uBeR')
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
    expect($response->json('data.0.merchant_name'))->toBe('Uber Eats');
});
