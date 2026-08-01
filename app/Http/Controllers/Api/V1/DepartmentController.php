<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\StoreDepartmentRequest;
use App\Http\Resources\V1\DepartmentResource;
use App\Models\Department;
use App\Models\Organization;
use App\Services\BudgetService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

final class DepartmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $this->authorize('viewAny', [Department::class, $organization]);

        $departments = Department::withCount('members')->get();

        return DepartmentResource::collection($departments);
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $this->authorize('create', [Department::class, $organization]);

        $department = Department::create($request->validated());

        return (new DepartmentResource($department))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Department $department): DepartmentResource
    {
        return new DepartmentResource($department->loadCount('members'));
    }

    public function update(StoreDepartmentRequest $request, Department $department): DepartmentResource
    {
        $this->authorize('update', $department);

        $department->update($request->validated());

        return new DepartmentResource($department);
    }

    public function destroy(Department $department): JsonResponse
    {
        $this->authorize('delete', $department);

        $department->delete();

        return response()->json(['message' => 'Department deleted successfully.']);
    }

    public function budgetStatus(Request $request, Department $department, BudgetService $budgetService): JsonResponse
    {
        $this->authorize('view', $department);

        $status = $budgetService->calculateDepartmentBudgetStatus($department);

        return response()->json($status);
    }
}
