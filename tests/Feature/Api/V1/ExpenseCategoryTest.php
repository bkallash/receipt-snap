<?php

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows admin to create expense category', function (): void {
    $admin = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    $token = $admin->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/categories', [
            'name' => 'Travel',
            'icon' => 'plane',
            'color' => '#3B82F6',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Travel');
});

it('prevents deleting category with existing expenses', function (): void {
    $admin = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $category = ExpenseCategory::factory()->create(['organization_id' => $org->id]);
    Expense::factory()->create(['organization_id' => $org->id, 'expense_category_id' => $category->id]);

    $token = $admin->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->deleteJson("/api/v1/categories/{$category->id}");

    $response->assertForbidden();
});
