<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\InvitationStatus;
use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;
use Illuminate\Support\Str;

final class OrganizationInvitationService
{
    public function createInvitation(
        Organization $organization,
        User $invitedBy,
        string $email,
        UserRole $role,
        ?int $departmentId = null,
        ?int $expiresInDays = null,
    ): OrganizationInvitation {
        // Revoke any existing pending invitations for this email in this org
        OrganizationInvitation::query()
            ->where('organization_id', $organization->id)
            ->where('email', strtolower($email))
            ->where('status', InvitationStatus::Pending->value)
            ->update(['status' => InvitationStatus::Revoked->value]);

        return OrganizationInvitation::create([
            'organization_id' => $organization->id,
            'invited_by_user_id' => $invitedBy->id,
            'email' => strtolower($email),
            'role' => $role,
            'department_id' => $departmentId,
            'token' => Str::random(40),
            'status' => InvitationStatus::Pending,
            'expires_at' => now()->addDays($expiresInDays ?? 14),
        ]);
    }

    public function acceptInvitation(OrganizationInvitation $invitation, User $user): void
    {
        if ($invitation->status !== InvitationStatus::Pending || $invitation->expires_at->isPast()) {
            throw new \RuntimeException('Invitation is no longer valid or expired.');
        }

        if (strtolower($user->email) !== strtolower($invitation->email)) {
            throw new \RuntimeException('Logged in user email does not match invitation recipient.');
        }

        $org = $invitation->organization;
        if ($org instanceof \App\Models\Organization) {
            $org->users()->syncWithoutDetaching([
                $user->id => [
                    'role' => $invitation->role->value,
                    'department_id' => $invitation->department_id,
                    'is_active' => true,
                    'joined_at' => now(),
                ],
            ]);
        }

        $invitation->update([
            'status' => InvitationStatus::Accepted,
            'accepted_at' => now(),
        ]);
    }

    public function revokeInvitation(OrganizationInvitation $invitation): void
    {
        $invitation->update(['status' => InvitationStatus::Revoked]);
    }

    public function rejectInvitation(OrganizationInvitation $invitation, User $user): void
    {
        if ($invitation->status !== InvitationStatus::Pending || $invitation->expires_at->isPast()) {
            throw new \RuntimeException('Invitation is no longer valid or expired.');
        }

        if (strtolower($user->email) !== strtolower($invitation->email)) {
            throw new \RuntimeException('Logged in user email does not match invitation recipient.');
        }

        $invitation->update(['status' => InvitationStatus::Rejected]);
    }
}
