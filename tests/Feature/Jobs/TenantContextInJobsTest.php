<?php

use App\Exceptions\TenantContextMissingException;
use App\Jobs\Concerns\WithTenantContext;
use App\Models\Organization;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

class DummyTenantJob
{
    use WithTenantContext;

    public function __construct()
    {
        $this->captureTenantContext();
    }

    public function handle(): void
    {
        $this->bindTenantContext();
    }
}

it('captures tenant context at dispatch and binds inside handle', function (): void {
    $org = Organization::factory()->create();
    TenantContext::set($org->id);

    $job = new DummyTenantJob;

    TenantContext::clear();
    $this->assertNull(TenantContext::get());

    $job->handle();
    $this->assertEquals($org->id, TenantContext::get());
});

it('throws TenantContextMissingException when dispatched without context bound', function (): void {
    TenantContext::clear();

    new DummyTenantJob;
})->throws(TenantContextMissingException::class);
