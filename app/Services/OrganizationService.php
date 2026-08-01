<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\UserRole;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;

final class OrganizationService
{
    /**
     * Create an organization and assign the creator as Owner.
     */
    public function createOrganization(User $user, array $data): Organization
    {
        return DB::transaction(function () use ($user, $data): Organization {
            $organization = Organization::create([
                'name' => $data['name'],
                'slug' => $data['slug'] ?? Organization::generateUniqueSlug($data['name']),
                'logo_path' => $data['logo_path'] ?? null,
                'settings' => $data['settings'] ?? null,
            ]);

            $organization->users()->attach($user->id, [
                'role' => UserRole::Owner->value,
                'is_active' => true,
                'joined_at' => now(),
            ]);

            TenantContext::set($organization->id);

            return $organization;
        });
    }

    public function updateMemberRole(Organization $organization, User $targetUser, UserRole $newRole, ?int $departmentId = null): void
    {
        $attributes = ['role' => $newRole->value, 'updated_at' => now()];
        if ($departmentId !== null) {
            $attributes['department_id'] = $departmentId;
        }

        DB::table('organization_user')
            ->where('organization_id', $organization->id)
            ->where('user_id', $targetUser->id)
            ->update($attributes);
    }

    public function removeMember(Organization $organization, User $targetUser): void
    {
        // Protect last owner
        $ownersCount = DB::table('organization_user')
            ->where('organization_id', $organization->id)
            ->where('role', UserRole::Owner->value)
            ->where('is_active', true)
            ->count();

        $isOwner = $targetUser->roleIn($organization) === UserRole::Owner;

        if ($isOwner && $ownersCount <= 1) {
            throw new \RuntimeException('Cannot remove the last owner of the organization.');
        }

        DB::table('organization_user')
            ->where('organization_id', $organization->id)
            ->where('user_id', $targetUser->id)
            ->delete();

        // Revoke Sanctum tokens scoped to this org
        DB::table('personal_access_tokens')
            ->where('tokenable_type', $targetUser->getMorphClass())
            ->where('tokenable_id', $targetUser->id)
            ->where('abilities', 'like', "%org:{$organization->id}%")
            ->delete();
    }
}
