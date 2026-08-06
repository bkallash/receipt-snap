<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class AuditLogService
{
    /**
     * Record an immutable audit log entry.
     *
     * @param  array<string, mixed>|null  $beforeState
     * @param  array<string, mixed>|null  $afterState
     * @param  array<string, mixed>  $metadata
     */
    public function record(
        AuditAction $action,
        Model $auditable,
        ?array $beforeState = null,
        ?array $afterState = null,
        ?User $actor = null,
        array $metadata = []
    ): ?AuditLog {
        if (! config('receipt-snap.audit.enabled', true)) {
            return null;
        }

        try {
            $orgId = TenantContext::get() ?? $auditable->getAttribute('organization_id');

            if (! $orgId) {
                Log::warning('AuditLog missing organization context', [
                    'action' => $action->value,
                    'auditable_type' => get_class($auditable),
                    'auditable_id' => $auditable->getKey(),
                ]);

                return null;
            }

            $resolvedActor = $actor ?? auth()->user();
            $actorId = $resolvedActor?->id;

            if (config('receipt-snap.audit.capture_ip', true) && request()->ip()) {
                $metadata['ip_address'] = request()->ip();
            }

            if (config('receipt-snap.audit.capture_user_agent', true) && request()->userAgent()) {
                $metadata['user_agent'] = request()->userAgent();
            }

            $checksumPayload = json_encode([
                'action' => $action->value,
                'auditable_type' => get_class($auditable),
                'auditable_id' => $auditable->getKey(),
                'before_state' => $beforeState,
                'after_state' => $afterState,
                'organization_id' => $orgId,
                'actor_id' => $actorId,
            ], JSON_THROW_ON_ERROR);

            $checksum = hash('sha256', $checksumPayload);

            return AuditLog::forceCreate([
                'uuid' => (string) Str::uuid(),
                'organization_id' => $orgId,
                'actor_id' => $actorId,
                'action' => $action->value,
                'auditable_type' => get_class($auditable),
                'auditable_id' => $auditable->getKey(),
                'before_state' => $beforeState,
                'after_state' => $afterState,
                'metadata' => empty($metadata) ? null : $metadata,
                'checksum' => $checksum,
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to record audit log entry', [
                'action' => $action->value,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return null;
        }
    }
}
