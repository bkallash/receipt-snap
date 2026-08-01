<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\StoreExpenseCategoryRequest;
use App\Http\Resources\V1\ExpenseCategoryResource;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Services\BudgetService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

final class ExpenseCategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $this->authorize('viewAny', [ExpenseCategory::class, $organization]);

        $categories = ExpenseCategory::orderBy('sort_order')->get();

        return ExpenseCategoryResource::collection($categories);
    }

    public function store(StoreExpenseCategoryRequest $request): JsonResponse
    {
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $this->authorize('create', [ExpenseCategory::class, $organization]);

        $category = ExpenseCategory::create($request->validated());

        return (new ExpenseCategoryResource($category))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(ExpenseCategory $category): ExpenseCategoryResource
    {
        return new ExpenseCategoryResource($category);
    }

    public function update(StoreExpenseCategoryRequest $request, ExpenseCategory $category): ExpenseCategoryResource
    {
        $this->authorize('update', $category);

        $category->update($request->validated());

        return new ExpenseCategoryResource($category);
    }

    public function destroy(ExpenseCategory $category): JsonResponse
    {
        $this->authorize('delete', $category);

        $category->delete();

        return response()->json(['message' => 'Expense category deleted successfully.']);
    }

    public function budgetStatus(Request $request, ExpenseCategory $category, BudgetService $budgetService): JsonResponse
    {
        $this->authorize('view', $category);

        $status = $budgetService->calculateCategoryBudgetStatus($category);

        return response()->json($status);
    }
}
