<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class SetOrganizationContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        $organizationId = null;

        // 1. If authenticated via Sanctum API token, extract org:{id} ability
        if ($user->currentAccessToken()) {
            foreach ($user->currentAccessToken()->abilities as $ability) {
                if (str_starts_with($ability, 'org:')) {
                    $organizationId = (int) substr($ability, 4);
                    break;
                }
            }
        }

        // 2. Fallback to session / default org for web or token without explicit ability
        if (! $organizationId) {
            $organizationId = session('current_organization_id')
                ?? $user->organizations()->wherePivot('is_active', true)->first()?->id;
        }

        if (! $organizationId) {
            return response()->json(['message' => 'No active organization context.'], Response::HTTP_FORBIDDEN);
        }

        // Verify active membership in the target organization
        $isMember = $user->organizations()
            ->where('organizations.id', $organizationId)
            ->wherePivot('is_active', true)
            ->exists();

        if (! $isMember) {
            return response()->json(['message' => 'User is not an active member of this organization.'], Response::HTTP_FORBIDDEN);
        }

        TenantContext::set($organizationId);

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        TenantContext::clear();
    }
}
