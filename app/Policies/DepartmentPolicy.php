<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Department;
use App\Models\Organization;
use App\Models\User;

final class DepartmentPolicy
{
    public function viewAny(User $user, Organization $organization): bool
    {
        return $user->roleIn($organization) !== null;
    }

    public function view(User $user, Department $department): bool
    {
        return $user->roleIn($department->organization) !== null;
    }

    public function create(User $user, Organization $organization): bool
    {
        $role = $user->roleIn($organization);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }

    public function update(User $user, Department $department): bool
    {
        $role = $user->roleIn($department->organization);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }

    public function delete(User $user, Department $department): bool
    {
        $role = $user->roleIn($department->organization);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }
}
