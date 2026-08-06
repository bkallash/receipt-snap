<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\AggregateType;
use App\Enums\ExpenseStatus;
use App\Enums\ExportFormat;
use App\Enums\UserRole;
use App\Http\Resources\V1\ExpenseAggregateResource;
use App\Models\AuditLog;
use App\Models\Expense;
use App\Models\ExpenseAggregate;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\ReimbursementBatch;
use App\Services\AccountantDashboardService;
use App\Services\AccountingExportService;
use App\Services\AggregateService;
use App\Services\CompliancePackageService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

final class AccountantPortalController extends Controller
{
    public function __construct(
        private readonly AccountantDashboardService $dashboardService,
        private readonly AggregateService $aggregateService,
        private readonly AccountingExportService $exportService,
        private readonly CompliancePackageService $complianceService
    ) {}

    private function authorizeAccountant(Request $request): Organization
    {
        $user = $request->user();
        $org = $user->currentOrganization();

        if (! $org) {
            abort(403, 'No active organization.');
        }

        $role = $user->roleIn($org);
        if (! in_array($role, [UserRole::Accountant, UserRole::Admin, UserRole::Owner], true)) {
            abort(403, 'Accountant financial access required.');
        }

        return $org;
    }

    public function dashboard(Request $request): Response
    {
        $org = $this->authorizeAccountant($request);
        $data = $this->dashboardService->getDashboardMetrics($org);

        return Inertia::render('Accountant/Dashboard', [
            'metrics' => $data,
        ]);
    }

    public function reimbursements(Request $request): Response
    {
        $org = $this->authorizeAccountant($request);

        $unpaidClaims = Expense::where('organization_id', $org->id)
            ->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Processing])
            ->with(['user', 'category'])
            ->latest('approved_at')
            ->get();

        $batches = ReimbursementBatch::where('organization_id', $org->id)
            ->with(['createdByUser', 'expenses'])
            ->latest('id')
            ->take(10)
            ->get();

        return Inertia::render('Accountant/Reimbursements', [
            'unpaidClaims' => $unpaidClaims,
            'recentBatches' => $batches,
        ]);
    }

    public function approvedExpenses(Request $request): Response
    {
        $org = $this->authorizeAccountant($request);

        $approvedExpenses = Expense::where('organization_id', $org->id)
            ->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Reimbursed])
            ->with(['user', 'category', 'receipt'])
            ->latest('expense_date')
            ->paginate(20);

        $categories = ExpenseCategory::where('organization_id', $org->id)->get();

        return Inertia::render('Accountant/ApprovedExpenses', [
            'expenses' => $approvedExpenses,
            'categories' => $categories,
        ]);
    }

    public function glCategories(Request $request): Response
    {
        $org = $this->authorizeAccountant($request);

        $categories = ExpenseCategory::where('organization_id', $org->id)
            ->withCount('expenses')
            ->orderBy('name')
            ->get();

        $unmappedCount = $categories->whereNull('gl_code')->count();

        return Inertia::render('Accountant/GLCategories', [
            'categories' => $categories,
            'unmappedCount' => $unmappedCount,
        ]);
    }

    public function updateGlCategory(Request $request, ExpenseCategory $category): RedirectResponse
    {
        $org = $this->authorizeAccountant($request);
        if ($category->organization_id !== $org->id) {
            abort(403);
        }

        $validated = $request->validate([
            'gl_code' => ['nullable', 'string', 'max:50'],
            'default_tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'requires_itemized_tax' => ['boolean'],
        ]);

        $category->update($validated);

        return back()->with('success', 'GL Category updated successfully.');
    }

    public function analytics(Request $request): Response
    {
        $org = $this->authorizeAccountant($request);

        $departmentalSummary = $this->aggregateService->getDepartmentSummary($org->id);

        $categorySummary = Expense::where('organization_id', $org->id)
            ->selectRaw('COALESCE(expense_category_id, 0) as cat_id, COUNT(*) as claim_count, SUM(amount) as total_spend')
            ->groupBy('cat_id')
            ->get();

        return Inertia::render('Accountant/Analytics', [
            'departmentSummary' => $departmentalSummary,
            'categorySummary' => $categorySummary,
        ]);
    }

    public function auditLogs(Request $request): Response
    {
        $org = $this->authorizeAccountant($request);

        $query = AuditLog::where('organization_id', $org->id)->with('user');

        if ($request->has('search') && filled($request->input('search'))) {
            $term = '%'.mb_strtolower((string) $request->input('search')).'%';
            $query->where(function ($q) use ($term): void {
                $q->whereRaw('LOWER(auditable_id) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(action) LIKE ?', [$term]);
            });
        }

        $logs = $query->latest('id')->paginate(25);

        return Inertia::render('Accountant/AuditLogs', [
            'logs' => $logs,
            'filters' => $request->only(['search']),
        ]);
    }

    public function expensesLookup(Request $request): Response
    {
        $org = $this->authorizeAccountant($request);

        $query = Expense::where('organization_id', $org->id)
            ->with(['user', 'category', 'receipt', 'lineItems', 'approvalSteps.approver']);

        if ($request->has('search') && filled($request->input('search'))) {
            $term = '%'.mb_strtolower((string) $request->input('search')).'%';
            $query->where(function ($q) use ($term): void {
                $q->whereRaw('LOWER(merchant_name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(uuid) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(description) LIKE ?', [$term])
                    ->orWhereHas('user', fn ($u) => $u->whereRaw('LOWER(name) LIKE ?', [$term])->orWhereRaw('LOWER(email) LIKE ?', [$term]));
            });
        }

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        $expenses = $query->latest('expense_date')->paginate(20);

        return Inertia::render('Accountant/ExpensesLookup', [
            'expenses' => $expenses,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function exportErp(Request $request): SymfonyResponse
    {
        $org = $this->authorizeAccountant($request);
        $target = $request->query('target', 'quickbooks_csv');

        $expenses = Expense::where('organization_id', $org->id)
            ->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Reimbursed])
            ->with(['user', 'category'])
            ->latest('expense_date')
            ->get();

        $content = match ($target) {
            'quickbooks_iif' => $this->exportService->exportQuickBooks($expenses, 'iif'),
            'xero' => $this->exportService->exportXero($expenses),
            'netsuite' => $this->exportService->exportNetSuiteSap($expenses, 'netsuite'),
            'sap' => $this->exportService->exportNetSuiteSap($expenses, 'sap'),
            'tax_ledger' => $this->exportService->exportTaxLedger($expenses),
            default => $this->exportService->exportQuickBooks($expenses, 'csv'),
        };

        $ext = $target === 'quickbooks_iif' ? 'iif' : 'csv';
        $filename = "export_{$target}_".now()->format('Ymd_His').".{$ext}";

        return response($content, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function downloadCompliancePackage(Request $request): SymfonyResponse
    {
        $org = $this->authorizeAccountant($request);
        $search = $request->query('search');

        $filePath = $this->complianceService->bundleAuditPackage($org, $search ? (string) $search : null);

        $isZip = str_ends_with($filePath, '.zip');
        $mime = $isZip ? 'application/zip' : 'text/csv';

        return response()->download($filePath, basename($filePath), ['Content-Type' => $mime])->deleteFileAfterSend();
    }

    public function downloadBankFile(Request $request, ReimbursementBatch $batch): SymfonyResponse
    {
        $org = $this->authorizeAccountant($request);
        if ($batch->organization_id !== $org->id) {
            abort(403);
        }

        $formatStr = $request->query('format', 'standard_csv');
        $format = ExportFormat::tryFrom((string) $formatStr) ?? ExportFormat::StandardCsv;

        $content = $this->exportService->generateBankFile($batch, $format);

        $filename = "batch_{$batch->batch_number}_{$format->value}.".($format === ExportFormat::SepaXml ? 'xml' : ($format === ExportFormat::Nacha ? 'txt' : 'csv'));

        return response($content, 200, [
            'Content-Type' => $format === ExportFormat::SepaXml ? 'application/xml' : 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function downloadAggregatesSummary(Request $request): JsonResponse
    {
        $org = $this->authorizeAccountant($request);

        $period = $request->query('period', 'monthly');
        $dateStr = $request->query('date', now()->toDateString());
        $asOfDate = CarbonImmutable::parse($dateStr);

        $periodStart = match ($period) {
            'quarterly' => $asOfDate->startOfQuarter()->toDateString(),
            'annual' => $asOfDate->startOfYear()->toDateString(),
            default => $asOfDate->startOfMonth()->toDateString(),
        };

        $orgAggregate = ExpenseAggregate::where('organization_id', $org->id)
            ->where('aggregate_type', AggregateType::Organization->value)
            ->where('period', $period)
            ->where('period_start', $periodStart)
            ->first();

        if (! $orgAggregate) {
            $this->aggregateService->recomputeForOrganization($org->id, $period, $asOfDate);
            $orgAggregate = ExpenseAggregate::where('organization_id', $org->id)
                ->where('aggregate_type', AggregateType::Organization->value)
                ->where('period', $period)
                ->where('period_start', $periodStart)
                ->first();
        }

        $departmentAggregates = ExpenseAggregate::where('organization_id', $org->id)
            ->where('aggregate_type', AggregateType::Department->value)
            ->where('period', $period)
            ->where('period_start', $periodStart)
            ->get();

        $categoryAggregates = ExpenseAggregate::where('organization_id', $org->id)
            ->where('aggregate_type', AggregateType::Category->value)
            ->where('period', $period)
            ->where('period_start', $periodStart)
            ->get();

        return response()->json([
            'period' => $period,
            'period_start' => $periodStart,
            'organization_summary' => $orgAggregate ? (new ExpenseAggregateResource($orgAggregate))->resolve() : null,
            'department_breakdown' => ExpenseAggregateResource::collection($departmentAggregates)->resolve(),
            'category_breakdown' => ExpenseAggregateResource::collection($categoryAggregates)->resolve(),
        ]);
    }
}
