<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ExpenseStatus;
use App\Http\Resources\V1\ExpenseCategoryResource;
use App\Http\Resources\V1\ExpenseResource;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\ReceiptImage;
use App\Support\TenantContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

final class EmployeePortalController extends Controller
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

        if ($user->isManagerOf($activeOrg)) {
            return redirect()->route('portal.manager.expenses');
        }

        if (! $user->isEmployeeOf($activeOrg)) {
            abort(403, 'Access to this page is restricted to users with the Employee role.');
        }

        $expenses = Expense::where('user_id', $user->id)
            ->with(['user', 'category', 'receiptImages', 'receipt', 'lineItems', 'approvalSteps.approver'])
            ->latest('expense_date')
            ->latest('id')
            ->get();

        // Fallback: If no expenses found for active tenant, check expenses across user's organizations
        if ($expenses->isEmpty()) {
            $userOrgIds = $user->organizations()->pluck('organizations.id')->all();
            $expenses = Expense::withoutGlobalScopes()
                ->where('user_id', $user->id)
                ->when(! empty($userOrgIds), fn ($q) => $q->whereIn('organization_id', $userOrgIds))
                ->with(['user', 'category', 'receiptImages', 'receipt', 'lineItems', 'approvalSteps.approver'])
                ->latest('expense_date')
                ->latest('id')
                ->get();
        }

        $categories = ExpenseCategory::where('is_active', true)->get();

        $totalClaimed = (float) $expenses->sum('amount');
        $pendingAmount = (float) $expenses->filter(fn ($e) => in_array($e->status, [ExpenseStatus::Submitted, ExpenseStatus::UnderReview], true))->sum('amount');
        $approvedAmount = (float) $expenses->filter(fn ($e) => $e->status === ExpenseStatus::Approved)->sum('amount');
        $draftsCount = $expenses->filter(fn ($e) => $e->status === ExpenseStatus::Draft || $e->status === ExpenseStatus::PendingScan)->count();
        $pendingCount = $expenses->filter(fn ($e) => in_array($e->status, [ExpenseStatus::Submitted, ExpenseStatus::UnderReview], true))->count();
        $approvedCount = $expenses->filter(fn ($e) => $e->status === ExpenseStatus::Approved)->count();
        $rejectedCount = $expenses->filter(fn ($e) => $e->status === ExpenseStatus::Rejected)->count();

        return Inertia::render('Dashboard', [
            'expenses' => ExpenseResource::collection($expenses)->resolve(),
            'categories' => ExpenseCategoryResource::collection($categories)->resolve(),
            'stats' => [
                'total_claimed' => $totalClaimed,
                'pending_amount' => $pendingAmount,
                'approved_amount' => $approvedAmount,
                'drafts_count' => $draftsCount,
                'pending_count' => $pendingCount,
                'approved_count' => $approvedCount,
                'rejected_count' => $rejectedCount,
                'total_count' => $expenses->count(),
            ],
            'organization' => [
                'id' => $activeOrg->id,
                'name' => $activeOrg->name,
                'slug' => $activeOrg->slug,
            ],
        ]);
    }

    public function showReceiptImage(Request $request, ReceiptImage $receiptImage): \Symfony\Component\HttpFoundation\Response
    {
        $user = $request->user();
        $expense = $receiptImage->expense;

        if (! $expense instanceof Expense) {
            abort(404, 'Expense not found for image.');
        }

        if ($user->id !== $expense->user_id && ! $user->organizations()->where('organizations.id', $expense->organization_id)->exists()) {
            abort(403, 'Unauthorized access to receipt image.');
        }

        $disk = $receiptImage->disk ?: 'local';
        if (! Storage::disk($disk)->exists($receiptImage->file_path)) {
            abort(404, 'Receipt image file not found.');
        }

        $fullPath = Storage::disk($disk)->path($receiptImage->file_path);

        return response()->file($fullPath, [
            'Content-Type' => $receiptImage->mime_type ?: 'image/jpeg',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }
}
