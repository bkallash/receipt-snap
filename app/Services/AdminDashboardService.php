<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Models\ReimbursementBatch;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

final class AdminDashboardService
{
    /**
     * Utilization at or above this percentage counts as "at risk".
     */
    private const AT_RISK_THRESHOLD = 80.0;

    public function __construct(private readonly BudgetService $budgetService) {}

    /**
     * Build the organization-wide administration overview.
     *
     * @param  'monthly'|'quarterly'|'annual'  $period
     * @return array<string, mixed>
     */
    public function getDashboardMetrics(Organization $org, string $period = 'monthly'): array
    {
        $now = CarbonImmutable::now();
        [$periodStart, $periodEnd] = $this->resolvePeriodRange($period, $now);

        return [
            'period' => [
                'key' => $period,
                'label' => $this->periodLabel($period, $now),
                'start' => $periodStart->toDateString(),
                'end' => $periodEnd->toDateString(),
            ],
            'currency' => config('receipt-snap.default_currency', 'USD'),
            'kpis' => $this->buildKpis($org, $periodStart, $periodEnd),
            'spend_windows' => $this->buildSpendWindows($org, $now),
            'trend' => $this->buildTrend($org, $period, $periodStart, $periodEnd),
            'department_budgets' => $this->buildDepartmentBudgets($org, $now),
            'category_budgets' => $this->buildCategoryBudgets($org, $now),
            'people' => $this->buildPeople($org),
            'ai_quota' => $this->buildAiQuota($org),
            'recent_audit_activity' => $this->buildRecentAuditActivity($org),
            'recent_batches' => $this->buildRecentBatches($org),
        ];
    }

    /**
     * Headline counters for the focus period.
     *
     * @return array<string, float|int>
     */
    private function buildKpis(Organization $org, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $periodSpend = (float) $this->baseExpenseQuery($org)
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->sum('amount');

        $periodClaims = $this->baseExpenseQuery($org)
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->count();

        $pending = Expense::where('organization_id', $org->id)
            ->whereIn('status', [ExpenseStatus::Submitted, ExpenseStatus::UnderReview, ExpenseStatus::PendingScan])
            ->selectRaw('COUNT(*) as claim_count, COALESCE(SUM(amount), 0) as total_amount')
            ->first();

        $oldestPendingDate = Expense::where('organization_id', $org->id)
            ->whereIn('status', [ExpenseStatus::Submitted, ExpenseStatus::UnderReview])
            ->min('submitted_at');

        $flagged = Expense::where('organization_id', $org->id)
            ->where('status', '!=', ExpenseStatus::Draft)
            ->flagged()
            ->selectRaw('COUNT(*) as claim_count, COALESCE(SUM(amount), 0) as total_amount')
            ->first();

        $awaitingReimbursement = Expense::where('organization_id', $org->id)
            ->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Processing])
            ->selectRaw('COUNT(*) as claim_count, COALESCE(SUM(amount), 0) as total_amount')
            ->first();

        return [
            'period_spend' => round($periodSpend, 2),
            'period_claim_count' => $periodClaims,
            'period_avg_claim' => $periodClaims > 0 ? round($periodSpend / $periodClaims, 2) : 0.0,
            'pending_count' => (int) ($pending->claim_count ?? 0),
            'pending_amount' => round((float) ($pending->total_amount ?? 0.0), 2),
            'oldest_pending_days' => $oldestPendingDate
                ? CarbonImmutable::parse($oldestPendingDate)->diffInDays(CarbonImmutable::now())
                : 0,
            'flagged_count' => (int) ($flagged->claim_count ?? 0),
            'flagged_amount' => round((float) ($flagged->total_amount ?? 0.0), 2),
            'awaiting_reimbursement_count' => (int) ($awaitingReimbursement->claim_count ?? 0),
            'awaiting_reimbursement_amount' => round((float) ($awaitingReimbursement->total_amount ?? 0.0), 2),
        ];
    }

    /**
     * Month / quarter / year spend, always shown regardless of the focus period.
     *
     * @return array<int, array{key: string, label: string, amount: float, claim_count: int}>
     */
    private function buildSpendWindows(Organization $org, CarbonImmutable $now): array
    {
        $windows = [
            ['key' => 'monthly', 'label' => 'This month', 'start' => $now->startOfMonth(), 'end' => $now->endOfMonth()],
            ['key' => 'quarterly', 'label' => 'This quarter', 'start' => $now->startOfQuarter(), 'end' => $now->endOfQuarter()],
            ['key' => 'annual', 'label' => 'This year', 'start' => $now->startOfYear(), 'end' => $now->endOfYear()],
        ];

        return array_map(function (array $window) use ($org): array {
            $stats = $this->baseExpenseQuery($org)
                ->whereBetween('expense_date', [$window['start']->toDateString(), $window['end']->toDateString()])
                ->selectRaw('COUNT(*) as claim_count, COALESCE(SUM(amount), 0) as total_amount')
                ->first();

            return [
                'key' => $window['key'],
                'label' => $window['label'],
                'amount' => round((float) ($stats->total_amount ?? 0.0), 2),
                'claim_count' => (int) ($stats->claim_count ?? 0),
            ];
        }, $windows);
    }

    /**
     * Bucketed spend across the focus period. Bucket width adapts to the period
     * so the series stays readable: days for a month, weeks for a quarter,
     * months for a year.
     *
     * @return array<int, array{label: string, amount: float}>
     */
    private function buildTrend(Organization $org, string $period, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $rows = $this->baseExpenseQuery($org)
            ->whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('expense_date, COALESCE(SUM(amount), 0) as total_amount')
            ->groupBy('expense_date')
            ->pluck('total_amount', 'expense_date');

        $buckets = $this->buildEmptyBuckets($period, $start, $end);

        foreach ($rows as $date => $amount) {
            $key = $this->bucketKeyFor($period, CarbonImmutable::parse((string) $date));

            if (isset($buckets[$key])) {
                $buckets[$key]['amount'] += (float) $amount;
            }
        }

        return array_values(array_map(
            fn (array $bucket): array => [
                'label' => $bucket['label'],
                'amount' => round($bucket['amount'], 2),
            ],
            $buckets
        ));
    }

    /**
     * @return array<string, array{label: string, amount: float}>
     */
    private function buildEmptyBuckets(string $period, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $buckets = [];
        $cursor = $start;

        while ($cursor->lessThanOrEqualTo($end)) {
            $key = $this->bucketKeyFor($period, $cursor);

            if (! isset($buckets[$key])) {
                $buckets[$key] = [
                    'label' => match ($period) {
                        'annual' => $cursor->format('M'),
                        'quarterly' => $cursor->format('M j'),
                        default => $cursor->format('j'),
                    },
                    'amount' => 0.0,
                ];
            }

            $cursor = match ($period) {
                'annual' => $cursor->addMonth()->startOfMonth(),
                'quarterly' => $cursor->addWeek()->startOfWeek(),
                default => $cursor->addDay(),
            };
        }

        return $buckets;
    }

    private function bucketKeyFor(string $period, CarbonImmutable $date): string
    {
        return match ($period) {
            'annual' => $date->format('Y-m'),
            'quarterly' => $date->startOfWeek()->toDateString(),
            default => $date->toDateString(),
        };
    }

    /**
     * Departments ranked by budget pressure, worst first.
     *
     * @return array{items: array<int, array<string, mixed>>, at_risk_count: int, over_count: int, unbudgeted_count: int}
     */
    private function buildDepartmentBudgets(Organization $org, CarbonImmutable $now): array
    {
        $departments = Department::where('organization_id', $org->id)->orderBy('name')->get();

        $memberCounts = DB::table('organization_user')
            ->where('organization_id', $org->id)
            ->whereIn('is_active', [true, 1])
            ->whereNotNull('department_id')
            ->selectRaw('department_id, COUNT(*) as member_count')
            ->groupBy('department_id')
            ->pluck('member_count', 'department_id');

        $items = [];
        $unbudgeted = 0;

        foreach ($departments as $department) {
            if ($department->budget_amount === null || (float) $department->budget_amount <= 0) {
                $unbudgeted++;

                continue;
            }

            $status = $this->budgetService->calculateDepartmentBudgetStatus($department, $now);
            $committed = $status['spent_amount'] + $status['pending_amount'];

            $items[] = [
                'id' => $department->id,
                'name' => $department->name,
                'member_count' => (int) ($memberCounts[$department->id] ?? 0),
                'budget_amount' => $status['budget_amount'],
                'budget_currency' => $status['budget_currency'] ?? config('receipt-snap.default_currency', 'USD'),
                'budget_period' => $status['budget_period'] ?? 'monthly',
                'spent_amount' => $status['spent_amount'],
                'pending_amount' => $status['pending_amount'],
                'committed_amount' => round($committed, 2),
                'remaining_budget' => $status['remaining_budget'],
                'utilization_percentage' => $status['utilization_percentage'],
            ];
        }

        usort($items, fn (array $a, array $b): int => $b['utilization_percentage'] <=> $a['utilization_percentage']);

        return [
            'items' => $items,
            'at_risk_count' => count(array_filter(
                $items,
                fn (array $i): bool => $i['utilization_percentage'] >= self::AT_RISK_THRESHOLD && $i['utilization_percentage'] <= 100.0
            )),
            'over_count' => count(array_filter($items, fn (array $i): bool => $i['utilization_percentage'] > 100.0)),
            'unbudgeted_count' => $unbudgeted,
        ];
    }

    /**
     * Categories ranked by budget pressure, worst first.
     *
     * @return array{items: array<int, array<string, mixed>>, at_risk_count: int, over_count: int, unbudgeted_count: int}
     */
    private function buildCategoryBudgets(Organization $org, CarbonImmutable $now): array
    {
        $categories = ExpenseCategory::where('organization_id', $org->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $items = [];
        $unbudgeted = 0;

        foreach ($categories as $category) {
            if ($category->budget_amount === null || (float) $category->budget_amount <= 0) {
                $unbudgeted++;

                continue;
            }

            $status = $this->budgetService->calculateCategoryBudgetStatus($category, $now);
            $committed = $status['spent_amount'] + $status['pending_amount'];

            $items[] = [
                'id' => $category->id,
                'name' => $category->name,
                'color' => $category->color,
                'gl_code' => $category->gl_code,
                'budget_amount' => $status['budget_amount'],
                'budget_currency' => $status['budget_currency'] ?? config('receipt-snap.default_currency', 'USD'),
                'budget_period' => $status['budget_period'] ?? 'monthly',
                'spent_amount' => $status['spent_amount'],
                'pending_amount' => $status['pending_amount'],
                'committed_amount' => round($committed, 2),
                'remaining_budget' => $status['remaining_budget'],
                'utilization_percentage' => $status['utilization_percentage'],
            ];
        }

        usort($items, fn (array $a, array $b): int => $b['utilization_percentage'] <=> $a['utilization_percentage']);

        return [
            'items' => $items,
            'at_risk_count' => count(array_filter(
                $items,
                fn (array $i): bool => $i['utilization_percentage'] >= self::AT_RISK_THRESHOLD && $i['utilization_percentage'] <= 100.0
            )),
            'over_count' => count(array_filter($items, fn (array $i): bool => $i['utilization_percentage'] > 100.0)),
            'unbudgeted_count' => $unbudgeted,
        ];
    }

    /**
     * Active membership, role mix, and outstanding invitations.
     *
     * @return array<string, mixed>
     */
    private function buildPeople(Organization $org): array
    {
        $roleCounts = DB::table('organization_user')
            ->where('organization_id', $org->id)
            ->whereIn('is_active', [true, 1])
            ->selectRaw('role, COUNT(*) as member_count')
            ->groupBy('role')
            ->pluck('member_count', 'role');

        $roleBreakdown = [];
        foreach (UserRole::cases() as $role) {
            $count = (int) ($roleCounts[$role->value] ?? 0);
            if ($count > 0) {
                $roleBreakdown[] = ['role' => $role->value, 'count' => $count];
            }
        }

        $pendingInvitations = OrganizationInvitation::where('organization_id', $org->id)
            ->pending()
            ->with(['invitedBy', 'department'])
            ->latest('id')
            ->take(5)
            ->get()
            ->map(function (OrganizationInvitation $invitation): array {
                $dept = $invitation->department;
                $invBy = $invitation->invitedBy;

                return [
                    'id' => $invitation->id,
                    'email' => $invitation->email,
                    'role' => $invitation->role?->value,
                    'department_name' => $dept instanceof \App\Models\Department ? $dept->name : null,
                    'invited_by' => $invBy instanceof \App\Models\User ? $invBy->name : null,
                    'expires_at' => $invitation->expires_at?->toIso8601String(),
                    'days_until_expiry' => $invitation->expires_at
                        ? max(0, (int) CarbonImmutable::now()->diffInDays($invitation->expires_at, false))
                        : null,
                ];
            })
            ->all();

        return [
            'active_member_count' => (int) $roleCounts->sum(),
            'role_breakdown' => $roleBreakdown,
            'pending_invitation_count' => OrganizationInvitation::where('organization_id', $org->id)->pending()->count(),
            'unassigned_member_count' => DB::table('organization_user')
                ->where('organization_id', $org->id)
                ->whereIn('is_active', [true, 1])
                ->whereNull('department_id')
                ->count(),
            'pending_invitations' => $pendingInvitations,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildAiQuota(Organization $org): array
    {
        $limit = $org->ai_scan_monthly_limit ?? $org->plan_tier?->aiScanLimit();
        $used = (int) ($org->ai_scans_used_this_month ?? 0);

        return [
            'used' => $used,
            'limit' => $limit,
            'is_unlimited' => $limit === null,
            'utilization_percentage' => ($limit !== null && $limit > 0)
                ? round(($used / $limit) * 100, 1)
                : 0.0,
            'resets_at' => $org->ai_scans_reset_at?->toIso8601String(),
            'plan_tier' => $org->plan_tier?->value,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildRecentAuditActivity(Organization $org): array
    {
        return AuditLog::where('organization_id', $org->id)
            ->with('actor')
            ->latest('id')
            ->take(8)
            ->get()
            ->map(function (AuditLog $log): array {
                $actor = $log->actor;

                return [
                    'uuid' => $log->uuid,
                    'action' => $log->action?->value,
                    'actor_name' => $actor instanceof \App\Models\User ? $actor->name : 'System',
                    'auditable_type' => $log->auditable_type ? class_basename((string) $log->auditable_type) : null,
                    'auditable_id' => $log->auditable_id,
                    'created_at' => $log->created_at?->toIso8601String(),
                ];
            })
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildRecentBatches(Organization $org): array
    {
        return ReimbursementBatch::where('organization_id', $org->id)
            ->with('createdByUser')
            ->latest('id')
            ->take(5)
            ->get()
            ->map(function (ReimbursementBatch $batch): array {
                $creator = $batch->createdByUser;

                return [
                    'id' => $batch->id,
                    'batch_number' => $batch->batch_number,
                    'status' => $batch->status?->value,
                    'claim_count' => (int) $batch->claim_count,
                    'total_amount' => (float) $batch->total_amount,
                    'currency_code' => $batch->currency_code,
                    'created_by' => $creator instanceof \App\Models\User ? $creator->name : null,
                    'processed_at' => $batch->processed_at?->toIso8601String(),
                    'created_at' => $batch->created_at?->toIso8601String(),
                ];
            })
            ->all();
    }

    /**
     * Every reportable expense: drafts are the employee's private workspace and
     * never count toward organization spend.
     *
     * @return Builder<Expense>
     */
    private function baseExpenseQuery(Organization $org)
    {
        return Expense::where('organization_id', $org->id)
            ->where('status', '!=', ExpenseStatus::Draft);
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private function resolvePeriodRange(string $period, CarbonImmutable $now): array
    {
        return match ($period) {
            'quarterly' => [$now->startOfQuarter(), $now->endOfQuarter()],
            'annual' => [$now->startOfYear(), $now->endOfYear()],
            default => [$now->startOfMonth(), $now->endOfMonth()],
        };
    }

    private function periodLabel(string $period, CarbonImmutable $now): string
    {
        return match ($period) {
            'quarterly' => 'Q'.$now->quarter.' '.$now->year,
            'annual' => (string) $now->year,
            default => $now->format('F Y'),
        };
    }
}
