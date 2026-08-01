<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Exceptions\TenantContextMissingException;
use App\Models\Organization;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope('organization', function (Builder $builder): void {
            if ($orgId = TenantContext::get()) {
                $builder->where($builder->getModel()->getTable().'.organization_id', $orgId);
            }
        });

        static::creating(function (Model $model): void {
            if (! $model->organization_id) {
                $orgId = TenantContext::get();

                if (! $orgId) {
                    throw new TenantContextMissingException(static::class);
                }

                $model->organization_id = $orgId;
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
