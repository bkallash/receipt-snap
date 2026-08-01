<?php

declare(strict_types=1);

namespace App\Rules;

use App\Support\TenantContext;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;

final class UniqueAmongActive implements ValidationRule
{
    public function __construct(
        private readonly string $table,
        private readonly string $column = 'name',
        private readonly ?int $ignoreId = null,
        private readonly bool $scopeOrganization = true,
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $query = DB::table($this->table)
            ->where($this->column, $value)
            ->whereNull('deleted_at');

        if ($this->scopeOrganization && ($orgId = TenantContext::get())) {
            $query->where('organization_id', $orgId);
        }

        if ($this->ignoreId !== null) {
            $query->where('id', '!=', $this->ignoreId);
        }

        if ($query->exists()) {
            $fail("The {$attribute} has already been taken.");
        }
    }
}
