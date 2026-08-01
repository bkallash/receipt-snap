<?php

use App\Exceptions\TenantContextMissingException;
use App\Models\Department;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('filters models by organization_id global scope', function (): void {
    $orgA = Organization::factory()->create();
    $orgB = Organization::factory()->create();

    TenantContext::set($orgA->id);
    Department::factory()->create(['organization_id' => $orgA->id, 'name' => 'Dept A']);

    TenantContext::set($orgB->id);
    Department::factory()->create(['organization_id' => $orgB->id, 'name' => 'Dept B']);

    TenantContext::set($orgA->id);
    $depts = Department::all();

    expect($depts)->toHaveCount(1)
        ->and($depts->first()->name)->toBe('Dept A');
});

it('throws TenantContextMissingException when creating model without context', function (): void {
    TenantContext::clear();

    ExpenseCategory::create([
        'name' => 'Marketing',
    ]);
})->throws(TenantContextMissingException::class);
