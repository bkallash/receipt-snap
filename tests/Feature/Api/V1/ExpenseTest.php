<?php

use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(RefreshDatabase::class);

it('allows employee to create draft expense with line items', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/expenses', [
            'merchant_name' => 'Starbucks',
            'amount' => 15.50,
            'currency_code' => 'USD',
            'expense_date' => now()->toDateString(),
            'line_items' => [
                ['description' => 'Latte', 'quantity' => 2, 'unit_price' => 5.00],
                ['description' => 'Muffin', 'quantity' => 1, 'unit_price' => 5.50],
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.merchant_name', 'Starbucks')
        ->assertJsonPath('data.amount', '15.50');

    $this->assertDatabaseHas('expenses', ['merchant_name' => 'Starbucks']);
    $this->assertDatabaseHas('line_items', ['description' => 'Latte']);
});

it('allows employee to submit draft expense', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $expense = Expense::factory()->draft()->create([
        'user_id' => $user->id,
        'organization_id' => $org->id,
        'amount' => 20.00,
        'expense_date' => now()->startOfWeek()->toDateString(),
    ]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/expenses/{$expense->uuid}/submit");

    $response->assertOk()
        ->assertJsonPath('data.status', 'submitted');
});

it('allows manager to approve employee expense', function (): void {
    $manager = User::factory()->create();
    $employee = User::factory()->create();
    $org = Organization::factory()->create();

    $org->users()->attach($manager->id, ['role' => 'manager', 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employee->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $expense = Expense::factory()->submitted()->create(['user_id' => $employee->id, 'organization_id' => $org->id]);

    $token = $manager->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/expenses/{$expense->uuid}/approve", ['comment' => 'Approved']);

    $response->assertOk()
        ->assertJsonPath('data.status', 'approved');
});

it('prevents manager from approving their own expense', function (): void {
    $manager = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($manager->id, ['role' => 'manager', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $expense = Expense::factory()->submitted()->create(['user_id' => $manager->id, 'organization_id' => $org->id]);

    $token = $manager->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/expenses/{$expense->uuid}/approve");

    $response->assertForbidden();
});

it('prevents admin/accountant from updating approved expense because approved expenses are immutable', function (): void {
    $admin = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $expense = Expense::factory()->approved()->create(['organization_id' => $org->id]);

    $token = $admin->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/v1/expenses/{$expense->uuid}/admin-correct", [
            'description' => 'Corrected notes by admin',
        ]);

    $response->assertForbidden();
});

it('rejects file upload with spoofed extension', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    $fakeFile = UploadedFile::fake()->createWithContent('malicious.jpg', 'PLAIN TEXT fake content not jpeg magic bytes');

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/expenses', [
            'merchant_name' => 'Spoofed File Shop',
            'amount' => 50.00,
            'currency_code' => 'USD',
            'expense_date' => now()->toDateString(),
            'receipt_images' => [$fakeFile],
        ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['receipt_images.0']);
});
