<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;

final class OrganizationPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Organization $organization): bool
    {
        return $user->organizations()
            ->where('organizations.id', $organization->id)
            ->wherePivot('is_active', true)
            ->exists();
    }

    public function update(User $user, Organization $organization): bool
    {
        $role = $user->roleIn($organization);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }

    public function delete(User $user, Organization $organization): bool
    {
        return $user->roleIn($organization) === UserRole::Owner;
    }

    public function manageMembers(User $user, Organization $organization): bool
    {
        $role = $user->roleIn($organization);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }
}
