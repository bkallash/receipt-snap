<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Expense;
use App\Models\ReceiptImage;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;

final class DuplicateDetectionService
{
    /**
     * Check if an uploaded image is a duplicate based on hash.
     */
    public function checkImageDuplicate(?string $perceptualHash): ?ReceiptImage
    {
        if (! $perceptualHash) {
            return null;
        }

        $orgId = TenantContext::get();
        if (! $orgId) {
            return null;
        }

        return ReceiptImage::whereHas('expense', fn ($q) => $q->where('organization_id', $orgId))
            ->where('perceptual_hash', $perceptualHash)
            ->first();
    }

    /**
     * Check if expense data matches an existing expense within look-back window.
     */
    public function checkDataDuplicate(float $amount, ?string $merchantName, ?string $expenseDate, ?int $excludeExpenseId = null): ?Expense
    {
        if (! $merchantName || ! $expenseDate) {
            return null;
        }

        $windowDays = (int) config('receipt-snap.duplicate_detection.data_match_window_days', 30);
        $date = CarbonImmutable::parse($expenseDate);

        $term = mb_strtolower($merchantName);

        $query = Expense::where('amount', $amount)
            ->whereRaw('LOWER(merchant_name) LIKE ?', [$term])
            ->whereBetween('expense_date', [
                $date->subDays($windowDays)->toDateString(),
                $date->addDays($windowDays)->toDateString(),
            ]);

        if ($excludeExpenseId) {
            $query->where('id', '!=', $excludeExpenseId);
        }

        return $query->first();
    }
}
