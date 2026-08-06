<?php

declare(strict_types=1);

namespace App\Observers;

use App\Enums\ExpenseStatus;
use App\Models\Expense;
use App\Services\AggregateService;

final class ExpenseObserver
{
    public function __construct(
        private readonly AggregateService $aggregateService
    ) {}

    public function saved(Expense $expense): void
    {
        $isApprovedState = in_array($expense->status, [ExpenseStatus::Approved, ExpenseStatus::Reimbursed], true);
        $wasApprovedState = in_array($expense->getOriginal('status'), [ExpenseStatus::Approved, ExpenseStatus::Reimbursed], true);

        if ($isApprovedState || $wasApprovedState) {
            $this->aggregateService->handleExpenseChange($expense);
        }
    }

    public function deleted(Expense $expense): void
    {
        if (in_array($expense->status, [ExpenseStatus::Approved, ExpenseStatus::Reimbursed], true)) {
            $this->aggregateService->handleExpenseChange($expense);
        }
    }

    public function restored(Expense $expense): void
    {
        if (in_array($expense->status, [ExpenseStatus::Approved, ExpenseStatus::Reimbursed], true)) {
            $this->aggregateService->handleExpenseChange($expense);
        }
    }
}
