<?php

declare(strict_types=1);

use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

/**
 * @return array{0: Organization, 1: User}
 */
function adminOrg(UserRole $role = UserRole::Admin): array
{
    $organization = Organization::factory()->create();
    $admin = User::factory()->create();
    $organization->users()->attach($admin->id, ['role' => $role->value, 'is_active' => true]);

    return [$organization, $admin];
}

it('redirects an admin to the admin dashboard', function (): void {
    [, $admin] = adminOrg();

    $this->actingAs($admin)
        ->get('/dashboard')
        ->assertRedirect('/admin/dashboard');
});

it('renders the admin dashboard with every metric section', function (): void {
    [$organization, $admin] = adminOrg();

    $department = Department::factory()->create([
        'organization_id' => $organization->id,
        'budget_amount' => 1000,
        'budget_currency' => 'USD',
    ]);

    $employee = User::factory()->create();
    $organization->users()->attach($employee->id, [
        'role' => UserRole::Employee->value,
        'department_id' => $department->id,
        'is_active' => true,
    ]);

    $category = ExpenseCategory::factory()->create(['organization_id' => $organization->id]);

    Expense::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => $employee->id,
        'expense_category_id' => $category->id,
        'status' => ExpenseStatus::Submitted,
        'amount' => 250.00,
        'expense_date' => now()->toDateString(),
        'submitted_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get('/admin/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->has('metrics.kpis')
            ->has('metrics.spend_windows', 3)
            ->has('metrics.trend')
            ->has('metrics.department_budgets.items', 1)
            ->has('metrics.people')
            ->has('metrics.ai_quota')
            ->where('metrics.kpis.pending_count', 1)
            ->where('metrics.kpis.pending_amount', 250)
            ->where('metrics.period.key', 'monthly')
            ->where('metrics.people.active_member_count', 2)
        );
});

it('honours the period selector on the admin dashboard', function (): void {
    [, $admin] = adminOrg();

    $this->actingAs($admin)
        ->get('/admin/dashboard?period=quarterly')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('metrics.period.key', 'quarterly'));
});

it('blocks non-admins from the admin console', function (): void {
    $organization = Organization::factory()->create();
    $employee = User::factory()->create();
    $organization->users()->attach($employee->id, [
        'role' => UserRole::Employee->value,
        'is_active' => true,
    ]);

    $this->actingAs($employee)->get('/admin/dashboard')->assertForbidden();
    $this->actingAs($employee)->get('/admin/approvals')->assertForbidden();
});

it('lists organization-wide claims in the approval inbox', function (): void {
    [$organization, $admin] = adminOrg();

    $employee = User::factory()->create();
    $organization->users()->attach($employee->id, [
        'role' => UserRole::Employee->value,
        'is_active' => true,
    ]);

    Expense::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => $employee->id,
        'status' => ExpenseStatus::Submitted,
        'merchant_name' => 'Contoso Catering',
        'amount' => 80.00,
        'submitted_at' => now(),
    ]);

    Expense::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => $employee->id,
        'status' => ExpenseStatus::Rejected,
        'merchant_name' => 'Rejected Vendor',
        'amount' => 10.00,
    ]);

    $this->actingAs($admin)
        ->get('/admin/approvals')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Approvals')
            ->has('expenses.data', 1)
            ->where('expenses.data.0.merchant_name', 'Contoso Catering')
            ->where('expenses.data.0.can_decide', true)
            ->where('expenses.data.0.is_own_claim', false)
            ->where('tabCounts.pending', 1)
            ->where('tabCounts.rejected', 1)
        );
});

it('marks the admins own claim as undecidable', function (): void {
    [$organization, $admin] = adminOrg();

    Expense::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => $admin->id,
        'status' => ExpenseStatus::Submitted,
        'amount' => 42.00,
        'submitted_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get('/admin/approvals')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('expenses.data.0.can_decide', false)
            ->where('expenses.data.0.is_own_claim', true)
            ->where('ownClaimCount', 1)
        );
});

it('filters the approval inbox by department and amount', function (): void {
    [$organization, $admin] = adminOrg();

    $department = Department::factory()->create(['organization_id' => $organization->id]);

    $inDept = User::factory()->create();
    $organization->users()->attach($inDept->id, [
        'role' => UserRole::Employee->value,
        'department_id' => $department->id,
        'is_active' => true,
    ]);

    $outsideDept = User::factory()->create();
    $organization->users()->attach($outsideDept->id, [
        'role' => UserRole::Employee->value,
        'is_active' => true,
    ]);

    Expense::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => $inDept->id,
        'status' => ExpenseStatus::Submitted,
        'amount' => 500.00,
        'submitted_at' => now(),
    ]);

    Expense::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => $outsideDept->id,
        'status' => ExpenseStatus::Submitted,
        'amount' => 500.00,
        'submitted_at' => now(),
    ]);

    $this->actingAs($admin)
        ->get('/admin/approvals?department='.$department->id)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('expenses.data', 1)
            ->where('expenses.data.0.department_name', $department->name)
        );

    $this->actingAs($admin)
        ->get('/admin/approvals?amount_min=900')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('expenses.data', 0));
});

it('lets an owner switch the administered organization', function (): void {
    [$first, $admin] = adminOrg(UserRole::Owner);

    $second = Organization::factory()->create();
    $second->users()->attach($admin->id, ['role' => UserRole::Admin->value, 'is_active' => true]);

    $this->actingAs($admin)
        ->post('/admin/switch-organization', ['organization_id' => $second->id])
        ->assertRedirect('/admin/dashboard')
        ->assertSessionHas('current_organization_id', $second->id);

    expect($first->id)->not->toBe($second->id);
});

it('refuses to switch to an organization the user does not administer', function (): void {
    [, $admin] = adminOrg();

    $foreign = Organization::factory()->create();

    $this->actingAs($admin)
        ->post('/admin/switch-organization', ['organization_id' => $foreign->id])
        ->assertForbidden();
});
