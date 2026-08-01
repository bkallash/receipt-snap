<?php

declare(strict_types=1);

namespace App\Enums;

enum PlanTier: string
{
    case Free = 'free';
    case Pro = 'pro';
    case Enterprise = 'enterprise';

    public function aiScanLimit(): ?int
    {
        return match ($this) {
            self::Free => 50,
            self::Pro, self::Enterprise => null,
        };
    }
}
