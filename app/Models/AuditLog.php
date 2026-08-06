<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\AuditAction;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

final class AuditLog extends Model
{
    use BelongsToOrganization;

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'action' => AuditAction::class,
        'before_state' => 'array',
        'after_state' => 'array',
        'metadata' => 'array',
        'created_at' => 'immutable_datetime',
    ];

    protected $appends = [
        'ip_address',
        'user_agent',
        'old_values',
        'new_values',
    ];

    public function getIpAddressAttribute(): ?string
    {
        return is_array($this->metadata) ? ($this->metadata['ip_address'] ?? null) : null;
    }

    public function getUserAgentAttribute(): ?string
    {
        return is_array($this->metadata) ? ($this->metadata['user_agent'] ?? null) : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getOldValuesAttribute(): ?array
    {
        return $this->before_state;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getNewValuesAttribute(): ?array
    {
        return $this->after_state;
    }

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    /**
     * @return MorphTo<Model, $this>
     */
    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * @param  Builder<AuditLog>  $query
     * @return Builder<AuditLog>
     */
    public function scopeForAuditable(Builder $query, string $type, int $id): Builder
    {
        return $query->where('auditable_type', $type)->where('auditable_id', $id);
    }

    /**
     * @param  Builder<AuditLog>  $query
     * @return Builder<AuditLog>
     */
    public function scopeByAction(Builder $query, AuditAction|string $action): Builder
    {
        $value = $action instanceof AuditAction ? $action->value : $action;

        return $query->where('action', $value);
    }

    /**
     * @param  Builder<AuditLog>  $query
     * @return Builder<AuditLog>
     */
    public function scopeByActor(Builder $query, int $actorId): Builder
    {
        return $query->where('actor_id', $actorId);
    }

    /**
     * @param  Builder<AuditLog>  $query
     * @return Builder<AuditLog>
     */
    public function scopeDateRange(Builder $query, ?string $from = null, ?string $to = null): Builder
    {
        if ($from) {
            $query->where('created_at', '>=', $from);
        }

        if ($to) {
            $query->where('created_at', '<=', $to);
        }

        return $query;
    }

    public function isChecksumValid(): bool
    {
        $payload = json_encode([
            'action' => $this->action->value,
            'auditable_type' => $this->auditable_type,
            'auditable_id' => $this->auditable_id,
            'before_state' => $this->before_state,
            'after_state' => $this->after_state,
            'organization_id' => $this->organization_id,
            'actor_id' => $this->actor_id,
        ], JSON_THROW_ON_ERROR);

        return hash('sha256', $payload) === $this->checksum;
    }

    public function update(array $attributes = [], array $options = []): bool
    {
        throw new \RuntimeException('Audit log records are immutable and cannot be updated.');
    }

    public function delete(): ?bool
    {
        throw new \RuntimeException('Audit log records are immutable and cannot be deleted.');
    }
}
