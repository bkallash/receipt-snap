<?php

declare(strict_types=1);

namespace App\Jobs\Concerns;

use App\Exceptions\TenantContextMissingException;
use App\Support\TenantContext;

trait WithTenantContext
{
    protected int $organizationId;

    public function captureTenantContext(): static
    {
        $this->organizationId = TenantContext::get()
            ?? throw new TenantContextMissingException(static::class);

        return $this;
    }

    protected function bindTenantContext(): void
    {
        TenantContext::set($this->organizationId);
    }
}
