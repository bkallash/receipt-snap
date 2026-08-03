<?php

declare(strict_types=1);

use App\Models\Department;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('prevents regular employee from accessing manager dashboard', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    $response = $this->actingAs($user)->get('/portal/manager/expenses');

    $response->assertForbidden();
});

it('allows manager to access manager dashboard and view department employee expenses', function (): void {
    $deptA = Department::factory()->create();
    $deptB = Department::factory()->create();
    $org = $deptA->organization;
    $deptB->update(['organization_id' => $org->id]);

    $manager = User::factory()->create();
    $employeeA = User::factory()->create();
    $employeeB = User::factory()->create();

    // Attach manager and employee A to Dept A, employee B to Dept B
    $org->users()->attach($manager->id, ['role' => 'manager', 'department_id' => $deptA->id, 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employeeA->id, ['role' => 'employee', 'department_id' => $deptA->id, 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employeeB->id, ['role' => 'employee', 'department_id' => $deptB->id, 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);

    $expenseA = Expense::factory()->submitted()->create([
        'user_id' => $employeeA->id,
        'organization_id' => $org->id,
        'merchant_name' => 'Dept A Merchant',
    ]);

    $expenseB = Expense::factory()->submitted()->create([
        'user_id' => $employeeB->id,
        'organization_id' => $org->id,
        'merchant_name' => 'Dept B Merchant',
    ]);

    $response = $this->actingAs($manager)->get('/portal/manager/expenses');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ManagerDashboard')
            ->has('expenses', 1)
            ->where('expenses.0.merchant_name', 'Dept A Merchant')
            ->where('department.name', $deptA->name)
        );
});

it('allows admin/owner to view expenses across all departments', function (): void {
    $deptA = Department::factory()->create();
    $deptB = Department::factory()->create();
    $org = $deptA->organization;
    $deptB->update(['organization_id' => $org->id]);

    $admin = User::factory()->create();
    $employeeA = User::factory()->create();
    $employeeB = User::factory()->create();

    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employeeA->id, ['role' => 'employee', 'department_id' => $deptA->id, 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employeeB->id, ['role' => 'employee', 'department_id' => $deptB->id, 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);

    Expense::factory()->submitted()->create([
        'user_id' => $employeeA->id,
        'organization_id' => $org->id,
        'merchant_name' => 'Dept A Merchant',
    ]);

    Expense::factory()->submitted()->create([
        'user_id' => $employeeB->id,
        'organization_id' => $org->id,
        'merchant_name' => 'Dept B Merchant',
    ]);

    $response = $this->actingAs($admin)->get('/portal/manager/expenses');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ManagerDashboard')
            ->has('expenses', 2)
        );
});

it('passes department budget status details to manager dashboard', function (): void {
    $dept = Department::factory()->create([
        'budget_amount' => 5000.00,
        'budget_currency' => 'USD',
        'budget_period' => 'monthly',
    ]);
    $org = $dept->organization;

    $manager = User::factory()->create();
    $employee = User::factory()->create();

    $org->users()->attach($manager->id, ['role' => 'manager', 'department_id' => $dept->id, 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employee->id, ['role' => 'employee', 'department_id' => $dept->id, 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);

    Expense::factory()->approved()->create([
        'user_id' => $employee->id,
        'organization_id' => $org->id,
        'amount' => 1500.00,
        'expense_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($manager)->get('/portal/manager/expenses');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('ManagerDashboard')
            ->has('budget_status')
            ->where('budget_status.budget_amount', 5000)
            ->where('budget_status.spent_amount', 1500)
            ->where('budget_status.remaining_budget', 3500)
        );
});
