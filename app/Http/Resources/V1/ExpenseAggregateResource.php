<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\ExpenseAggregate;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ExpenseAggregate
 */
final class ExpenseAggregateResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'organization_id' => $this->organization_id,
            'aggregate_type' => $this->aggregate_type->value ?? $this->aggregate_type,
            'aggregate_id' => $this->aggregate_id,
            'period' => $this->period->value ?? $this->period,
            'period_start' => (string) $this->period_start,
            'period_end' => (string) $this->period_end,
            'currency_code' => $this->currency_code,
            'total_count' => $this->total_count,
            'draft_count' => $this->draft_count,
            'submitted_count' => $this->submitted_count,
            'approved_count' => $this->approved_count,
            'rejected_count' => $this->rejected_count,
            'reimbursed_count' => $this->reimbursed_count,
            'total_amount' => (float) $this->total_amount,
            'approved_amount' => (float) $this->approved_amount,
            'pending_amount' => (float) $this->pending_amount,
            'rejected_amount' => (float) $this->rejected_amount,
            'flagged_count' => $this->flagged_count,
            'avg_amount' => (float) $this->avg_amount,
            'max_amount' => (float) $this->max_amount,
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
