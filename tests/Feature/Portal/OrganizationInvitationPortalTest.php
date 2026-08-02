<?php

declare(strict_types=1);

use App\Enums\InvitationStatus;
use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('redirects an employee with no organization to portal.invitations when visiting portal.expenses', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/portal/expenses');

    $response->assertRedirect(route('portal.invitations'));
});

it('renders zero invitations state for an employee with no org and no invitations', function (): void {
    $user = User::factory()->create(['email' => 'noinvites@example.com']);

    $response = $this->actingAs($user)->get('/portal/invitations');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Invitations')
            ->has('invitations', 0)
            ->where('has_organization', false)
            ->where('user.email', 'noinvites@example.com')
        );
});

it('renders pending invitations for an invited employee', function (): void {
    $user = User::factory()->create(['email' => 'invited@example.com']);
    $org = Organization::factory()->create(['name' => 'Acme Corp']);
    $inviter = User::factory()->create();

    OrganizationInvitation::factory()->create([
        'organization_id' => $org->id,
        'invited_by_user_id' => $inviter->id,
        'email' => 'invited@example.com',
        'role' => UserRole::Employee,
        'status' => InvitationStatus::Pending,
    ]);

    $response = $this->actingAs($user)->get('/portal/invitations');

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Portal/Invitations')
            ->has('invitations', 1)
            ->where('invitations.0.organization.name', 'Acme Corp')
            ->where('invitations.0.role', 'employee')
        );
});

it('allows an employee to accept an organization invitation', function (): void {
    $user = User::factory()->create(['email' => 'accepting@example.com']);
    $org = Organization::factory()->create(['name' => 'Beta Industries']);

    $invitation = OrganizationInvitation::factory()->create([
        'organization_id' => $org->id,
        'email' => 'accepting@example.com',
        'role' => UserRole::Employee,
        'status' => InvitationStatus::Pending,
    ]);

    $response = $this->actingAs($user)->post("/portal/invitations/{$invitation->id}/accept");

    $response->assertRedirect(route('portal.expenses'));

    $this->assertTrue($user->organizations()->where('organizations.id', $org->id)->exists());
    $this->assertDatabaseHas('organization_invitations', [
        'id' => $invitation->id,
        'status' => InvitationStatus::Accepted->value,
    ]);
});

it('allows an employee to reject an organization invitation', function (): void {
    $user = User::factory()->create(['email' => 'rejecting@example.com']);
    $org = Organization::factory()->create(['name' => 'Gamma Corp']);

    $invitation = OrganizationInvitation::factory()->create([
        'organization_id' => $org->id,
        'email' => 'rejecting@example.com',
        'role' => UserRole::Employee,
        'status' => InvitationStatus::Pending,
    ]);

    $response = $this->actingAs($user)->post("/portal/invitations/{$invitation->id}/reject");

    $response->assertRedirect(route('portal.invitations'));

    $this->assertFalse($user->organizations()->where('organizations.id', $org->id)->exists());
    $this->assertDatabaseHas('organization_invitations', [
        'id' => $invitation->id,
        'status' => InvitationStatus::Rejected->value,
    ]);
});
