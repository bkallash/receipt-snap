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
        $token = $user->currentAccessToken();
        if ($token && isset($token->abilities) && is_array($token->abilities)) {
            foreach ($token->abilities as $ability) {
                if (is_string($ability) && str_starts_with($ability, 'org:')) {
                    $organizationId = (int) substr($ability, 4);
                    break;
                }
            }
        }

        // 2. Check X-Organization-Id header if provided by frontend
        if (! $organizationId && $request->hasHeader('X-Organization-Id')) {
            $organizationId = (int) $request->header('X-Organization-Id');
        }

        // 3. Fallback to session / default org for web or token without explicit ability
        if (! $organizationId) {
            $sessionOrgId = session('current_organization_id');
            if ($sessionOrgId) {
                $organizationId = (int) $sessionOrgId;
            } else {
                $firstOrg = $user->organizations()->wherePivot('is_active', true)->first()
                    ?? $user->organizations()->first();
                $organizationId = $firstOrg ? (int) $firstOrg->getKey() : null;
            }
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
