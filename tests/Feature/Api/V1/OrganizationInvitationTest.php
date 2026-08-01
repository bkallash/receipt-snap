<?php

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('allows an admin to create an organization invitation', function (): void {
    $admin = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($admin->id, ['role' => 'admin', 'is_active' => true, 'joined_at' => now()]);

    $token = $admin->createToken('test', ["org:{$org->id}"])->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/organizations/{$org->id}/invitations", [
            'email' => 'invitee@example.com',
            'role' => 'employee',
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'invitee@example.com');

    $this->assertDatabaseHas('organization_invitations', [
        'organization_id' => $org->id,
        'email' => 'invitee@example.com',
        'role' => 'employee',
    ]);
});

it('allows an invited user to accept an invitation', function (): void {
    $invitedUser = User::factory()->create(['email' => 'invited@example.com']);
    $org = Organization::factory()->create();
    $invitation = OrganizationInvitation::factory()->create([
        'organization_id' => $org->id,
        'email' => 'invited@example.com',
        'role' => UserRole::Employee,
    ]);

    $token = $invitedUser->createToken('test')->plainTextToken;

    $response = $this->withHeader('Authorization', "Bearer {$token}")
        ->postJson("/api/v1/invitations/{$invitation->token}/accept");

    $response->assertOk();

    $this->assertTrue($invitedUser->organizations()->where('organizations.id', $org->id)->exists());
});
