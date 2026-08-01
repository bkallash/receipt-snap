<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class OrganizationInvitationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => $this->role->value,
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'status' => $this->status->value,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'invited_by' => new UserResource($this->whenLoaded('invitedBy')),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
