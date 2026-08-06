<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\ReimbursementBatch;
use App\Models\User;

final class ReimbursementBatchPolicy
{
    public function viewAny(User $user, Organization $organization): bool
    {
        $role = $user->roleIn($organization);

        return in_array($role, [UserRole::Accountant, UserRole::Admin, UserRole::Owner], true);
    }

    public function view(User $user, ReimbursementBatch $batch): bool
    {
        $org = $batch->organization;
        $role = $org instanceof Organization ? $user->roleIn($org) : null;

        return in_array($role, [UserRole::Accountant, UserRole::Admin, UserRole::Owner], true);
    }

    public function create(User $user, Organization $organization): bool
    {
        $role = $user->roleIn($organization);

        return in_array($role, [UserRole::Accountant, UserRole::Admin, UserRole::Owner], true);
    }

    public function executePayout(User $user, ReimbursementBatch $batch): bool
    {
        $org = $batch->organization;
        $role = $org instanceof Organization ? $user->roleIn($org) : null;

        return in_array($role, [UserRole::Accountant, UserRole::Admin, UserRole::Owner], true);
    }
}
