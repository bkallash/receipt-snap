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
        return self::$organizationId;
    }

    public static function clear(): void
    {
        self::$organizationId = null;
    }
}
