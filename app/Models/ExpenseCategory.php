<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\BudgetPeriod;
use App\Models\Concerns\BelongsToOrganization;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class ExpenseCategory extends Model
{
    use BelongsToOrganization, HasFactory, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'gl_code',
        'default_tax_rate',
        'requires_itemized_tax',
        'description',
        'icon',
        'color',
        'is_active',
        'max_amount',
        'budget_amount',
        'budget_currency',
        'budget_period',
        'sort_order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'requires_itemized_tax' => 'boolean',
        'max_amount' => 'decimal:2',
        'default_tax_rate' => 'decimal:2',
        'budget_amount' => 'decimal:2',
        'budget_period' => BudgetPeriod::class,
        'sort_order' => 'integer',
    ];

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Get the start and end dates for the current budget period.
     *
     * @return array{0: string, 1: string}
     */
    public function getCurrentPeriodRange(?CarbonImmutable $asOfDate = null): array
    {
        $date = $asOfDate ?? CarbonImmutable::now();
        $period = $this->budget_period ?? BudgetPeriod::Monthly;

        return match ($period) {
            BudgetPeriod::Quarterly => [
                $date->startOfQuarter()->startOfDay()->toDateTimeString(),
                $date->endOfQuarter()->endOfDay()->toDateTimeString(),
            ],
            BudgetPeriod::Annual => [
                $date->startOfYear()->startOfDay()->toDateTimeString(),
                $date->endOfYear()->endOfDay()->toDateTimeString(),
            ],
            default => [
                $date->startOfMonth()->startOfDay()->toDateTimeString(),
                $date->endOfMonth()->endOfDay()->toDateTimeString(),
            ],
        };
    }
}
