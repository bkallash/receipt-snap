import React, { useState, FormEvent } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/portal/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Gauge, Save, Settings as SettingsIcon, Trash2 } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface SettingsProps {
    organization: {
        id: number;
        name: string;
        slug: string;
        plan_tier: string | null;
        logo_path: string | null;
    };
    settings: {
        default_currency: string;
        locale: string;
        timezone: string;
        date_format: string;
        require_receipt_threshold: number;
        flag_weekend_transactions: boolean;
        strict_budget_enforcement: boolean;
        auto_approve_threshold: number;
    };
    aiQuota: {
        used: number;
        limit: number | null;
        is_unlimited: boolean;
        resets_at: string | null;
    };
    currencies: string[];
    timezones: string[];
    dateFormats: Option[];
    isOwner: boolean;
    administeredOrganizations: Array<{ id: number; name: string; slug: string; role: string | null }>;
}

export default function Settings({
    organization,
    settings,
    aiQuota,
    currencies,
    timezones,
    dateFormats,
    isOwner,
    administeredOrganizations,
}: SettingsProps) {
    const page = usePage<{ flash?: { success?: string; error?: string }; errors: Record<string, string> }>();
    const flash = page.props.flash;
    const errors = page.props.errors;

    const [name, setName] = useState(organization.name);
    const [defaultCurrency, setDefaultCurrency] = useState(settings.default_currency);
    const [locale, setLocale] = useState(settings.locale);
    const [timezone, setTimezone] = useState(settings.timezone);
    const [dateFormat, setDateFormat] = useState(settings.date_format);
    const [requireReceiptThreshold, setRequireReceiptThreshold] = useState(settings.require_receipt_threshold ?? 25.0);
    const [flagWeekendTransactions, setFlagWeekendTransactions] = useState(settings.flag_weekend_transactions ?? true);
    const [strictBudgetEnforcement, setStrictBudgetEnforcement] = useState(settings.strict_budget_enforcement ?? false);
    const [autoApproveThreshold, setAutoApproveThreshold] = useState(settings.auto_approve_threshold ?? 0.0);
    const [processing, setProcessing] = useState(false);

    const [confirmName, setConfirmName] = useState('');
    const [showDanger, setShowDanger] = useState(false);

    const formatDate = (iso: string | null) =>
        iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        router.put(
            '/admin/settings',
            {
                name,
                default_currency: defaultCurrency,
                locale,
                timezone,
                date_format: dateFormat,
                require_receipt_threshold: requireReceiptThreshold,
                flag_weekend_transactions: flagWeekendTransactions,
                strict_budget_enforcement: strictBudgetEnforcement,
                auto_approve_threshold: autoApproveThreshold,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            }
        );
    };

    const deleteOrganization = (e: FormEvent) => {
        e.preventDefault();
        if (confirmName !== organization.name) return;
        if (!confirm('This will permanently delete the organization. Are you absolutely sure?')) return;
        setProcessing(true);
        router.delete('/admin/settings/organization', {
            data: { confirm_name: confirmName },
            onFinish: () => setProcessing(false),
        });
    };

    const quotaPct =
        aiQuota.is_unlimited || aiQuota.limit === null || aiQuota.limit === 0
            ? 0
            : Math.min((aiQuota.used / aiQuota.limit) * 100, 100);

    return (
        <AdminLayout title="Settings">
            <AdminPageHeader
                organization={organization}
                administeredOrganizations={administeredOrganizations}
                title="Organization settings"
                subtitle="Manage organization details, regional defaults, and AI usage."
            />

            {flash?.success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}
            {flash?.error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 animate-in fade-in">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{flash.error}</span>
                </div>
            )}

            {/* General + regional */}
            <Card className="border-zinc-800 bg-zinc-900/60">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <SettingsIcon className="h-4 w-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-zinc-200">General</h2>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Organization name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                disabled={processing}
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
                            <p className="mt-1 text-[11px] text-zinc-600">Slug: {organization.slug}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="default_currency" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Default currency
                                </label>
                                <select
                                    id="default_currency"
                                    value={defaultCurrency}
                                    onChange={(e) => setDefaultCurrency(e.target.value)}
                                    disabled={processing}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {currencies.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                                {errors.default_currency && <p className="mt-1 text-xs text-rose-400">{errors.default_currency}</p>}
                            </div>

                            <div>
                                <label htmlFor="locale" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Locale
                                </label>
                                <input
                                    id="locale"
                                    type="text"
                                    value={locale}
                                    onChange={(e) => setLocale(e.target.value)}
                                    disabled={processing}
                                    placeholder="en"
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                {errors.locale && <p className="mt-1 text-xs text-rose-400">{errors.locale}</p>}
                            </div>

                            <div>
                                <label htmlFor="timezone" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Timezone
                                </label>
                                <select
                                    id="timezone"
                                    value={timezone}
                                    onChange={(e) => setTimezone(e.target.value)}
                                    disabled={processing}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {timezones.map((tz) => (
                                        <option key={tz} value={tz}>
                                            {tz}
                                        </option>
                                    ))}
                                </select>
                                {errors.timezone && <p className="mt-1 text-xs text-rose-400">{errors.timezone}</p>}
                            </div>

                            <div>
                                <label htmlFor="date_format" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Date format
                                </label>
                                 <select
                                    id="date_format"
                                    value={dateFormat}
                                    onChange={(e) => setDateFormat(e.target.value)}
                                    disabled={processing}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {dateFormats.map((f) => (
                                        <option key={f.value} value={f.value}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.date_format && <p className="mt-1 text-xs text-rose-400">{errors.date_format}</p>}
                            </div>
                        </div>

                        {/* Policy & Compliance controls */}
                        <div className="pt-4 border-t border-zinc-800/80">
                            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">Policy & Compliance Rules</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="require_receipt_threshold" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                        Receipt threshold ({defaultCurrency})
                                    </label>
                                    <input
                                        id="require_receipt_threshold"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={requireReceiptThreshold}
                                        onChange={(e) => setRequireReceiptThreshold(parseFloat(e.target.value) || 0)}
                                        disabled={processing}
                                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                    <p className="mt-1 text-[11px] text-zinc-500">Expenses over this amount require receipt attachment.</p>
                                    {errors.require_receipt_threshold && <p className="mt-1 text-xs text-rose-400">{errors.require_receipt_threshold}</p>}
                                </div>

                                <div>
                                    <label htmlFor="auto_approve_threshold" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                        Auto-approve threshold ({defaultCurrency})
                                    </label>
                                    <input
                                        id="auto_approve_threshold"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={autoApproveThreshold}
                                        onChange={(e) => setAutoApproveThreshold(parseFloat(e.target.value) || 0)}
                                        disabled={processing}
                                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    />
                                    <p className="mt-1 text-[11px] text-zinc-500">Auto-approve unflagged claims below this limit (0 = off).</p>
                                    {errors.auto_approve_threshold && <p className="mt-1 text-xs text-rose-400">{errors.auto_approve_threshold}</p>}
                                </div>
                            </div>

                            <div className="mt-4 space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={flagWeekendTransactions}
                                        onChange={(e) => setFlagWeekendTransactions(e.target.checked)}
                                        disabled={processing}
                                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-400"
                                    />
                                    <div>
                                        <span className="text-xs font-medium text-zinc-200">Flag weekend transactions</span>
                                        <p className="text-[11px] text-zinc-500">Automatically flag expenses dated on Saturday or Sunday for manager review.</p>
                                    </div>
                                </label>

                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={strictBudgetEnforcement}
                                        onChange={(e) => setStrictBudgetEnforcement(e.target.checked)}
                                        disabled={processing}
                                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-400"
                                    />
                                    <div>
                                        <span className="text-xs font-medium text-zinc-200">Strict budget enforcement</span>
                                        <p className="text-[11px] text-zinc-500">Block submission if expense exceeds available department or category budget.</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                disabled={processing || !name.trim()}
                                className="h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-zinc-950 text-sm font-semibold gap-1.5"
                            >
                                <Save className="h-3.5 w-3.5" />
                                Save changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* AI quota */}
            <Card className="border-zinc-800 bg-zinc-900/60">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Gauge className="h-4 w-4 text-emerald-400" />
                        <h2 className="text-sm font-bold text-zinc-200">AI usage</h2>
                        {organization.plan_tier && (
                            <span className="ml-auto inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400 capitalize">
                                {organization.plan_tier} plan
                            </span>
                        )}
                    </div>

                    {aiQuota.is_unlimited ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-300">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Unlimited AI processing on this plan.</span>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-zinc-400">Documents processed this cycle</span>
                                <span className="font-medium text-zinc-200">
                                    {aiQuota.used} / {aiQuota.limit ?? '∞'}
                                </span>
                            </div>
                            <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                    className={`absolute inset-y-0 left-0 rounded-full ${
                                        quotaPct >= 90 ? 'bg-rose-500' : quotaPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${quotaPct}%` }}
                                />
                            </div>
                            {aiQuota.resets_at && (
                                <p className="text-[11px] text-zinc-600">Resets on {formatDate(aiQuota.resets_at)}</p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Danger zone (owner only) */}
            {isOwner && (
                <Card className="border-rose-900/40 bg-rose-950/20">
                    <CardContent className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-rose-400" />
                            <h2 className="text-sm font-bold text-rose-300">Danger zone</h2>
                        </div>
                        <p className="text-xs text-rose-200/70 mb-4">
                            Deleting the organization removes all members, departments, categories, and expenses. This
                            action cannot be undone.
                        </p>

                        {!showDanger ? (
                            <Button
                                variant="outline"
                                onClick={() => setShowDanger(true)}
                                className="h-9 rounded-lg border-rose-700/50 bg-rose-900/20 hover:bg-rose-800/30 text-rose-300 text-sm font-semibold gap-1.5"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete organization
                            </Button>
                        ) : (
                            <form onSubmit={deleteOrganization} className="space-y-3">
                                <div>
                                    <label htmlFor="confirm_name" className="block text-xs font-medium text-rose-200/80 mb-1.5">
                                        Type <span className="font-bold text-rose-300">{organization.name}</span> to confirm
                                    </label>
                                    <input
                                        id="confirm_name"
                                        type="text"
                                        value={confirmName}
                                        onChange={(e) => setConfirmName(e.target.value)}
                                        disabled={processing}
                                        className="w-full max-w-sm rounded-lg border border-rose-800/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-100 placeholder:text-rose-300/40 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                    />
                                    {errors.confirm_name && <p className="mt-1 text-xs text-rose-400">{errors.confirm_name}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="submit"
                                        disabled={processing || confirmName !== organization.name}
                                        className="h-9 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold"
                                    >
                                        Permanently delete
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowDanger(false);
                                            setConfirmName('');
                                        }}
                                        disabled={processing}
                                        className="h-9 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}
        </AdminLayout>
    );
}
