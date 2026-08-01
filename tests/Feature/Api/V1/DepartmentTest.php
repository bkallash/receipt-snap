<?php

use App\Models\Department;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows admin to create department', function (): void {
    $admin = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    $token = $admin->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/departments', [
            'name' => 'Engineering',
            'budget_amount' => 10000.00,
            'budget_currency' => 'USD',
            'budget_period' => 'monthly',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.name', 'Engineering');
});

it('requires budget_period when budget_amount is specified', function (): void {
    $admin = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    $token = $admin->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/departments', [
            'name' => 'Engineering',
            'budget_amount' => 10000.00,
        ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['budget_period']);
});

it('allows creating department with same name as a soft-deleted one', function (): void {
    $admin = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $dept = Department::factory()->create(['organization_id' => $org->id, 'name' => 'Sales']);
    $dept->delete();

    $token = $admin->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson('/api/v1/departments', [
            'name' => 'Sales',
        ]);

    $response->assertCreated();
});
