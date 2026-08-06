<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AggregateType;
use App\Enums\BudgetPeriod;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

final class ExpenseAggregate extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'aggregate_type',
        'aggregate_id',
        'period',
        'period_start',
        'period_end',
        'currency_code',
        'total_count',
        'draft_count',
        'submitted_count',
        'approved_count',
        'rejected_count',
        'reimbursed_count',
        'total_amount',
        'approved_amount',
        'pending_amount',
        'rejected_amount',
        'flagged_count',
        'avg_amount',
        'max_amount',
    ];

    protected $casts = [
        'aggregate_type' => AggregateType::class,
        'period' => BudgetPeriod::class,
        'period_start' => 'date:Y-m-d',
        'period_end' => 'date:Y-m-d',
        'total_count' => 'integer',
        'draft_count' => 'integer',
        'submitted_count' => 'integer',
        'approved_count' => 'integer',
        'rejected_count' => 'integer',
        'reimbursed_count' => 'integer',
        'flagged_count' => 'integer',
        'total_amount' => 'decimal:2',
        'approved_amount' => 'decimal:2',
        'pending_amount' => 'decimal:2',
        'rejected_amount' => 'decimal:2',
        'avg_amount' => 'decimal:2',
        'max_amount' => 'decimal:2',
    ];

    /**
     * @param  Builder<ExpenseAggregate>  $query
     * @return Builder<ExpenseAggregate>
     */
    public function scopeForOrganization(Builder $query): Builder
    {
        return $query->where('aggregate_type', AggregateType::Organization->value)
            ->whereNull('aggregate_id');
    }

    /**
     * @param  Builder<ExpenseAggregate>  $query
     * @return Builder<ExpenseAggregate>
     */
    public function scopeForDepartment(Builder $query, int $departmentId): Builder
    {
        return $query->where('aggregate_type', AggregateType::Department->value)
            ->where('aggregate_id', $departmentId);
    }

    /**
     * @param  Builder<ExpenseAggregate>  $query
     * @return Builder<ExpenseAggregate>
     */
    public function scopeForCategory(Builder $query, int $categoryId): Builder
    {
        return $query->where('aggregate_type', AggregateType::Category->value)
            ->where('aggregate_id', $categoryId);
    }

    /**
     * @param  Builder<ExpenseAggregate>  $query
     * @return Builder<ExpenseAggregate>
     */
    public function scopeForPeriod(Builder $query, BudgetPeriod|string $period): Builder
    {
        $val = $period instanceof BudgetPeriod ? $period->value : $period;

        return $query->where('period', $val);
    }

    /**
     * @param  Builder<ExpenseAggregate>  $query
     * @return Builder<ExpenseAggregate>
     */
    public function scopeForDateRange(Builder $query, string $startDate, string $endDate): Builder
    {
        return $query->where('period_start', '>=', $startDate)
            ->where('period_end', '<=', $endDate);
    }
}
