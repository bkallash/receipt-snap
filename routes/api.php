<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AccountantExportController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\ExpenseAggregateController;
use App\Http\Controllers\Api\V1\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\OrganizationController;
use App\Http\Controllers\Api\V1\OrganizationInvitationController;
use App\Http\Controllers\Api\V1\OrganizationMemberController;
use App\Http\Controllers\Api\V1\ReceiptScanController;
use App\Http\Controllers\Api\V1\ReimbursementBatchController;
use App\Http\Middleware\CheckAiQuota;
use App\Http\Middleware\EnsureIdempotency;
use App\Http\Middleware\SetOrganizationContext;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    // Public, throttled (Fix G)
    Route::middleware('throttle:6,1')->group(function (): void {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/login', [AuthController::class, 'login']);
    });

    // Invitation acceptance & rejection are token-authenticated
    Route::post('invitations/{token}/accept', [OrganizationInvitationController::class, 'accept'])->middleware('auth:sanctum');
    Route::post('invitations/{token}/reject', [OrganizationInvitationController::class, 'reject'])->middleware('auth:sanctum');

    // Authenticated (Sanctum)
    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('auth/user', [AuthController::class, 'user']);
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::post('auth/switch-organization/{organization}', [AuthController::class, 'switchOrganization']);

        // Organization management
        Route::apiResource('organizations', OrganizationController::class);

        // Org-scoped resources (middleware resolves org context from token ability — Fix B)
        Route::middleware([SetOrganizationContext::class, EnsureIdempotency::class])->group(function (): void {
            Route::apiResource('organizations.invitations', OrganizationInvitationController::class)
                ->scoped()->except(['show', 'update']);
            Route::apiResource('organizations.members', OrganizationMemberController::class)
                ->scoped()->only(['index', 'update', 'destroy']);

            Route::apiResource('departments', DepartmentController::class);
            Route::get('departments/{department}/budget-status', [DepartmentController::class, 'budgetStatus']);

            Route::apiResource('categories', ExpenseCategoryController::class, ['names' => 'categories']);
            Route::get('categories/{category}/budget-status', [ExpenseCategoryController::class, 'budgetStatus']);

            Route::apiResource('expenses', ExpenseController::class);

            // Expense actions
            Route::post('expenses/{expense}/submit', [ExpenseController::class, 'submit']);
            Route::post('expenses/{expense}/approve', [ExpenseController::class, 'approve']);
            Route::post('expenses/{expense}/reject', [ExpenseController::class, 'reject']);
            Route::put('expenses/{expense}/admin-correct', [ExpenseController::class, 'adminCorrect']);

            // Reimbursement & Batch Payout Routes (Accountant / Admin / Owner)
            Route::apiResource('reimbursement-batches', ReimbursementBatchController::class)->only(['index', 'store', 'show']);
            Route::post('reimbursement-batches/{batch}/execute', [ReimbursementBatchController::class, 'execute']);
            Route::get('reimbursement-batches/{batch}/bank-file', [ReimbursementBatchController::class, 'downloadBankFile']);
            Route::post('reimbursements/mark-reimbursed', [ReimbursementBatchController::class, 'markReimbursed']);

            // Accounting & ERP Exports
            Route::get('accountant/export-erp', [AccountantExportController::class, 'exportErp']);
            Route::get('accountant/download-compliance-package', [AccountantExportController::class, 'downloadCompliancePackage']);

            // Receipt scan routes
            Route::post('expenses/{expense}/scan', [ReceiptScanController::class, 'scan'])->middleware(CheckAiQuota::class);
            Route::get('expenses/{expense}/scan-status', [ReceiptScanController::class, 'status']);
            Route::post('expenses/{expense}/scan/retry', [ReceiptScanController::class, 'retry'])->middleware(CheckAiQuota::class);

            // Audit Logs
            Route::get('audit-logs', [AuditLogController::class, 'index']);
            Route::get('audit-logs/{auditLog}', [AuditLogController::class, 'show']);

            // Pre-computed Aggregates
            Route::get('aggregates', [ExpenseAggregateController::class, 'index']);
            Route::get('aggregates/summary', [ExpenseAggregateController::class, 'summary']);
        });
    });
});
