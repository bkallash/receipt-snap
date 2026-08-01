<?php

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows an authenticated user to list their organizations', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create(['name' => 'Acme Corp']);
    $org->users()->attach($user->id, ['role' => 'owner', 'is_active' => true, 'joined_at' => now()]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/organizations');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Acme Corp');
});

it('allows an owner to update their organization', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create(['name' => 'Old Name']);
    $org->users()->attach($user->id, ['role' => 'owner', 'is_active' => true, 'joined_at' => now()]);

    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->putJson("/api/v1/organizations/{$org->id}", [
            'name' => 'New Name',
        ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'New Name');
});

it('allows creating an organization with the same generated slug as a soft-deleted org', function (): void {
    $user = User::factory()->create();

    $softDeletedOrg = Organization::factory()->create(['name' => 'Test Slug', 'slug' => 'test-slug']);
    $softDeletedOrg->delete();

    $response = $this->actingAs($user)->postJson('/api/v1/organizations', [
        'name' => 'Test Slug',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.slug', 'test-slug');
});

it('generates a unique slug when creating an organization with duplicate name', function (): void {
    $user = User::factory()->create();

    Organization::factory()->create(['name' => 'Test Slug', 'slug' => 'test-slug']);

    $response = $this->actingAs($user)->postJson('/api/v1/organizations', [
        'name' => 'Test Slug',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.slug', 'test-slug-1');
});
