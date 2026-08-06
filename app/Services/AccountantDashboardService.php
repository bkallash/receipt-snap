<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ExpenseStatus;
use App\Models\Expense;
use App\Models\Organization;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

final class AccountantDashboardService
{
    /**
     * Get real-time operational financial dashboard metrics for an organization.
     *
     * @return array<string, mixed>
     */
    public function getDashboardMetrics(Organization $org): array
    {
        $now = CarbonImmutable::now();
        $startOfMonth = $now->startOfMonth();
        $endOfMonth = $now->endOfMonth();

        // Header KPIs
        $unpaidApprovedCount = Expense::where('organization_id', $org->id)
            ->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Processing])
            ->count();

        $unpaidApprovedAmount = (float) Expense::where('organization_id', $org->id)
            ->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Processing])
            ->sum('amount');

        $readyForPayoutCount = Expense::where('organization_id', $org->id)
            ->where('status', ExpenseStatus::Approved)
            ->count();

        $readyForPayoutAmount = (float) Expense::where('organization_id', $org->id)
            ->where('status', ExpenseStatus::Approved)
            ->sum('amount');

        $totalMtdReimbursed = (float) Expense::where('organization_id', $org->id)
            ->where('status', ExpenseStatus::Reimbursed)
            ->whereBetween('reimbursed_at', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        $pendingTaxAuditReviewCount = Expense::where('organization_id', $org->id)
            ->where('status', ExpenseStatus::Approved)
            ->where(function ($q): void {
                $q->whereNull('expense_category_id')
                    ->orWhere('tax_verified', false);
            })->count();

        // 14-Day Daily Cash Outflow Projection
        $dailyOutflowProjection = [];
        for ($i = 0; $i < 14; $i++) {
            $date = $now->addDays($i)->format('M d');
            // Mock dynamic projection based on approved & pending queue
            $baseAmount = $i === 0 ? $readyForPayoutAmount * 0.4 : ($readyForPayoutAmount * 0.6) / 13;
            $dailyOutflowProjection[] = [
                'date' => $date,
                'projected_amount' => round($baseAmount, 2),
            ];
        }

        // Spend by GL Code / Category
        $spendByGlCode = Expense::where('expenses.organization_id', $org->id)
            ->leftJoin('expense_categories', 'expenses.expense_category_id', '=', 'expense_categories.id')
            ->select(
                DB::raw("COALESCE(expense_categories.gl_code, 'GL-UNMAPPED') as gl_code"),
                DB::raw("COALESCE(expense_categories.name, 'Uncategorized') as category_name"),
                DB::raw('SUM(expenses.amount) as total_amount')
            )
            ->groupBy('gl_code', 'category_name')
            ->orderByDesc('total_amount')
            ->get()
            ->map(fn ($item) => [
                'gl_code' => $item->gl_code,
                'category_name' => $item->category_name,
                'total_amount' => (float) $item->total_amount,
            ]);

        // Top Unreimbursed Employees
        $topUnreimbursedEmployees = Expense::where('expenses.organization_id', $org->id)
            ->whereIn('expenses.status', [ExpenseStatus::Approved, ExpenseStatus::Processing])
            ->join('users', 'expenses.user_id', '=', 'users.id')
            ->select(
                'users.id as user_id',
                'users.name as employee_name',
                'users.email as employee_email',
                DB::raw('COUNT(expenses.id) as claim_count'),
                DB::raw('SUM(expenses.amount) as total_owed')
            )
            ->groupBy('users.id', 'users.name', 'users.email')
            ->orderByDesc('total_owed')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'user_id' => $item->user_id,
                'employee_name' => $item->employee_name,
                'employee_email' => $item->employee_email,
                'claim_count' => (int) $item->claim_count,
                'total_owed' => (float) $item->total_owed,
            ]);

        return [
            'kpis' => [
                'unpaid_approved_count' => $unpaidApprovedCount,
                'unpaid_approved_amount' => $unpaidApprovedAmount,
                'ready_for_payout_count' => $readyForPayoutCount,
                'ready_for_payout_amount' => $readyForPayoutAmount,
                'total_mtd_reimbursed' => $totalMtdReimbursed,
                'pending_tax_audit_count' => $pendingTaxAuditReviewCount,
            ],
            'daily_outflow_projection' => $dailyOutflowProjection,
            'spend_by_gl_code' => $spendByGlCode,
            'top_unreimbursed_employees' => $topUnreimbursedEmployees,
        ];
    }
}
