<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\InvitationStatus;
use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\User;

final class OrganizationInvitationPolicy
{
    public function viewAny(User $user, Organization $organization): bool
    {
        $role = $user->roleIn($organization);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }

    public function create(User $user, Organization $organization): bool
    {
        $role = $user->roleIn($organization);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }

    public function revoke(User $user, OrganizationInvitation $invitation): bool
    {
        $org = $invitation->organization;
        $role = $org instanceof Organization ? $user->roleIn($org) : null;

        if ($role === UserRole::Owner || $role === UserRole::Admin) {
            return true;
        }

        return strtolower($user->email) === strtolower($invitation->email);
    }

    public function accept(User $user, OrganizationInvitation $invitation): bool
    {
        return strtolower($user->email) === strtolower($invitation->email)
            && $invitation->status === InvitationStatus::Pending
            && $invitation->expires_at->isFuture();
    }

    public function reject(User $user, OrganizationInvitation $invitation): bool
    {
        return strtolower($user->email) === strtolower($invitation->email)
            && $invitation->status === InvitationStatus::Pending
            && $invitation->expires_at->isFuture();
    }
}
