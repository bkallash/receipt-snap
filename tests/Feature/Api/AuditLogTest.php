<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\AuditAction;
use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AuditLogTest extends TestCase
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

    public function test_expense_creation_records_immutable_audit_log(): void
    {
        Sanctum::actingAs($this->admin, ["org:{$this->organization->id}"]);

        $response = $this->postJson('/api/v1/expenses', [
            'amount' => 150.00,
            'currency_code' => 'USD',
            'expense_date' => '2026-08-01',
            'merchant_name' => 'Acme Corp',
            'description' => 'Test Expense',
        ]);

        $response->assertCreated();

        $expense = Expense::where('merchant_name', 'Acme Corp')->firstOrFail();

        $this->assertDatabaseHas('audit_logs', [
            'organization_id' => $this->organization->id,
            'action' => AuditAction::ExpenseCreated->value,
            'auditable_type' => Expense::class,
            'auditable_id' => $expense->id,
        ]);

        $auditLog = AuditLog::where('action', AuditAction::ExpenseCreated->value)->first();
        $this->assertNotNull($auditLog);
        $this->assertTrue($auditLog->isChecksumValid());
    }

    public function test_expense_lifecycle_transitions_record_audit_logs(): void
    {
        $expense = Expense::factory()->create([
            'organization_id' => $this->organization->id,
            'user_id' => $this->employee->id,
            'status' => ExpenseStatus::Draft,
            'amount' => 45.00,
        ]);

        // Submit expense as employee
        Sanctum::actingAs($this->employee, ["org:{$this->organization->id}"]);
        $this->postJson("/api/v1/expenses/{$expense->uuid}/submit")->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditAction::ExpenseSubmitted->value,
            'auditable_id' => $expense->id,
        ]);

        // Approve expense as admin
        Sanctum::actingAs($this->admin, ["org:{$this->organization->id}"]);
        $this->postJson("/api/v1/expenses/{$expense->uuid}/approve", ['comment' => 'Looks good'])
            ->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'action' => AuditAction::ExpenseApproved->value,
            'auditable_id' => $expense->id,
        ]);
    }

    public function test_audit_log_model_prevents_updates_and_deletes(): void
    {
        $auditLog = AuditLog::forceCreate([
            'uuid' => (string) Str::uuid(),
            'organization_id' => $this->organization->id,
            'actor_id' => $this->admin->id,
            'action' => AuditAction::ExpenseCreated->value,
            'auditable_type' => Expense::class,
            'auditable_id' => 1,
            'checksum' => 'fakechecksum',
            'created_at' => now(),
        ]);

        $this->expectException(\RuntimeException::class);
        $auditLog->update(['action' => AuditAction::ExpenseUpdated->value]);
    }

    public function test_audit_log_model_prevents_deletions(): void
    {
        $auditLog = AuditLog::forceCreate([
            'uuid' => (string) Str::uuid(),
            'organization_id' => $this->organization->id,
            'actor_id' => $this->admin->id,
            'action' => AuditAction::ExpenseCreated->value,
            'auditable_type' => Expense::class,
            'auditable_id' => 1,
            'checksum' => 'fakechecksum',
            'created_at' => now(),
        ]);

        $this->expectException(\RuntimeException::class);
        $auditLog->delete();
    }

    public function test_admin_can_view_audit_logs_via_api(): void
    {
        Sanctum::actingAs($this->admin, ["org:{$this->organization->id}"]);

        AuditLog::forceCreate([
            'uuid' => (string) Str::uuid(),
            'organization_id' => $this->organization->id,
            'actor_id' => $this->admin->id,
            'action' => AuditAction::ExpenseSubmitted->value,
            'auditable_type' => Expense::class,
            'auditable_id' => 10,
            'checksum' => 'testchecksum',
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/audit-logs');

        $response->assertOk()
            ->assertJsonStructure(['data' => [['uuid', 'action', 'auditable_type', 'checksum']]]);
    }

    public function test_employee_cannot_view_audit_logs(): void
    {
        Sanctum::actingAs($this->employee, ["org:{$this->organization->id}"]);

        $this->getJson('/api/v1/audit-logs')->assertForbidden();
    }

    public function test_multi_tenant_isolation_for_audit_logs(): void
    {
        $otherOrg = Organization::factory()->create();
        $otherAdmin = User::factory()->create();
        $otherOrg->users()->attach($otherAdmin->id, ['role' => UserRole::Admin->value, 'is_active' => true]);

        $otherAuditLog = AuditLog::forceCreate([
            'uuid' => (string) Str::uuid(),
            'organization_id' => $otherOrg->id,
            'actor_id' => $otherAdmin->id,
            'action' => AuditAction::ExpenseCreated->value,
            'auditable_type' => Expense::class,
            'auditable_id' => 99,
            'checksum' => 'otherchecksum',
            'created_at' => now(),
        ]);

        Sanctum::actingAs($this->admin, ["org:{$this->organization->id}"]);

        $response = $this->getJson("/api/v1/audit-logs/{$otherAuditLog->uuid}");
        $response->assertNotFound();
    }

    public function test_approved_expense_cannot_be_updated_by_anyone(): void
    {
        $expense = Expense::factory()->create([
            'organization_id' => $this->organization->id,
            'user_id' => $this->employee->id,
            'status' => ExpenseStatus::Approved,
            'amount' => 100.00,
        ]);

        Sanctum::actingAs($this->employee, ["org:{$this->organization->id}"]);
        $this->putJson("/api/v1/expenses/{$expense->uuid}", ['amount' => 200.00])
            ->assertForbidden();

        Sanctum::actingAs($this->admin, ["org:{$this->organization->id}"]);
        $this->putJson("/api/v1/expenses/{$expense->uuid}/admin-correct", ['description' => 'Updated'])
            ->assertForbidden();
    }

    public function test_audit_log_user_relationship_can_be_eager_loaded(): void
    {
        $auditLog = AuditLog::forceCreate([
            'uuid' => (string) Str::uuid(),
            'organization_id' => $this->organization->id,
            'actor_id' => $this->admin->id,
            'action' => AuditAction::ExpenseCreated->value,
            'auditable_type' => Expense::class,
            'auditable_id' => 1,
            'checksum' => 'checksum123',
            'created_at' => now(),
        ]);

        $fetched = AuditLog::where('id', $auditLog->id)->with('user')->first();

        $this->assertNotNull($fetched);
        $this->assertNotNull($fetched->user);
        $this->assertEquals($this->admin->id, $fetched->user->id);
    }
}
