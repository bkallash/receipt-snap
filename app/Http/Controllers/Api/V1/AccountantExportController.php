<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ExpenseStatus;
use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\Organization;
use App\Services\AccountingExportService;
use App\Services\CompliancePackageService;
use App\Support\TenantContext;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class AccountantExportController extends Controller
{
    public function __construct(
        private readonly AccountingExportService $exportService,
        private readonly CompliancePackageService $complianceService
    ) {}

    private function getOrganization(): Organization
    {
        $orgId = TenantContext::get();
        if (! $orgId) {
            abort(403, 'No organization context resolved.');
        }

        return Organization::findOrFail($orgId);
    }

    public function exportErp(Request $request): Response
    {
        $org = $this->getOrganization();
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

    public function downloadCompliancePackage(Request $request): Response
    {
        $org = $this->getOrganization();
        $search = $request->query('search');

        $filePath = $this->complianceService->bundleAuditPackage($org, $search ? (string) $search : null);

        $isZip = str_ends_with($filePath, '.zip');
        $mime = $isZip ? 'application/zip' : 'text/csv';

        return response()->download($filePath, basename($filePath), ['Content-Type' => $mime])->deleteFileAfterSend();
    }
}
