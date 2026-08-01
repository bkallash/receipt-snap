<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Services\AiQuotaService;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class CheckAiQuota
{
    public function __construct(
        private readonly AiQuotaService $aiQuotaService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $orgId = TenantContext::get();

        if (! $orgId) {
            return response()->json(['message' => 'No active organization context.'], Response::HTTP_FORBIDDEN);
        }

        $organization = Organization::find($orgId);

        if (! $organization) {
            return response()->json(['message' => 'Organization not found.'], Response::HTTP_NOT_FOUND);
        }

        if (! $this->aiQuotaService->checkQuota($organization)) {
            $limit = $organization->ai_scan_monthly_limit ?? $organization->plan_tier?->aiScanLimit();

            return response()->json([
                'message' => 'Monthly AI scan quota exceeded.',
                'quota_limit' => $limit,
                'quota_used' => $organization->ai_scans_used_this_month,
                'resets_at' => now()->startOfMonth()->addMonth()->toIso8601String(),
                'upgrade_url' => '/billing/upgrade',
            ], Response::HTTP_TOO_MANY_REQUESTS);
        }

        return $next($request);
    }
}
