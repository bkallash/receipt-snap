<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AggregateType;
use App\Enums\BudgetPeriod;
use App\Models\Expense;
use App\Models\ExpenseAggregate;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

final class AggregateService
{
    /**
     * Handle real-time aggregate update when an expense is created, updated, or deleted.
     */
    public function handleExpenseChange(Expense $expense, ?string $oldStatus = null): void
    {
        if (! config('receipt-snap.aggregates.enabled', true)) {
            return;
        }

        try {
            $expenseDate = CarbonImmutable::parse($expense->expense_date);

            $orgId = (int) $expense->organization_id;
            $deptId = $this->resolveDepartmentId($expense);
            $catId = $expense->expense_category_id ? (int) $expense->expense_category_id : null;

            foreach ([BudgetPeriod::Monthly, BudgetPeriod::Quarterly, BudgetPeriod::Annual] as $period) {
                [$start, $end] = $this->getPeriodRange($period, $expenseDate);

                // 1. Organization level aggregate
                $this->recomputeSingleAggregate($orgId, AggregateType::Organization, null, $period, $start, $end, $expense->currency_code);

                // 2. Department level aggregate
                if ($deptId !== null) {
                    $this->recomputeSingleAggregate($orgId, AggregateType::Department, $deptId, $period, $start, $end, $expense->currency_code);
                }

                // 3. Category level aggregate
                if ($catId !== null) {
                    $this->recomputeSingleAggregate($orgId, AggregateType::Category, $catId, $period, $start, $end, $expense->currency_code);
                }
            }
        } catch (\Throwable $e) {
            Log::error('Failed to handle expense aggregate update', [
                'expense_id' => $expense->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Full recomputation for an entire organization.
     */
    public function recomputeForOrganization(int $orgId, ?string $periodName = null, ?CarbonImmutable $asOfDate = null): void
    {
        $date = $asOfDate ?? CarbonImmutable::now();

        $periods = $periodName
            ? [BudgetPeriod::from($periodName)]
            : [BudgetPeriod::Monthly, BudgetPeriod::Quarterly, BudgetPeriod::Annual];

        foreach ($periods as $period) {
            [$start, $end] = $this->getPeriodRange($period, $date);

            // Recompute Organization
            $currencies = DB::table('expenses')
                ->where('organization_id', $orgId)
                ->whereNull('deleted_at')
                ->whereBetween('expense_date', [$start, $end])
                ->distinct()
                ->pluck('currency_code')
                ->toArray();

            if (empty($currencies)) {
                $currencies = [config('receipt-snap.default_currency', 'USD')];
            }

            foreach ($currencies as $currency) {
                // Org-level
                $this->recomputeSingleAggregate($orgId, AggregateType::Organization, null, $period, $start, $end, $currency);

                // Department-level
                $deptIds = DB::table('organization_user')
                    ->where('organization_id', $orgId)
                    ->whereNotNull('department_id')
                    ->distinct()
                    ->pluck('department_id')
                    ->toArray();

                foreach ($deptIds as $deptId) {
                    $this->recomputeSingleAggregate($orgId, AggregateType::Department, (int) $deptId, $period, $start, $end, $currency);
                }

                // Category-level
                $catIds = DB::table('expense_categories')
                    ->where('organization_id', $orgId)
                    ->pluck('id')
                    ->toArray();

                foreach ($catIds as $catId) {
                    $this->recomputeSingleAggregate($orgId, AggregateType::Category, (int) $catId, $period, $start, $end, $currency);
                }
            }
        }
    }

    /**
     * Compute aggregate metrics via raw DB query for high performance and atomicity.
     */
    public function recomputeSingleAggregate(
        int $orgId,
        AggregateType $type,
        ?int $aggregateId,
        BudgetPeriod $period,
        string $startDate,
        string $endDate,
        string $currencyCode = 'USD'
    ): void {
        $query = DB::table('expenses')
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->where('currency_code', $currencyCode)
            ->whereBetween('expense_date', [$startDate, $endDate]);

        if ($type === AggregateType::Department && $aggregateId !== null) {
            $deptUserIds = DB::table('organization_user')
                ->where('organization_id', $orgId)
                ->where('department_id', $aggregateId)
                ->whereIn('is_active', [true, 1])
                ->pluck('user_id')
                ->toArray();

            if (empty($deptUserIds)) {
                $query->whereRaw('1 = 0'); // empty result
            } else {
                $query->whereIn('user_id', $deptUserIds);
            }
        } elseif ($type === AggregateType::Category && $aggregateId !== null) {
            $query->where('expense_category_id', $aggregateId);
        }

        $flaggedExpression = DB::getDriverName() === 'pgsql'
            ? "SUM(CASE WHEN metadata IS NOT NULL AND jsonb_typeof((metadata::jsonb)->'policy_flags') = 'array' AND jsonb_array_length((metadata::jsonb)->'policy_flags') > 0 THEN 1 ELSE 0 END)"
            : "SUM(CASE WHEN metadata LIKE '%policy_flags%' AND metadata NOT LIKE '%\"policy_flags\":[]%' AND metadata NOT LIKE '%\"policy_flags\":null%' THEN 1 ELSE 0 END)";

        $stats = $query->selectRaw("
            COUNT(*) as total_count,
            SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_count,
            SUM(CASE WHEN status IN ('submitted', 'under_review', 'pending_scan') THEN 1 ELSE 0 END) as submitted_count,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
            SUM(CASE WHEN status = 'reimbursed' THEN 1 ELSE 0 END) as reimbursed_count,
            SUM(CASE WHEN status != 'draft' THEN amount ELSE 0 END) as total_amount,
            SUM(CASE WHEN status IN ('approved', 'reimbursed') THEN amount ELSE 0 END) as approved_amount,
            SUM(CASE WHEN status IN ('submitted', 'under_review', 'pending_scan') THEN amount ELSE 0 END) as pending_amount,
            SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_amount,
            AVG(CASE WHEN status != 'draft' THEN amount ELSE NULL END) as avg_amount,
            MAX(CASE WHEN status != 'draft' THEN amount ELSE 0 END) as max_amount,
            {$flaggedExpression} as flagged_count
        ")->first();

        // Calculate flagged count in a driver agnostic manner if jsonb functions vary
        $flaggedCount = (int) ($stats->flagged_count ?? 0);

        $periodStartFormatted = CarbonImmutable::parse($startDate)->toDateString();
        $periodEndFormatted = CarbonImmutable::parse($endDate)->toDateString();

        ExpenseAggregate::updateOrCreate(
            [
                'organization_id' => $orgId,
                'aggregate_type' => $type->value,
                'aggregate_id' => $aggregateId,
                'period' => $period->value,
                'period_start' => $periodStartFormatted,
                'currency_code' => $currencyCode,
            ],
            [
                'period_end' => $periodEndFormatted,
                'total_count' => (int) ($stats->total_count ?? 0),
                'draft_count' => (int) ($stats->draft_count ?? 0),
                'submitted_count' => (int) ($stats->submitted_count ?? 0),
                'approved_count' => (int) ($stats->approved_count ?? 0),
                'rejected_count' => (int) ($stats->rejected_count ?? 0),
                'reimbursed_count' => (int) ($stats->reimbursed_count ?? 0),
                'total_amount' => round((float) ($stats->total_amount ?? 0.0), 2),
                'approved_amount' => round((float) ($stats->approved_amount ?? 0.0), 2),
                'pending_amount' => round((float) ($stats->pending_amount ?? 0.0), 2),
                'rejected_amount' => round((float) ($stats->rejected_amount ?? 0.0), 2),
                'avg_amount' => round((float) ($stats->avg_amount ?? 0.0), 2),
                'max_amount' => round((float) ($stats->max_amount ?? 0.0), 2),
                'flagged_count' => $flaggedCount,
            ]
        );
    }

    private function resolveDepartmentId(Expense $expense): ?int
    {
        if (! $expense->user_id || ! $expense->organization_id) {
            return null;
        }

        $deptId = DB::table('organization_user')
            ->where('organization_id', $expense->organization_id)
            ->where('user_id', $expense->user_id)
            ->whereIn('is_active', [true, 1])
            ->value('department_id');

        return $deptId ? (int) $deptId : null;
    }

    /**
     * Get departmental spend summary for an organization.
     *
     * @return Collection<int, array{id: int, name: string, total_spend: float, expense_count: int, average_claim: float}>
     */
    public function getDepartmentSummary(int $orgId): Collection
    {
        $departments = DB::table('departments')
            ->where('organization_id', $orgId)
            ->whereNull('deleted_at')
            ->get();

        return $departments->map(function ($dept) use ($orgId) {
            $deptUserIds = DB::table('organization_user')
                ->where('organization_id', $orgId)
                ->where('department_id', $dept->id)
                ->whereIn('is_active', [true, 1])
                ->pluck('user_id');

            $stats = DB::table('expenses')
                ->where('organization_id', $orgId)
                ->whereIn('user_id', $deptUserIds)
                ->whereNull('deleted_at')
                ->selectRaw('COUNT(*) as claim_count, COALESCE(SUM(amount), 0) as total_spend, COALESCE(AVG(amount), 0) as avg_spend')
                ->first();

            $totalSpend = (float) ($stats->total_spend ?? 0.0);
            $claimCount = (int) ($stats->claim_count ?? 0);
            $avgSpend = (float) ($stats->avg_spend ?? 0.0);

            return [
                'id' => (int) $dept->id,
                'name' => (string) $dept->name,
                'total_spend' => round($totalSpend, 2),
                'expense_count' => $claimCount,
                'average_claim' => round($avgSpend, 2),
            ];
        });
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function getPeriodRange(BudgetPeriod $period, CarbonImmutable $date): array
    {
        return match ($period) {
            BudgetPeriod::Quarterly => [
                $date->startOfQuarter()->startOfDay()->toDateTimeString(),
                $date->endOfQuarter()->endOfDay()->toDateTimeString(),
            ],
            BudgetPeriod::Annual => [
                $date->startOfYear()->startOfDay()->toDateTimeString(),
                $date->endOfYear()->endOfDay()->toDateTimeString(),
            ],
            default => [
                $date->startOfMonth()->startOfDay()->toDateTimeString(),
                $date->endOfMonth()->endOfDay()->toDateTimeString(),
            ],
        };
    }
}
