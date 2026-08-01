<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Support\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $orgId = TenantContext::get();
        $pivot = null;

        if ($orgId && $this->relationLoaded('organizations')) {
            $pivot = $this->organizations->firstWhere('id', $orgId)?->pivot;
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'initials' => $this->initials(),
            'role' => $pivot?->role ?? $this->whenPivotLoaded('organization_user', fn () => $this->pivot->role),
            'is_active' => $pivot?->is_active ?? $this->whenPivotLoaded('organization_user', fn () => (bool) $this->pivot->is_active, true),
            'joined_at' => $pivot?->joined_at ?? $this->whenPivotLoaded('organization_user', fn () => $this->pivot->joined_at),
        ];
    }
}
