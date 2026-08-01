<?php

use App\Enums\PlanTier;
use App\Models\Organization;
use App\Services\AiQuotaService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->aiQuotaService = new AiQuotaService;
});

it('allows scans within free tier limit', function (): void {
    $org = Organization::factory()->create([
        'plan_tier' => PlanTier::Free,
        'ai_scans_used_this_month' => 40,
    ]);

    expect($this->aiQuotaService->checkQuota($org))->toBeTrue()
        ->and($this->aiQuotaService->remainingQuota($org))->toBe(10);
});

it('blocks scans when free tier limit is reached', function (): void {
    $org = Organization::factory()->create([
        'plan_tier' => PlanTier::Free,
        'ai_scans_used_this_month' => 50,
    ]);

    expect($this->aiQuotaService->checkQuota($org))->toBeFalse()
        ->and($this->aiQuotaService->remainingQuota($org))->toBe(0);
});

it('allows unlimited scans for pro tier', function (): void {
    $org = Organization::factory()->create([
        'plan_tier' => PlanTier::Pro,
        'ai_scans_used_this_month' => 500,
    ]);

    expect($this->aiQuotaService->checkQuota($org))->toBeTrue()
        ->and($this->aiQuotaService->remainingQuota($org))->toBeNull();
});

it('increments scan usage correctly', function (): void {
    $org = Organization::factory()->create([
        'plan_tier' => PlanTier::Free,
        'ai_scans_used_this_month' => 5,
    ]);

    $this->aiQuotaService->incrementUsage($org);

    expect($org->fresh()->ai_scans_used_this_month)->toBe(6);
});
