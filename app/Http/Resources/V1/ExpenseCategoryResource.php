<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\ExpenseCategory
 */
final class ExpenseCategoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'icon' => $this->icon,
            'color' => $this->color,
            'is_active' => $this->is_active,
            'max_amount' => $this->max_amount,
            'budget_amount' => $this->budget_amount,
            'budget_currency' => $this->budget_currency,
            'budget_period' => $this->budget_period?->value,
            'sort_order' => $this->sort_order,
        ];
    }
}
