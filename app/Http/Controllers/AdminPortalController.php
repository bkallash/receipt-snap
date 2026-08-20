<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ExpenseStatus;
use App\Http\Controllers\Concerns\AdministersOrganization;
use App\Http\Resources\V1\ExpenseResource;
use App\Models\Department;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Services\AdminDashboardService;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class AdminPortalController extends Controller
{
    use AdministersOrganization;

    /**
     * Valid tabs on the approval inbox.
     */
    private const APPROVAL_TABS = ['pending', 'under_review', 'flagged', 'approved', 'rejected', 'all'];

    public function __construct(private readonly AdminDashboardService $dashboardService) {}

    public function dashboard(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->organizations()->wherePivot('is_active', true)->doesntExist()) {
            return redirect()->route('portal.invitations');
        }

        $org = $this->resolveAdministeredOrganization($request);

        $period = (string) $request->query('period', 'monthly');
        if (! in_array($period, ['monthly', 'quarterly', 'annual'], true)) {
            $period = 'monthly';
        }

        return Inertia::render('Admin/Dashboard', [
            'metrics' => $this->dashboardService->getDashboardMetrics($org, $period),
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
                'plan_tier' => $org->plan_tier?->value,
            ],
            'administeredOrganizations' => $this->administeredOrganizations($request),
            'filters' => ['period' => $period],
        ]);
    }

    /**
     * Organization-wide approval inbox.
     */
    public function approvals(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->organizations()->wherePivot('is_active', true)->doesntExist()) {
            return redirect()->route('portal.invitations');
        }

        $org = $this->resolveAdministeredOrganization($request);

        $tab = (string) $request->query('tab', 'pending');
        if (! in_array($tab, self::APPROVAL_TABS, true)) {
            $tab = 'pending';
        }

        $filters = [
            'tab' => $tab,
            'search' => $request->query('search'),
            'employee' => $request->query('employee'),
            'department' => $request->query('department'),
            'category' => $request->query('category'),
            'date_from' => $request->query('date_from'),
            'date_to' => $request->query('date_to'),
            'amount_min' => $request->query('amount_min'),
            'amount_max' => $request->query('amount_max'),
            'flagged_only' => $request->boolean('flagged_only'),
        ];

        $query = $this->applyApprovalFilters(
            Expense::where('organization_id', $org->id)->where('status', '!=', ExpenseStatus::Draft),
            $org,
            $filters
        );

        $expenses = $query
            ->with(['user', 'category', 'receiptImages', 'receipt', 'lineItems', 'approvalSteps.approver'])
            ->orderByRaw('COALESCE(submitted_at, created_at) DESC')
            ->orderByDesc('id')
            ->paginate(25)
            ->withQueryString();

        // Department names resolve through the membership pivot, not the expense itself.
        $departmentNames = $this->departmentNamesForUsers(
            $org,
            $expenses->getCollection()->pluck('user_id')->unique()->all()
        );

        $expenses->through(fn (Expense $expense): array => array_merge(
            (new ExpenseResource($expense))->resolve(),
            [
                'department_name' => $departmentNames[$expense->user_id] ?? null,
                'is_own_claim' => $expense->user_id === $user->id,
                'can_decide' => $expense->user_id !== $user->id
                    && in_array($expense->status, [ExpenseStatus::Submitted, ExpenseStatus::UnderReview], true),
            ]
        ));

        return Inertia::render('Admin/Approvals', [
            'expenses' => $expenses,
            'filters' => $filters,
            'tabCounts' => $this->approvalTabCounts($org),
            'filterOptions' => $this->approvalFilterOptions($org),
            'ownClaimCount' => Expense::where('organization_id', $org->id)
                ->where('user_id', $user->id)
                ->whereIn('status', [ExpenseStatus::Submitted, ExpenseStatus::UnderReview])
                ->count(),
        ]);
    }

    /**
     * @param  Builder<Expense>  $query
     * @param  array<string, mixed>  $filters
     * @return Builder<Expense>
     */
    private function applyApprovalFilters(Builder $query, Organization $org, array $filters): Builder
    {
        match ($filters['tab']) {
            'under_review' => $query->where('status', ExpenseStatus::UnderReview),
            'flagged' => $query->flagged(),
            'approved' => $query->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Processing, ExpenseStatus::Reimbursed]),
            'rejected' => $query->where('status', ExpenseStatus::Rejected),
            'all' => $query,
            default => $query->whereIn('status', [ExpenseStatus::Submitted, ExpenseStatus::UnderReview]),
        };

        if ($filters['flagged_only'] && $filters['tab'] !== 'flagged') {
            $query->flagged();
        }

        if ($search = $filters['search']) {
            $term = '%'.mb_strtolower((string) $search).'%';
            $query->where(function (Builder $q) use ($term): void {
                $q->whereRaw('LOWER(merchant_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(description) LIKE ?', [$term])
                    ->orWhereHas('user', fn (Builder $u) => $u->whereRaw('LOWER(name) LIKE ?', [$term])->orWhereRaw('LOWER(email) LIKE ?', [$term]));
            });
        }

        if ($employeeId = $filters['employee']) {
            $query->where('user_id', (int) $employeeId);
        }

        if ($departmentId = $filters['department']) {
            $memberIds = DB::table('organization_user')
                ->where('organization_id', $org->id)
                ->where('department_id', (int) $departmentId)
                ->pluck('user_id')
                ->all();

            $query->whereIn('user_id', $memberIds ?: [0]);
        }

        if ($categoryId = $filters['category']) {
            $query->where('expense_category_id', (int) $categoryId);
        }

        if ($dateFrom = $filters['date_from']) {
            $query->whereDate('expense_date', '>=', $dateFrom);
        }

        if ($dateTo = $filters['date_to']) {
            $query->whereDate('expense_date', '<=', $dateTo);
        }

        if (($amountMin = $filters['amount_min']) !== null && $amountMin !== '') {
            $query->where('amount', '>=', (float) $amountMin);
        }

        if (($amountMax = $filters['amount_max']) !== null && $amountMax !== '') {
            $query->where('amount', '<=', (float) $amountMax);
        }

        return $query;
    }

    /**
     * @return array<string, int>
     */
    private function approvalTabCounts(Organization $org): array
    {
        $base = fn (): Builder => Expense::where('organization_id', $org->id)->where('status', '!=', ExpenseStatus::Draft);

        return [
            'pending' => $base()->whereIn('status', [ExpenseStatus::Submitted, ExpenseStatus::UnderReview])->count(),
            'under_review' => $base()->where('status', ExpenseStatus::UnderReview)->count(),
            'flagged' => $base()->flagged()->count(),
            'approved' => $base()->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Processing, ExpenseStatus::Reimbursed])->count(),
            'rejected' => $base()->where('status', ExpenseStatus::Rejected)->count(),
            'all' => $base()->count(),
        ];
    }

    /**
     * Employees, departments, and categories available as filters.
     *
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function approvalFilterOptions(Organization $org): array
    {
        $employees = DB::table('organization_user')
            ->join('users', 'organization_user.user_id', '=', 'users.id')
            ->where('organization_user.organization_id', $org->id)
            ->whereIn('organization_user.is_active', [true, 1])
            ->select('users.id', 'users.name', 'users.email')
            ->orderBy('users.name')
            ->get()
            ->map(fn ($row): array => [
                'id' => (int) $row->id,
                'name' => (string) $row->name,
                'email' => (string) $row->email,
            ])
            ->all();

        $departments = Department::where('organization_id', $org->id)
            ->orderBy('name')
            ->get()
            ->map(fn (Department $d): array => ['id' => $d->id, 'name' => $d->name])
            ->all();

        $categories = ExpenseCategory::where('organization_id', $org->id)
            ->orderBy('name')
            ->get()
            ->map(fn (ExpenseCategory $c): array => ['id' => $c->id, 'name' => $c->name])
            ->all();

        return [
            'employees' => $employees,
            'departments' => $departments,
            'categories' => $categories,
        ];
    }

    /**
     * Map user ids to their department name within this organization.
     *
     * @param  array<int, int>  $userIds
     * @return array<int, string>
     */
    private function departmentNamesForUsers(Organization $org, array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        return DB::table('organization_user')
            ->join('departments', 'organization_user.department_id', '=', 'departments.id')
            ->where('organization_user.organization_id', $org->id)
            ->whereIn('organization_user.user_id', $userIds)
            ->pluck('departments.name', 'organization_user.user_id')
            ->map(fn ($name): string => (string) $name)
            ->all();
    }

    /**
     * Switch the active organization, scoped to organizations the user administers.
     */
    public function switchOrganization(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'organization_id' => ['required', 'integer'],
        ]);

        $target = Organization::where('id', (int) $validated['organization_id'])
            ->whereHas('users', fn ($q) => $q->where('users.id', $request->user()->id)->where('organization_user.is_active', true))
            ->first();

        if (! $target || ! in_array($request->user()->roleIn($target), self::ADMIN_ROLES, true)) {
            abort(403, 'You do not administer that organization.');
        }

        $request->session()->put('current_organization_id', $target->id);
        TenantContext::set($target->id);

        return redirect()
            ->route('admin.dashboard')
            ->with('success', "Now administering {$target->name}.");
    }
}
