<?php

declare(strict_types=1);

namespace App\Support;

final class TenantContext
{
    private static ?int $organizationId = null;

    public static function set(int $organizationId): void
    {
        self::$organizationId = $organizationId;
    }

    public static function get(): ?int
    {
        if (self::$organizationId !== null) {
            return self::$organizationId;
        }

        if ($user = auth()->user()) {
            $sessionOrgId = session('current_organization_id');
            if ($sessionOrgId) {
                self::$organizationId = (int) $sessionOrgId;

                return self::$organizationId;
            }

            if ($user instanceof \App\Models\User) {
                $org = $user->organizations()->wherePivot('is_active', true)->first()
                    ?? $user->organizations()->first();

                if ($org) {
                    self::$organizationId = (int) $org->getKey();

                    return self::$organizationId;
                }
            }
        }

        return null;
    }

    public static function clear(): void
    {
        self::$organizationId = null;
    }
}
