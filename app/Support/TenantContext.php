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
            $orgId = session('current_organization_id')
                ?? $user->organizations()->wherePivot('is_active', true)->first()?->id
                ?? $user->organizations()->first()?->id;

            if ($orgId) {
                self::$organizationId = (int) $orgId;

                return self::$organizationId;
            }
        }

        return null;
    }

    public static function clear(): void
    {
        self::$organizationId = null;
    }
}
