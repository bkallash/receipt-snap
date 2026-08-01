<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class DepartmentResource extends JsonResource
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
            'budget_amount' => $this->budget_amount,
            'budget_currency' => $this->budget_currency,
            'budget_period' => $this->budget_period?->value,
            'members_count' => $this->whenCounted('members'),
        ];
    }
}
