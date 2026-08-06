<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ExportFormat;
use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\ReimbursementBatch;
use App\Services\AccountingExportService;
use App\Services\ReimbursementService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ReimbursementBatchController extends Controller
{
    public function __construct(
        private readonly ReimbursementService $reimbursementService,
        private readonly AccountingExportService $exportService
    ) {}

    private function getOrganization(): Organization
    {
        $orgId = TenantContext::get();
        if (! $orgId) {
            abort(403, 'No organization context resolved.');
        }

        return Organization::findOrFail($orgId);
    }

    public function index(): JsonResponse
    {
        $org = $this->getOrganization();
        $batches = ReimbursementBatch::where('organization_id', $org->id)
            ->with(['createdByUser', 'expenses'])
            ->latest('id')
            ->paginate(15);

        return response()->json($batches);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expense_uuids' => ['required', 'array', 'min:1'],
            'expense_uuids.*' => ['required', 'string', 'uuid'],
            'payment_method' => ['required', 'string'],
        ]);

        $org = $this->getOrganization();
        $user = $request->user();

        $batch = $this->reimbursementService->createBatch(
            org: $org,
            user: $user,
            expenseUuids: $validated['expense_uuids'],
            paymentMethod: $validated['payment_method']
        );

        return response()->json([
            'message' => 'Reimbursement batch created successfully.',
            'data' => $batch->load('expenses'),
        ], Response::HTTP_CREATED);
    }

    public function show(ReimbursementBatch $batch): JsonResponse
    {
        $org = $this->getOrganization();
        if ($batch->organization_id !== $org->id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        return response()->json([
            'data' => $batch->load(['expenses.user', 'expenses.category', 'createdByUser']),
        ]);
    }

    public function execute(Request $request, ReimbursementBatch $batch): JsonResponse
    {
        $org = $this->getOrganization();
        if ($batch->organization_id !== $org->id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $this->reimbursementService->executeBatchPayout($batch, $request->user());

        return response()->json([
            'message' => 'Batch payout executed successfully.',
            'data' => $batch->fresh('expenses'),
        ]);
    }

    public function markReimbursed(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'expense_uuids' => ['required', 'array', 'min:1'],
            'expense_uuids.*' => ['required', 'string', 'uuid'],
            'payment_reference' => ['required', 'string', 'max:255'],
            'transaction_hash' => ['nullable', 'string', 'max:255'],
        ]);

        $org = $this->getOrganization();
        $count = $this->reimbursementService->markAsReimbursed(
            org: $org,
            actor: $request->user(),
            expenseUuids: $validated['expense_uuids'],
            paymentRef: $validated['payment_reference'],
            txHash: $validated['transaction_hash'] ?? null
        );

        return response()->json([
            'message' => "{$count} expense(s) marked as reimbursed.",
        ]);
    }

    public function downloadBankFile(Request $request, ReimbursementBatch $batch): Response
    {
        $org = $this->getOrganization();
        if ($batch->organization_id !== $org->id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
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
}
