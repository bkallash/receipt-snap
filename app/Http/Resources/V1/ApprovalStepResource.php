<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\ApprovalStep
 */
final class ApprovalStepResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'approver' => new UserResource($this->whenLoaded('approver')),
            'step_order' => $this->step_order,
            'status' => $this->status->value,
            'comment' => $this->comment,
            'acted_at' => $this->acted_at?->toIso8601String(),
        ];
    }
}
