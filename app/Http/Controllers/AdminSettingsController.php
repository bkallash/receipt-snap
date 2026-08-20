<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Controllers\Concerns\AdministersOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class AdminSettingsController extends Controller
{
    use AdministersOrganization;

    /**
     * Settings the admin console exposes, with their defaults.
     */
    private const SETTING_DEFAULTS = [
        'default_currency' => 'USD',
        'locale' => 'en',
        'timezone' => 'UTC',
        'date_format' => 'Y-m-d',
        'require_receipt_threshold' => 25.0,
        'flag_weekend_transactions' => true,
        'strict_budget_enforcement' => false,
        'auto_approve_threshold' => 0.0,
    ];

    public function edit(Request $request): Response
    {
        $org = $this->resolveAdministeredOrganization($request);

        $settings = array_merge(self::SETTING_DEFAULTS, $org->settings ?? []);
        $isOwner = $request->user()->roleIn($org) === UserRole::Owner;

        $planTier = $org->plan_tier;
        $limit = $org->ai_scan_monthly_limit ?? ($planTier instanceof \App\Enums\PlanTier ? $planTier->aiScanLimit() : null);

        return Inertia::render('Admin/Settings', [
            'organization' => [
                'id' => $org->id,
                'name' => $org->name,
                'slug' => $org->slug,
                'plan_tier' => $planTier instanceof \App\Enums\PlanTier ? $planTier->value : (string) $planTier,
                'logo_path' => $org->logo_path,
            ],
            'settings' => [
                'default_currency' => $settings['default_currency'],
                'locale' => $settings['locale'],
                'timezone' => $settings['timezone'],
                'date_format' => $settings['date_format'],
                'require_receipt_threshold' => (float) $settings['require_receipt_threshold'],
                'flag_weekend_transactions' => (bool) $settings['flag_weekend_transactions'],
                'strict_budget_enforcement' => (bool) $settings['strict_budget_enforcement'],
                'auto_approve_threshold' => (float) $settings['auto_approve_threshold'],
            ],
            'aiQuota' => [
                'used' => (int) $org->ai_scans_used_this_month,
                'limit' => $limit,
                'is_unlimited' => $limit === null,
                'resets_at' => $org->ai_scans_reset_at?->toIso8601String(),
            ],
            'currencies' => ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'INR', 'AED', 'SGD'],
            'timezones' => $this->timezoneOptions(),
            'dateFormats' => [
                ['value' => 'Y-m-d', 'label' => '2026-08-05 (ISO)'],
                ['value' => 'm/d/Y', 'label' => '08/05/2026 (US)'],
                ['value' => 'd/m/Y', 'label' => '05/08/2026 (EU)'],
                ['value' => 'd M Y', 'label' => '05 Aug 2026'],
            ],
            'isOwner' => $isOwner,
            'administeredOrganizations' => $this->administeredOrganizations($request),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'default_currency' => ['required', 'string', 'size:3'],
            'locale' => ['required', 'string', 'max:10'],
            'timezone' => ['required', 'string', 'max:64', 'timezone'],
            'date_format' => ['required', 'string', 'max:32'],
            'require_receipt_threshold' => ['required', 'numeric', 'min:0'],
            'flag_weekend_transactions' => ['required', 'boolean'],
            'strict_budget_enforcement' => ['required', 'boolean'],
            'auto_approve_threshold' => ['required', 'numeric', 'min:0'],
        ]);

        $settings = array_merge($org->settings ?? [], [
            'default_currency' => strtoupper($data['default_currency']),
            'locale' => $data['locale'],
            'timezone' => $data['timezone'],
            'date_format' => $data['date_format'],
            'require_receipt_threshold' => (float) $data['require_receipt_threshold'],
            'flag_weekend_transactions' => (bool) $data['flag_weekend_transactions'],
            'strict_budget_enforcement' => (bool) $data['strict_budget_enforcement'],
            'auto_approve_threshold' => (float) $data['auto_approve_threshold'],
        ]);

        $org->update([
            'name' => $data['name'],
            'settings' => $settings,
        ]);

        return back()->with('success', 'Organization settings saved.');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        // Deleting the organization is owner-only; admins cannot.
        if ($request->user()->roleIn($org) !== UserRole::Owner) {
            abort(403, 'Only the owner can delete the organization.');
        }

        $data = $request->validate([
            'confirm_name' => ['required', 'string'],
        ]);

        if ($data['confirm_name'] !== $org->name) {
            return back()->with('error', 'The name you typed did not match. Organization was not deleted.');
        }

        $org->delete();
        $request->session()->forget('current_organization_id');

        return redirect()->route('dashboard')->with('success', "Organization '{$org->name}' was deleted.");
    }

    /**
     * A curated shortlist plus every IANA zone, deduped.
     *
     * @return array<int, string>
     */
    private function timezoneOptions(): array
    {
        $common = ['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney'];

        return array_values(array_unique(array_merge($common, timezone_identifiers_list())));
    }
}
