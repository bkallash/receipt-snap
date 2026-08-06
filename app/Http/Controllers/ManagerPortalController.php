<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AggregateType;
use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Http\Resources\V1\ExpenseCategoryResource;
use App\Http\Resources\V1\ExpenseResource;
use App\Models\Department;
use App\Models\Expense;
use App\Models\ExpenseAggregate;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Services\BudgetService;
use App\Support\TenantContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

final class ManagerPortalController extends Controller
{
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->organizations()->wherePivot('is_active', true)->doesntExist()) {
            return redirect()->route('portal.invitations');
        }

        $orgId = TenantContext::get();
        $activeOrg = $orgId ? Organization::where('id', $orgId)->first() : $user->currentOrganization();

        if (! $activeOrg) {
            return redirect()->route('portal.invitations');
        }

        TenantContext::set($activeOrg->id);

        if (! $user->isManagerOf($activeOrg)) {
            abort(403, 'Access to this page is restricted to users with Manager, Admin, or Owner roles.');
        }

        $userRole = $user->roleIn($activeOrg);

        $pivot = DB::table('organization_user')
            ->where('organization_id', $activeOrg->id)
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        $managerDeptId = $pivot?->department_id;
        $departmentName = null;
        $departmentObj = null;
        $budgetStatus = null;

        if ($managerDeptId) {
            $departmentObj = Department::where('id', $managerDeptId)->first();
            $departmentName = $departmentObj?->name;

            if ($departmentObj) {
                /** @var BudgetService $budgetService */
                $budgetService = app(BudgetService::class);
                $budgetStatus = $budgetService->calculateDepartmentBudgetStatus($departmentObj);
            }
        }

        // Base query for non-draft team expenses within the active organization
        $query = Expense::where('organization_id', $activeOrg->id)
            ->where('user_id', '!=', $user->id)
            ->whereIn('status', [
                ExpenseStatus::Submitted,
                ExpenseStatus::UnderReview,
                ExpenseStatus::Approved,
                ExpenseStatus::Rejected,
            ]);

        // If manager has a specific department and is not Admin/Owner, scope to employees of that department
        if ($userRole === UserRole::Manager && $managerDeptId) {
            $deptUserIds = DB::table('organization_user')
                ->where('organization_id', $activeOrg->id)
                ->where('department_id', $managerDeptId)
                ->pluck('user_id')
                ->all();

            $query->whereIn('user_id', $deptUserIds);
        }

        $expenses = $query
            ->with(['user', 'category', 'receiptImages', 'receipt', 'lineItems', 'approvalSteps.approver'])
            ->latest('submitted_at')
            ->latest('id')
            ->get();

        $myExpenses = Expense::where('organization_id', $activeOrg->id)
            ->where('user_id', $user->id)
            ->with(['user', 'category', 'receiptImages', 'receipt', 'lineItems', 'approvalSteps.approver'])
            ->latest('expense_date')
            ->latest('id')
            ->get();

        $categories = ExpenseCategory::where('is_active', true)->get();

        // Calculate team stats using pre-computed aggregate with fallback
        $aggregate = ExpenseAggregate::where('organization_id', $activeOrg->id)
            ->where('aggregate_type', AggregateType::Organization->value)
            ->where('period', 'monthly')
            ->where('period_start', now()->startOfMonth()->toDateString())
            ->first();

        if ($aggregate) {
            $stats = [
                'pending_count' => $aggregate->submitted_count,
                'pending_amount' => (float) $aggregate->pending_amount,
                'approved_count' => $aggregate->approved_count,
                'approved_amount' => (float) $aggregate->approved_amount,
                'rejected_count' => $aggregate->rejected_count,
                'flagged_count' => $aggregate->flagged_count,
                'total_count' => $aggregate->total_count,
            ];
        } else {
            $pendingExpenses = $expenses->filter(fn ($e) => in_array($e->status, [ExpenseStatus::Submitted, ExpenseStatus::UnderReview], true));
            $approvedExpenses = $expenses->filter(fn ($e) => $e->status === ExpenseStatus::Approved);
            $rejectedExpenses = $expenses->filter(fn ($e) => $e->status === ExpenseStatus::Rejected);

            $stats = [
                'pending_count' => $pendingExpenses->count(),
                'pending_amount' => (float) $pendingExpenses->sum('amount'),
                'approved_count' => $approvedExpenses->count(),
                'approved_amount' => (float) $approvedExpenses->sum('amount'),
                'rejected_count' => $rejectedExpenses->count(),
                'flagged_count' => $expenses->filter(fn ($e) => $e->hasPolicyViolations())->count(),
                'total_count' => $expenses->count(),
            ];
        }

        return Inertia::render('ManagerDashboard', [
            'expenses' => ExpenseResource::collection($expenses)->resolve(),
            'my_expenses' => ExpenseResource::collection($myExpenses)->resolve(),
            'categories' => ExpenseCategoryResource::collection($categories)->resolve(),
            'department' => [
                'id' => $managerDeptId,
                'name' => $departmentName ?? ($userRole === UserRole::Manager ? 'Unassigned Department' : 'All Departments (Admin View)'),
                'description' => $departmentObj?->description,
                'budget_amount' => $departmentObj?->budget_amount ? (float) $departmentObj->budget_amount : null,
                'budget_currency' => $departmentObj ? $departmentObj->budget_currency : 'USD',
                'budget_period' => $departmentObj?->budget_period?->value,
            ],
            'budget_status' => $budgetStatus,
            'stats' => $stats,
            'organization' => [
                'id' => $activeOrg->id,
                'name' => $activeOrg->name,
                'slug' => $activeOrg->slug,
            ],
            'userRole' => $userRole?->value,
        ]);
    }
}
