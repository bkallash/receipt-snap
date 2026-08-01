<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows admin to update member role', function (): void {
    $admin = User::factory()->create();
    $employee = User::factory()->create();
    $org = Organization::factory()->create();

    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employee->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    $token = $admin->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/v1/organizations/{$org->id}/members/{$employee->id}", [
            'role' => 'manager',
        ]);

    $response->assertOk();

    $this->assertEquals(UserRole::Manager, $employee->fresh()->roleIn($org));
});

it('revokes org tokens when member is removed', function (): void {
    $owner = User::factory()->create();
    $employee = User::factory()->create();
    $org = Organization::factory()->create();

    $org->users()->attach($owner->id, ['role' => 'owner', 'is_active' => true, 'joined_at' => now()]);
    $org->users()->attach($employee->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    $empToken = $employee->createToken('test', ["org:{$org->id}"])->plainTextToken;
    $this->assertCount(1, $employee->tokens);

    $ownerToken = $owner->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$ownerToken}")
        ->deleteJson("/api/v1/organizations/{$org->id}/members/{$employee->id}");

    $response->assertOk();

    $this->assertCount(0, $employee->tokens()->get());
});
