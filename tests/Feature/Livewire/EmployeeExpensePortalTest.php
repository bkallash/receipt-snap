<?php

declare(strict_types=1);

namespace Tests\Feature\Livewire;

use App\Enums\ExpenseStatus;
use App\Livewire\Portal\EmployeeExpensePortal;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class EmployeeExpensePortalTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private Organization $organization;

    private ExpenseCategory $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->organization = Organization::factory()->create([
            'name' => 'Test Org',
        ]);

        $this->user = User::factory()->create();
        $this->organization->users()->attach($this->user->id, [
            'role' => 'employee',
            'is_active' => true,
            'joined_at' => now(),
        ]);

        TenantContext::set($this->organization->id);

        $this->category = ExpenseCategory::create([
            'organization_id' => $this->organization->id,
            'name' => 'Software & Services',
            'code' => 'SOFT',
        ]);
    }

    public function test_portal_renders_successfully_for_authenticated_user(): void
    {
        Livewire::actingAs($this->user)
            ->test(EmployeeExpensePortal::class)
            ->assertStatus(200)
            ->assertSet('showFormModal', false)
            ->assertSet('currentStep', 1);
    }

    public function test_opening_create_modal_starts_in_step_1(): void
    {
        Livewire::actingAs($this->user)
            ->test(EmployeeExpensePortal::class)
            ->call('openCreateModal')
            ->assertSet('showFormModal', true)
            ->assertSet('currentStep', 1)
            ->assertSee('Scan or Upload Receipt');
    }

    public function test_uploading_receipt_triggers_auto_scan_and_advances_to_step_2(): void
    {
        Storage::fake('local');
        $fakeReceipt = UploadedFile::fake()->image('aws_cloud_invoice.jpg');

        Livewire::actingAs($this->user)
            ->test(EmployeeExpensePortal::class)
            ->call('openCreateModal')
            ->set('receiptFile', $fakeReceipt)
            ->assertSet('currentStep', 2)
            ->assertSet('merchant_name', 'Amazon Web Services')
            ->assertSet('amount', '45.00')
            ->assertSee('Verify Extracted Expense Details');
    }

    public function test_submitting_directly_from_verification_step_creates_and_submits_expense(): void
    {
        Storage::fake('local');
        $fakeReceipt = UploadedFile::fake()->image('starbucks_receipt.png');

        Livewire::actingAs($this->user)
            ->test(EmployeeExpensePortal::class)
            ->call('openCreateModal')
            ->set('receiptFile', $fakeReceipt)
            ->set('merchant_name', 'Starbucks Coffee')
            ->set('amount', '12.50')
            ->set('expense_category_id', (string) $this->category->id)
            ->call('submitDirectly')
            ->assertSet('showFormModal', false);

        $createdExpense = Expense::where('user_id', $this->user->id)
            ->where('merchant_name', 'Starbucks Coffee')
            ->first();

        $this->assertNotNull($createdExpense);
        $this->assertEquals(12.50, (float) $createdExpense->amount);
        $this->assertNotEquals(ExpenseStatus::Draft, $createdExpense->status);
    }

    public function test_editing_existing_draft_opens_directly_in_step_2(): void
    {
        $draftExpense = Expense::create([
            'uuid' => 'test-uuid-123',
            'organization_id' => $this->organization->id,
            'user_id' => $this->user->id,
            'expense_category_id' => $this->category->id,
            'merchant_name' => 'Uber Technologies',
            'amount' => '32.00',
            'expense_date' => now()->format('Y-m-d'),
            'payment_method' => 'corporate_card',
            'status' => ExpenseStatus::Draft,
            'currency_code' => 'USD',
        ]);

        Livewire::actingAs($this->user)
            ->test(EmployeeExpensePortal::class)
            ->call('openEditModal', $draftExpense->id)
            ->assertSet('showFormModal', true)
            ->assertSet('currentStep', 2)
            ->assertSet('merchant_name', 'Uber Technologies')
            ->assertSet('amount', '32.00');
    }

    public function test_rescan_button_resets_form_to_step_1(): void
    {
        Storage::fake('local');
        $fakeReceipt = UploadedFile::fake()->image('delta_flight.jpg');

        Livewire::actingAs($this->user)
            ->test(EmployeeExpensePortal::class)
            ->call('openCreateModal')
            ->set('receiptFile', $fakeReceipt)
            ->assertSet('currentStep', 2)
            ->call('retakeOrRescan')
            ->assertSet('currentStep', 1);
    }
}
