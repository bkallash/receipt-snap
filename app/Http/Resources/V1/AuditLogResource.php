<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuditLog
 */
final class AuditLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'organization_id' => $this->organization_id,
            'actor' => new UserResource($this->whenLoaded('actor')),
            'action' => $this->action->value ?? $this->action,
            'auditable_type' => class_basename($this->auditable_type),
            'auditable_id' => $this->auditable_id,
            'before_state' => $this->before_state,
            'after_state' => $this->after_state,
            'metadata' => $this->metadata,
            'checksum' => $this->checksum,
            'is_checksum_valid' => $this->isChecksumValid(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
