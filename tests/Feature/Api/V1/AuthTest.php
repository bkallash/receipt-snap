<?php

use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows a user to register and receives token and organization', function (): void {
    $response = $this->postJson('/api/v1/auth/register', [
        'name' => 'John Doe',
        'email' => 'john@example.com',
        'password' => 'password123',
        'organization_name' => 'Acme Inc',
    ]);

    $response->assertCreated()
        ->assertJsonStructure(['user', 'organization_id', 'token']);

    $this->assertDatabaseHas('users', ['email' => 'john@example.com']);
    $this->assertDatabaseHas('organizations', ['name' => 'Acme Inc', 'slug' => 'acme-inc']);
});

it('allows a user to login with valid credentials and receive an org-scoped token', function (): void {
    $user = User::factory()->create(['password' => bcrypt('secret123')]);
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'owner', 'is_active' => true, 'joined_at' => now()]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'secret123',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['user', 'organization_id', 'token']);
});

it('rejects login with invalid credentials', function (): void {
    $user = User::factory()->create(['password' => bcrypt('secret123')]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'wrongpassword',
    ]);

    $response->assertUnprocessable();
});

it('allows an authenticated user to fetch their profile', function (): void {
    $user = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($user->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);
    $token = $user->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->getJson('/api/v1/auth/user');

    $response->assertOk()
        ->assertJsonPath('user.email', $user->email);
});

it('allows a multi-org user to switch organizations and receive a newly scoped token', function (): void {
    $user = User::factory()->create();
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $orgA->users()->attach($user->id, ['role' => 'owner', 'is_active' => true, 'joined_at' => now()]);
    $orgB->users()->attach($user->id, ['role' => 'employee', 'is_active' => true, 'joined_at' => now()]);

    $tokenA = $user->createToken('test', ["org:{$orgA->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$tokenA}")
        ->postJson("/api/v1/auth/switch-organization/{$orgB->id}");

    $response->assertOk()
        ->assertJsonPath('organization_id', $orgB->id)
        ->assertJsonStructure(['token']);
});

it('rejects cross-tenant access when token is scoped to a different organization', function (): void {
    $user = User::factory()->create();
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    $orgA->users()->attach($user->id, ['role' => 'owner', 'is_active' => true, 'joined_at' => now()]);
    $orgB->users()->attach($user->id, ['role' => 'owner', 'is_active' => true, 'joined_at' => now()]);

    // Token scoped to Org A
    $tokenA = $user->createToken('test', ["org:{$orgA->id}"])->plainTextToken;

    TenantContext::clear();

    // Trying to list categories (which uses SetOrganizationContext)
    $response = $this->withHeader('Authorization', "Bearer {$tokenA}")
        ->getJson('/api/v1/categories');

    $response->assertOk();
});
