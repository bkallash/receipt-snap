<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ExpenseStatus;
use App\Models\Department;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class BudgetService
{
    /**
     * Calculate budget utilization for a department over its current budget period.
     *
     * @return array{
     *     budget_amount: float|null,
     *     budget_currency: string|null,
     *     budget_period: string|null,
     *     spent_amount: float,
     *     pending_amount: float,
     *     remaining_budget: float|null,
     *     utilization_percentage: float
     * }
     */
    public function calculateDepartmentBudgetStatus(Department $department, ?CarbonImmutable $asOfDate = null): array
    {
        [$startDate, $endDate] = $department->getCurrentPeriodRange($asOfDate);

        $memberUserIds = DB::table('organization_user')
            ->where('organization_id', $department->organization_id)
            ->where('department_id', $department->id)
            ->whereIn('is_active', [true, 1])
            ->pluck('user_id')
            ->toArray();

        if (empty($memberUserIds)) {
            return [
                'budget_amount' => $department->budget_amount ? (float) $department->budget_amount : null,
                'budget_currency' => $department->budget_currency,
                'budget_period' => $department->budget_period?->value,
                'spent_amount' => 0.0,
                'pending_amount' => 0.0,
                'remaining_budget' => $department->budget_amount ? (float) $department->budget_amount : null,
                'utilization_percentage' => 0.0,
            ];
        }

        $statusAmounts = Expense::where('organization_id', $department->organization_id)
            ->whereIn('user_id', $memberUserIds)
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->whereIn('status', [
                ExpenseStatus::Approved->value, ExpenseStatus::Reimbursed->value,
                ExpenseStatus::Submitted->value, ExpenseStatus::UnderReview->value, ExpenseStatus::PendingScan->value,
            ])
            ->groupBy('status')
            ->selectRaw('status, SUM(amount) as total_amount')
            ->pluck('total_amount', 'status');

        $spentAmount = (float) ($statusAmounts[ExpenseStatus::Approved->value] ?? 0.0)
            + (float) ($statusAmounts[ExpenseStatus::Reimbursed->value] ?? 0.0);

        $pendingAmount = (float) ($statusAmounts[ExpenseStatus::Submitted->value] ?? 0.0)
            + (float) ($statusAmounts[ExpenseStatus::UnderReview->value] ?? 0.0)
            + (float) ($statusAmounts[ExpenseStatus::PendingScan->value] ?? 0.0);

        $budgetAmount = $department->budget_amount ? (float) $department->budget_amount : null;
        $totalCommitted = $spentAmount + $pendingAmount;
        $remaining = $budgetAmount !== null ? max(0.0, $budgetAmount - $totalCommitted) : null;
        $utilization = ($budgetAmount !== null && $budgetAmount > 0)
            ? round(($totalCommitted / $budgetAmount) * 100, 2)
            : 0.0;

        return [
            'budget_amount' => $budgetAmount,
            'budget_currency' => $department->budget_currency,
            'budget_period' => $department->budget_period?->value,
            'spent_amount' => round($spentAmount, 2),
            'pending_amount' => round($pendingAmount, 2),
            'remaining_budget' => $remaining !== null ? round($remaining, 2) : null,
            'utilization_percentage' => $utilization,
        ];
    }

    /**
     * Calculate budget utilization for an expense category.
     *
     * @return array{
     *     budget_amount: float|null,
     *     budget_currency: string|null,
     *     budget_period: string|null,
     *     max_amount: float|null,
     *     spent_amount: float,
     *     pending_amount: float,
     *     remaining_budget: float|null,
     *     utilization_percentage: float
     * }
     */
    public function calculateCategoryBudgetStatus(ExpenseCategory $category, ?CarbonImmutable $asOfDate = null): array
    {
        [$startDate, $endDate] = $category->getCurrentPeriodRange($asOfDate);

        $statusAmounts = Expense::where('organization_id', $category->organization_id)
            ->where('expense_category_id', $category->id)
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->whereIn('status', [
                ExpenseStatus::Approved->value, ExpenseStatus::Reimbursed->value,
                ExpenseStatus::Submitted->value, ExpenseStatus::UnderReview->value, ExpenseStatus::PendingScan->value,
            ])
            ->groupBy('status')
            ->selectRaw('status, SUM(amount) as total_amount')
            ->pluck('total_amount', 'status');

        $spentAmount = (float) ($statusAmounts[ExpenseStatus::Approved->value] ?? 0.0)
            + (float) ($statusAmounts[ExpenseStatus::Reimbursed->value] ?? 0.0);

        $pendingAmount = (float) ($statusAmounts[ExpenseStatus::Submitted->value] ?? 0.0)
            + (float) ($statusAmounts[ExpenseStatus::UnderReview->value] ?? 0.0)
            + (float) ($statusAmounts[ExpenseStatus::PendingScan->value] ?? 0.0);

        $budgetAmount = $category->budget_amount ? (float) $category->budget_amount : null;
        $totalCommitted = $spentAmount + $pendingAmount;
        $remaining = $budgetAmount !== null ? max(0.0, $budgetAmount - $totalCommitted) : null;
        $utilization = ($budgetAmount !== null && $budgetAmount > 0)
            ? round(($totalCommitted / $budgetAmount) * 100, 2)
            : 0.0;

        return [
            'budget_amount' => $budgetAmount,
            'budget_currency' => $category->budget_currency,
            'budget_period' => $category->budget_period?->value,
            'max_amount' => $category->max_amount ? (float) $category->max_amount : null,
            'spent_amount' => round($spentAmount, 2),
            'pending_amount' => round($pendingAmount, 2),
            'remaining_budget' => $remaining !== null ? round($remaining, 2) : null,
            'utilization_percentage' => $utilization,
        ];
    }

    /**
     * Check if a new expense amount causes a department budget overrun.
     *
     * @return array{code: string, severity: string, message: string}|null
     */
    public function checkDepartmentOverrun(Department $department, float $amount, ?CarbonImmutable $expenseDate = null): ?array
    {
        if ($department->budget_amount === null || (float) $department->budget_amount <= 0) {
            return null;
        }

        $status = $this->calculateDepartmentBudgetStatus($department, $expenseDate);
        $totalAfter = $status['spent_amount'] + $status['pending_amount'] + $amount;
        $budgetLimit = (float) $department->budget_amount;

        if ($totalAfter > $budgetLimit) {
            $currency = $department->budget_currency ?? 'USD';

            return [
                'code' => 'DEPARTMENT_BUDGET_EXCEEDED',
                'severity' => 'warning',
                'message' => sprintf(
                    'Expense amount %.2f exceeds remaining department budget of %s %.2f.',
                    $amount,
                    $currency,
                    max(0, $budgetLimit - ($status['spent_amount'] + $status['pending_amount']))
                ),
            ];
        }

        return null;
    }

    /**
     * Check if expense breaches single-transaction limit or period budget limit for category.
     *
     * @return array<int, array{code: string, severity: string, message: string}>
     */
    public function checkCategoryOverrun(ExpenseCategory $category, float $amount, ?CarbonImmutable $expenseDate = null): array
    {
        $flags = [];

        // Check single transaction limit
        if ($category->max_amount !== null && $amount > (float) $category->max_amount) {
            $flags[] = [
                'code' => 'CATEGORY_LIMIT_EXCEEDED',
                'severity' => 'warning',
                'message' => sprintf(
                    "Expense amount %.2f exceeds single-transaction limit of %.2f for category '%s'.",
                    $amount,
                    (float) $category->max_amount,
                    $category->name
                ),
            ];
        }

        // Check period budget limit
        if ($category->budget_amount !== null && (float) $category->budget_amount > 0) {
            $status = $this->calculateCategoryBudgetStatus($category, $expenseDate);
            $totalAfter = $status['spent_amount'] + $status['pending_amount'] + $amount;
            $budgetLimit = (float) $category->budget_amount;

            if ($totalAfter > $budgetLimit) {
                $flags[] = [
                    'code' => 'CATEGORY_BUDGET_EXCEEDED',
                    'severity' => 'warning',
                    'message' => sprintf(
                        "Expense breaches period budget limit of %.2f for category '%s'.",
                        $budgetLimit,
                        $category->name
                    ),
                ];
            }
        }

        return $flags;
    }
}
