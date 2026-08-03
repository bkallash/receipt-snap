<?php

declare(strict_types=1);

use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('renders the employee portal dashboard with correct inertia props', function (): void {
    $organization = Organization::factory()->create();
    $user = User::factory()->create();
    $organization->users()->attach($user->id, ['role' => UserRole::Employee->value]);

    $category = ExpenseCategory::factory()->create(['organization_id' => $organization->id]);

    $expense = Expense::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => $user->id,
        'expense_category_id' => $category->id,
        'status' => ExpenseStatus::Draft,
        'merchant_name' => 'Target',
        'amount' => 45.50,
        'expense_date' => now()->toDateString(),
    ]);

    $response = $this->actingAs($user)
        ->withSession(['organization_id' => $organization->id])
        ->get('/portal/expenses');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('expenses')
            ->has('categories')
            ->has('stats')
            ->where('stats.total_count', 1)
            ->where('stats.drafts_count', 1)
        );
});

it('allows employee to update draft receipt line items and submit to manager', function (): void {
    $organization = Organization::factory()->create();
    $user = User::factory()->create();
    $organization->users()->attach($user->id, ['role' => UserRole::Employee->value]);
    $token = $user->createToken('test', ["org:{$organization->id}"])->plainTextToken;

    $category = ExpenseCategory::factory()->create(['organization_id' => $organization->id]);

    $expense = Expense::factory()->create([
        'organization_id' => $organization->id,
        'user_id' => $user->id,
        'expense_category_id' => $category->id,
        'status' => ExpenseStatus::Draft,
        'merchant_name' => 'Starbucks',
        'amount' => 12.00,
        'expense_date' => now()->toDateString(),
    ]);

    // Update draft details and line items
    $updateResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->withHeader('X-Organization-Id', (string) $organization->id)
        ->putJson("/api/v1/expenses/{$expense->uuid}", [
            'merchant_name' => 'Starbucks Reserve',
            'expense_category_id' => $category->id,
            'amount' => 18.50,
            'tax_amount' => 1.50,
            'tip_amount' => 2.00,
            'currency_code' => 'USD',
            'expense_date' => now()->toDateString(),
            'line_items' => [
                [
                    'description' => 'Cold Brew Coffee',
                    'quantity' => 2,
                    'unit_price' => 5.50,
                    'total_price' => 11.00,
                ],
                [
                    'description' => 'Croissant',
                    'quantity' => 1,
                    'unit_price' => 4.00,
                    'total_price' => 4.00,
                ],
            ],
        ]);

    $updateResponse->assertOk()
        ->assertJsonPath('data.merchant_name', 'Starbucks Reserve')
        ->assertJsonCount(2, 'data.line_items');

    $this->assertDatabaseHas('line_items', [
        'expense_id' => $expense->id,
        'description' => 'Cold Brew Coffee',
        'quantity' => 2,
    ]);

    // Submit expense to manager
    $submitResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->withHeader('X-Organization-Id', (string) $organization->id)
        ->postJson("/api/v1/expenses/{$expense->uuid}/submit");

    $submitResponse->assertOk();

    $this->assertDatabaseHas('expenses', [
        'id' => $expense->id,
        'merchant_name' => 'Starbucks Reserve',
    ]);
});

it('allows web session authenticated user to upload a receipt via API without Sanctum bearer token', function (): void {
    Queue::fake();

    $organization = Organization::factory()->create();
    $user = User::factory()->create();
    $organization->users()->attach($user->id, ['role' => UserRole::Employee->value]);

    Storage::fake('local');
    $file = UploadedFile::fake()->image('receipt.jpg', 600, 800);

    $response = $this->actingAs($user)
        ->withSession(['current_organization_id' => $organization->id])
        ->postJson('/api/v1/expenses', [
            'merchant_name' => 'Target Store',
            'amount' => 34.99,
            'currency_code' => 'USD',
            'expense_date' => now()->toDateString(),
            'receipt_images' => [$file],
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.merchant_name', 'Target Store');

    $this->assertDatabaseHas('expenses', [
        'organization_id' => $organization->id,
        'user_id' => $user->id,
        'merchant_name' => 'Target Store',
    ]);
});

it('redirects manager/admin/owner away from employee portal expenses page', function (UserRole $role): void {
    $organization = Organization::factory()->create();
    $user = User::factory()->create();
    $organization->users()->attach($user->id, ['role' => $role->value]);

    $response = $this->actingAs($user)
        ->withSession(['current_organization_id' => $organization->id])
        ->get('/portal/expenses');

    $response->assertRedirect(route('portal.manager.expenses'));
})->with([
    'manager' => UserRole::Manager,
    'owner' => UserRole::Owner,
    'admin' => UserRole::Admin,
]);
