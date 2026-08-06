<?php

declare(strict_types=1);

namespace App\Http\Controllers\Concerns;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Support\TenantContext;
use Illuminate\Http\Request;

/**
 * Shared organization resolution for the admin console.
 *
 * Every admin page resolves the same active organization, confirms the signed-in
 * user administers it (Owner or Admin), and exposes the workspace switcher list.
 */
trait AdministersOrganization
{
    /**
     * Roles permitted to administer an organization.
     */
    protected const ADMIN_ROLES = [UserRole::Admin, UserRole::Owner];

    /**
     * Resolve the active organization and confirm the user administers it.
     */
    protected function resolveAdministeredOrganization(Request $request): Organization
    {
        $user = $request->user();

        $orgId = TenantContext::get();
        $org = $orgId
            ? $user->organizations()->where('organizations.id', $orgId)->first()
            : $user->currentOrganization();

        if (! $org) {
            abort(403, 'No active organization.');
        }

        if (! in_array($user->roleIn($org), self::ADMIN_ROLES, true)) {
            abort(403, 'Administrator access required.');
        }

        TenantContext::set($org->id);

        return $org;
    }

    /**
     * Organizations this user can administer, for the workspace switcher.
     *
     * @return array<int, array{id: int, name: string, slug: string, role: string|null}>
     */
    protected function administeredOrganizations(Request $request): array
    {
        $user = $request->user();

        return $user->organizations()
            ->wherePivot('is_active', true)
            ->get()
            ->filter(fn (Organization $org): bool => in_array($user->roleIn($org), self::ADMIN_ROLES, true))
            ->map(fn (Organization $org): array => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
                'role' => $user->roleIn($org)?->value,
            ])
            ->values()
            ->all();
    }
}
