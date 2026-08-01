<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\StoreExpenseRequest;
use App\Http\Requests\V1\UpdateExpenseRequest;
use App\Http\Resources\V1\ExpenseResource;
use App\Jobs\ProcessReceiptScan;
use App\Models\Expense;
use App\Models\Organization;
use App\Services\ExpenseService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

final class ExpenseController extends Controller
{
    public function __construct(
        private readonly ExpenseService $expenseService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $this->authorize('viewAny', [Expense::class, $organization]);

        $query = Expense::with(['user', 'category', 'receiptImages', 'receipt', 'lineItems']);

        $role = $user->roleIn($organization);
        if ($role === UserRole::Employee) {
            $query->forUser($user->id);
        }

        if ($status = $request->query('status')) {
            $query->byStatus($status);
        }

        if ($request->boolean('flagged')) {
            $query->flagged();
        }

        $expenses = $query->latest('expense_date')->paginate(20);

        return ExpenseResource::collection($expenses);
    }

    public function store(StoreExpenseRequest $request): JsonResponse
    {
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $this->authorize('create', [Expense::class, $organization]);

        $images = $request->file('receipt_images', []);
        $expense = $this->expenseService->createExpense($request->user(), $request->validated(), $images);

        if (! empty($images)) {
            ProcessReceiptScan::dispatch($expense->id);
        }

        return (new ExpenseResource($expense->load(['user', 'category', 'receiptImages', 'receipt', 'lineItems'])))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Expense $expense): ExpenseResource
    {
        $this->authorize('view', $expense);

        return new ExpenseResource($expense->load(['user', 'category', 'receiptImages', 'receipt', 'lineItems', 'approvalSteps.approver']));
    }

    public function update(UpdateExpenseRequest $request, Expense $expense): ExpenseResource
    {
        $expense->update($request->validated());

        return new ExpenseResource($expense->load(['user', 'category', 'receiptImages', 'receipt', 'lineItems']));
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $this->authorize('delete', $expense);

        $expense->delete();

        return response()->json(['message' => 'Expense deleted successfully.']);
    }

    public function submit(Expense $expense): ExpenseResource
    {
        $this->authorize('submit', $expense);

        $expense = $this->expenseService->submitExpense($expense);

        return new ExpenseResource($expense);
    }

    public function approve(Request $request, Expense $expense): ExpenseResource
    {
        $this->authorize('approve', $expense);

        $comment = $request->input('comment');
        $expense = $this->expenseService->approveExpense($expense, $request->user(), $comment);

        return new ExpenseResource($expense);
    }

    public function reject(Request $request, Expense $expense): ExpenseResource
    {
        $this->authorize('reject', $expense);

        $request->validate(['reason' => ['required', 'string', 'max:1000']]);

        $expense = $this->expenseService->rejectExpense($expense, $request->user(), $request->input('reason'));

        return new ExpenseResource($expense);
    }

    public function adminCorrect(Request $request, Expense $expense): ExpenseResource
    {
        $this->authorize('adminCorrect', $expense);

        $data = $request->validate([
            'expense_category_id' => ['nullable', 'integer', 'exists:expense_categories,id'],
            'description' => ['nullable', 'string', 'max:2000'],
            'metadata' => ['nullable', 'array'],
        ]);

        $expense = $this->expenseService->adminCorrectExpense($expense, $data);

        return new ExpenseResource($expense);
    }
}
