<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class TenantContextMissingException extends RuntimeException
{
    public function __construct(string $modelOrJobClass)
    {
        parent::__construct("Tenant context is missing while attempting to scope or persist model/job: {$modelOrJobClass}");
    }
}
