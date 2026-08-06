<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\AggregateType;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ExpenseAggregateResource;
use App\Models\ExpenseAggregate;
use App\Models\Organization;
use App\Services\AggregateService;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class ExpenseAggregateController extends Controller
{
    public function __construct(
        private readonly AggregateService $aggregateService
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $role = $user->roleIn($organization);
        if (! in_array($role, [UserRole::Owner, UserRole::Admin, UserRole::Manager, UserRole::Accountant], true)) {
            abort(403, 'Access restricted to Organization administrators, managers, and accountants.');
        }

        $query = ExpenseAggregate::query();

        if ($type = $request->query('type')) {
            $query->where('aggregate_type', $type);
        }

        if ($period = $request->query('period')) {
            $query->forPeriod($period);
        }

        if ($aggId = $request->query('aggregate_id')) {
            $query->where('aggregate_id', $aggId);
        }

        if ($from = $request->query('from')) {
            $query->where('period_start', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->where('period_end', '<=', $to);
        }

        $aggregates = $query->orderBy('period_start', 'desc')->paginate(25);

        return ExpenseAggregateResource::collection($aggregates);
    }

    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $orgId = TenantContext::get();
        $organization = Organization::findOrFail($orgId);

        $role = $user->roleIn($organization);
        if (! in_array($role, [UserRole::Owner, UserRole::Admin, UserRole::Manager, UserRole::Accountant], true)) {
            abort(403, 'Access restricted to Organization administrators, managers, and accountants.');
        }

        $period = $request->query('period', 'monthly');
        $dateStr = $request->query('date', now()->toDateString());
        $asOfDate = CarbonImmutable::parse($dateStr);

        $periodStart = match ($period) {
            'quarterly' => $asOfDate->startOfQuarter()->toDateString(),
            'annual' => $asOfDate->startOfYear()->toDateString(),
            default => $asOfDate->startOfMonth()->toDateString(),
        };

        // Trigger on-demand sync if org aggregate record doesn't exist
        $orgAggregate = ExpenseAggregate::where('organization_id', $orgId)
            ->where('aggregate_type', AggregateType::Organization->value)
            ->where('period', $period)
            ->where('period_start', $periodStart)
            ->first();

        if (! $orgAggregate) {
            $this->aggregateService->recomputeForOrganization((int) $orgId, $period, $asOfDate);
            $orgAggregate = ExpenseAggregate::where('organization_id', $orgId)
                ->where('aggregate_type', AggregateType::Organization->value)
                ->where('period', $period)
                ->where('period_start', $periodStart)
                ->first();
        }

        $departmentAggregates = ExpenseAggregate::where('organization_id', $orgId)
            ->where('aggregate_type', AggregateType::Department->value)
            ->where('period', $period)
            ->where('period_start', $periodStart)
            ->get();

        $categoryAggregates = ExpenseAggregate::where('organization_id', $orgId)
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
