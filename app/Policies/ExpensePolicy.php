<?php

declare(strict_types=1);

namespace App\Policies;

use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;

final class ExpensePolicy
{
    public function viewAny(User $user, Organization $organization): bool
    {
        return $user->roleIn($organization) !== null;
    }

    public function view(User $user, Expense $expense): bool
    {
        if ($user->id === $expense->user_id) {
            return true;
        }

        $role = $user->roleIn($expense->organization);

        return in_array($role, [UserRole::Manager, UserRole::Admin, UserRole::Owner, UserRole::Accountant], true);
    }

    public function create(User $user, Organization $organization): bool
    {
        return $user->roleIn($organization) !== null;
    }

    public function update(User $user, Expense $expense): bool
    {
        if ($user->id !== $expense->user_id) {
            return false;
        }

        return in_array($expense->status, [ExpenseStatus::Draft, ExpenseStatus::Rejected], true);
    }

    public function delete(User $user, Expense $expense): bool
    {
        return $user->id === $expense->user_id && $expense->status === ExpenseStatus::Draft;
    }

    public function submit(User $user, Expense $expense): bool
    {
        if ($user->id !== $expense->user_id) {
            return false;
        }

        return in_array($expense->status, [ExpenseStatus::Draft, ExpenseStatus::Rejected], true);
    }

    public function approve(User $user, Expense $expense): bool
    {
        if ($user->id === $expense->user_id) {
            return false; // Cannot approve own expense
        }

        $role = $user->roleIn($expense->organization);

        return in_array($role, [UserRole::Manager, UserRole::Admin, UserRole::Owner], true)
            && in_array($expense->status, [ExpenseStatus::Submitted, ExpenseStatus::UnderReview], true);
    }

    public function reject(User $user, Expense $expense): bool
    {
        if ($user->id === $expense->user_id) {
            return false;
        }

        $role = $user->roleIn($expense->organization);

        return in_array($role, [UserRole::Manager, UserRole::Admin, UserRole::Owner], true)
            && in_array($expense->status, [ExpenseStatus::Submitted, ExpenseStatus::UnderReview], true);
    }

    public function adminCorrect(User $user, Expense $expense): bool
    {
        $role = $user->roleIn($expense->organization);

        return in_array($role, [UserRole::Admin, UserRole::Owner, UserRole::Accountant], true)
            && $expense->status === ExpenseStatus::Approved;
    }
}
