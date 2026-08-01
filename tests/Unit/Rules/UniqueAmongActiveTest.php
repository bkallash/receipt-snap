<?php

use App\Models\Organization;
use App\Rules\UniqueAmongActive;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('passes when conflicting row is soft deleted', function (): void {
    $org = Organization::factory()->create(['slug' => 'active-slug']);
    $org->delete(); // soft delete

    $rule = new UniqueAmongActive('organizations', 'slug', scopeOrganization: false);
    $failed = false;

    $rule->validate('slug', 'active-slug', function () use (&$failed): void {
        $failed = true;
    });

    expect($failed)->toBeFalse();
});

it('fails when an active row has the same value', function (): void {
    Organization::factory()->create(['slug' => 'active-slug']);

    $rule = new UniqueAmongActive('organizations', 'slug', scopeOrganization: false);
    $failed = false;

    $rule->validate('slug', 'active-slug', function () use (&$failed): void {
        $failed = true;
    });

    expect($failed)->toBeTrue();
});
