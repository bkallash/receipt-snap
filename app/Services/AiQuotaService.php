<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Organization;
use Illuminate\Support\Facades\Cache;

final class AiQuotaService
{
    public function checkQuota(Organization $org): bool
    {
        return $org->hasQuotaRemaining();
    }

    public function incrementUsage(Organization $org): void
    {
        $monthKey = now()->format('Y-m');
        $cachePrefix = config('receipt-snap.quota.cache_prefix', 'ai_quota');
        $key = "{$cachePrefix}:org:{$org->id}:{$monthKey}";

        Cache::increment($key);

        $org->increment('ai_scans_used_this_month');
    }

    public function remainingQuota(Organization $org): ?int
    {
        $limit = $org->ai_scan_monthly_limit ?? $org->plan_tier?->aiScanLimit();

        if ($limit === null) {
            return null; // unlimited
        }

        $remaining = $limit - $org->ai_scans_used_this_month;

        return max(0, $remaining);
    }
}
