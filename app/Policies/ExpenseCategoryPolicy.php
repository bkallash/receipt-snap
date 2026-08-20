<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\User;

final class ExpenseCategoryPolicy
{
    public function viewAny(User $user, Organization $organization): bool
    {
        return $user->roleIn($organization) !== null;
    }

    public function view(User $user, ExpenseCategory $category): bool
    {
        $org = $category->organization;

        return $org instanceof Organization && $user->roleIn($org) !== null;
    }

    public function create(User $user, Organization $organization): bool
    {
        $role = $user->roleIn($organization);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }

    public function update(User $user, ExpenseCategory $category): bool
    {
        $org = $category->organization;
        if (! $org instanceof Organization) {
            return false;
        }
        $role = $user->roleIn($org);

        return $role === UserRole::Owner || $role === UserRole::Admin;
    }

    public function delete(User $user, ExpenseCategory $category): bool
    {
        $org = $category->organization;
        if (! $org instanceof Organization) {
            return false;
        }
        $role = $user->roleIn($org);

        if (! in_array($role, [UserRole::Owner, UserRole::Admin], true)) {
            return false;
        }

        return ! $category->expenses()->exists();
    }
}
