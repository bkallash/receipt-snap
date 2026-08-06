<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\AggregateType;
use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Models\Expense;
use App\Models\ExpenseAggregate;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AggregateTest extends TestCase
{
    use RefreshDatabase;

    private Organization $organization;

    private User $admin;

    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::factory()->create();
        $this->admin = User::factory()->create();
        $this->employee = User::factory()->create();

        $this->organization->users()->attach($this->admin->id, ['role' => UserRole::Admin->value, 'is_active' => true]);
        $this->organization->users()->attach($this->employee->id, ['role' => UserRole::Employee->value, 'is_active' => true]);
    }

    public function test_expense_creation_does_not_update_aggregates_until_approved(): void
    {
        Sanctum::actingAs($this->admin, ["org:{$this->organization->id}"]);

        $response = $this->postJson('/api/v1/expenses', [
            'amount' => 200.00,
            'currency_code' => 'USD',
            'expense_date' => now()->toDateString(),
            'merchant_name' => 'Tech Store',
        ]);

        $response->assertCreated();

        $aggregate = ExpenseAggregate::where('organization_id', $this->organization->id)
            ->where('aggregate_type', AggregateType::Organization->value)
            ->where('period', 'monthly')
            ->where('period_start', now()->startOfMonth()->toDateString())
            ->first();

        $this->assertNull($aggregate);
    }

    public function test_expense_approval_updates_approved_aggregate_counters(): void
    {
        $expense = Expense::factory()->create([
            'organization_id' => $this->organization->id,
            'user_id' => $this->employee->id,
            'status' => ExpenseStatus::Draft,
            'amount' => 100.00,
            'expense_date' => now()->toDateString(),
        ]);

        Sanctum::actingAs($this->employee, ["org:{$this->organization->id}"]);
        $this->postJson("/api/v1/expenses/{$expense->uuid}/submit")->assertOk();

        Sanctum::actingAs($this->admin, ["org:{$this->organization->id}"]);
        $this->postJson("/api/v1/expenses/{$expense->uuid}/approve")->assertOk();

        $aggregate = ExpenseAggregate::where('organization_id', $this->organization->id)
            ->where('aggregate_type', AggregateType::Organization->value)
            ->where('period', 'monthly')
            ->where('period_start', now()->startOfMonth()->toDateString())
            ->first();

        $this->assertNotNull($aggregate);
        $this->assertEquals(1, $aggregate->approved_count);
        $this->assertEquals(100.00, (float) $aggregate->approved_amount);
    }

    public function test_artisan_command_recalculates_aggregates(): void
    {
        Expense::factory()->count(3)->create([
            'organization_id' => $this->organization->id,
            'user_id' => $this->employee->id,
            'status' => ExpenseStatus::Approved,
            'amount' => 50.00,
            'expense_date' => now()->toDateString(),
        ]);

        $this->artisan('aggregates:recalculate', ['--org' => $this->organization->id])
            ->assertSuccessful();

        $aggregate = ExpenseAggregate::where('organization_id', $this->organization->id)
            ->where('aggregate_type', AggregateType::Organization->value)
            ->where('period', 'monthly')
            ->where('period_start', now()->startOfMonth()->toDateString())
            ->first();

        $this->assertNotNull($aggregate);
        $this->assertEquals(3, $aggregate->approved_count);
        $this->assertEquals(150.00, (float) $aggregate->approved_amount);
    }

    public function test_aggregates_summary_endpoint_returns_data(): void
    {
        Sanctum::actingAs($this->admin, ["org:{$this->organization->id}"]);

        Expense::factory()->create([
            'organization_id' => $this->organization->id,
            'user_id' => $this->employee->id,
            'status' => ExpenseStatus::Approved,
            'amount' => 120.00,
            'expense_date' => now()->toDateString(),
        ]);

        $response = $this->getJson('/api/v1/aggregates/summary');

        $response->assertOk()
            ->assertJsonPath('period', 'monthly')
            ->assertJsonPath('organization_summary.approved_amount', 120);
    }

    public function test_employee_cannot_view_aggregates_summary(): void
    {
        Sanctum::actingAs($this->employee, ["org:{$this->organization->id}"]);

        $this->getJson('/api/v1/aggregates/summary')->assertForbidden();
    }
}
