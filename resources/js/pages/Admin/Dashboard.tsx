import React from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Banknote,
    Building2,
    CheckSquare,
    ClipboardList,
    Clock,
    Download,
    Flag,
    Gauge,
    Mail,
    ScrollText,
    Sparkles,
    Tags,
    TrendingUp,
    UserPlus,
    Users,
    Wallet,
} from 'lucide-react';

interface BudgetItem {
    id: number;
    name: string;
    color?: string | null;
    gl_code?: string | null;
    member_count?: number;
    budget_amount: number | null;
    budget_currency: string;
    budget_period: string;
    spent_amount: number;
    pending_amount: number;
    committed_amount: number;
    remaining_budget: number | null;
    utilization_percentage: number;
}

interface BudgetGroup {
    items: BudgetItem[];
    at_risk_count: number;
    over_count: number;
    unbudgeted_count: number;
}

interface Metrics {
    period: { key: string; label: string; start: string; end: string };
    currency: string;
    kpis: {
        period_spend: number;
        period_claim_count: number;
        period_avg_claim: number;
        pending_count: number;
        pending_amount: number;
        oldest_pending_days: number;
        flagged_count: number;
        flagged_amount: number;
        awaiting_reimbursement_count: number;
        awaiting_reimbursement_amount: number;
    };
    spend_windows: Array<{ key: string; label: string; amount: number; claim_count: number }>;
    trend: Array<{ label: string; amount: number }>;
    department_budgets: BudgetGroup;
    category_budgets: BudgetGroup;
    people: {
        active_member_count: number;
        role_breakdown: Array<{ role: string; count: number }>;
        pending_invitation_count: number;
        unassigned_member_count: number;
        pending_invitations: Array<{
            id: number;
            email: string;
            role: string | null;
            department_name: string | null;
            invited_by: string | null;
            expires_at: string | null;
            days_until_expiry: number | null;
        }>;
    };
    ai_quota: {
        used: number;
        limit: number | null;
        is_unlimited: boolean;
        utilization_percentage: number;
        resets_at: string | null;
        plan_tier: string | null;
    };
    recent_audit_activity: Array<{
        uuid: string;
        action: string | null;
        actor_name: string;
        auditable_type: string | null;
        auditable_id: number | null;
        created_at: string | null;
    }>;
    recent_batches: Array<{
        id: number;
        batch_number: string;
        status: string | null;
        claim_count: number;
        total_amount: number;
        currency_code: string;
        created_by: string | null;
        processed_at: string | null;
        created_at: string | null;
    }>;
}

interface DashboardProps {
    metrics: Metrics;
    organization: { id: number; name: string; slug: string; plan_tier: string | null };
    administeredOrganizations: Array<{ id: number; name: string; slug: string; role: string | null }>;
    filters: { period: string };
}

const PERIODS = [
    { key: 'monthly', label: 'Month' },
    { key: 'quarterly', label: 'Quarter' },
    { key: 'annual', label: 'Year' },
];

/** Severity thresholds shared by every budget bar on the page. */
function budgetTone(utilization: number) {
    if (utilization > 100) {
        return { bar: 'bg-rose-500', text: 'text-rose-400', track: 'bg-rose-950/50' };
    }
    if (utilization >= 80) {
        return { bar: 'bg-amber-500', text: 'text-amber-400', track: 'bg-amber-950/40' };
    }
    return { bar: 'bg-emerald-500', text: 'text-emerald-400', track: 'bg-zinc-800' };
}

export default function Dashboard({
    metrics,
    organization,
    administeredOrganizations,
    filters,
}: DashboardProps) {
    const { kpis, people, ai_quota, department_budgets, category_budgets } = metrics;

    const formatCurrency = (val: number, currency?: string) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || metrics.currency || 'USD',
            maximumFractionDigits: 0,
        }).format(val || 0);

    const formatExact = (val: number, currency?: string) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || metrics.currency || 'USD',
        }).format(val || 0);

    const formatRelative = (iso: string | null) => {
        if (!iso) return '—';
        const diffMs = Date.now() - new Date(iso).getTime();
        const mins = Math.round(diffMs / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.round(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.round(hours / 24)}d ago`;
    };

    const humanizeAction = (action: string | null) =>
        action ? action.replace(/[._]/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : 'Activity';

    const maxTrend = Math.max(...metrics.trend.map((p) => p.amount), 1);
    const totalBudgetIssues =
        department_budgets.over_count +
        department_budgets.at_risk_count +
        category_budgets.over_count +
        category_budgets.at_risk_count;

    return (
        <AdminLayout title="Overview">
            {/* Header: identity, workspace switcher, period, primary actions */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        {organization.name}
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Organization control centre — spending, approvals, budgets, people, and policy health for{' '}
                        <span className="text-zinc-300 font-medium">{metrics.period.label}</span>.
                    </p>

                    {administeredOrganizations.length > 1 && (
                        <div className="mt-3 flex items-center gap-2">
                            <label htmlFor="org-switcher" className="text-[11px] text-zinc-500">
                                Workspace
                            </label>
                            <select
                                id="org-switcher"
                                value={organization.id}
                                onChange={(e) =>
                                    router.post('/admin/switch-organization', {
                                        organization_id: Number(e.target.value),
                                    })
                                }
                                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            >
                                {administeredOrganizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-start gap-3 shrink-0 sm:flex-row sm:items-center">
                    {/* Period selector */}
                    <div
                        role="group"
                        aria-label="Reporting period"
                        className="flex items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-0.5"
                    >
                        {PERIODS.map((p) => (
                            <Link
                                key={p.key}
                                href={`/admin/dashboard?period=${p.key}`}
                                preserveScroll
                                aria-current={filters.period === p.key ? 'true' : undefined}
                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                                    filters.period === p.key
                                        ? 'bg-zinc-800 text-indigo-300'
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                {p.label}
                            </Link>
                        ))}
                    </div>

                    <Link href="/portal/manager/expenses">
                        <Button className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-sm shadow-emerald-500/20">
                            <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                            Review approvals
                        </Button>
                    </Link>
                    <a href={`/accountant/export-erp?target=tax_ledger`}>
                        <Button
                            variant="outline"
                            className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs rounded-xl"
                        >
                            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                            Export ledger
                        </Button>
                    </a>
                </div>
            </div>

            {/* Operational KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                    <CardContent className="p-3.5 sm:p-5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                                Spend · {metrics.period.label}
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-zinc-500/10 text-zinc-300 shrink-0">
                                <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                                {formatCurrency(kpis.period_spend)}
                            </h3>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-400 truncate">
                                {kpis.period_claim_count} claims · {formatCurrency(kpis.period_avg_claim)} avg
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                    <CardContent className="p-3.5 sm:p-5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400/90 truncate">
                                Awaiting approval
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                                {kpis.pending_count}
                            </h3>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-amber-400 truncate">
                                {formatCurrency(kpis.pending_amount)}
                                {kpis.oldest_pending_days > 0 && ` · oldest ${kpis.oldest_pending_days}d`}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                    <CardContent className="p-3.5 sm:p-5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-400/90 truncate">
                                Policy flagged
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                                <Flag className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                                {kpis.flagged_count}
                            </h3>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-rose-400 truncate">
                                {formatCurrency(kpis.flagged_amount)} in violations
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                    <CardContent className="p-3.5 sm:p-5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-400/90 truncate">
                                Awaiting payout
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                                <Banknote className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                                {formatCurrency(kpis.awaiting_reimbursement_amount)}
                            </h3>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-indigo-400 truncate">
                                {kpis.awaiting_reimbursement_count} approved claims
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Spend trend + rolling windows */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-sm font-bold text-zinc-200">Organization spend</h2>
                        </div>
                        <span className="text-[11px] text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-700/50">
                            {metrics.period.label}
                        </span>
                    </div>

                    {kpis.period_claim_count === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center gap-1 text-center">
                            <p className="text-xs text-zinc-300 font-medium">No spend recorded this period</p>
                            <p className="text-[11px] text-zinc-500">
                                Submitted expenses appear here as employees file them.
                            </p>
                        </div>
                    ) : (
                        <div className="h-48 flex items-end justify-between gap-1 pt-4 px-1 border-b border-zinc-800/80">
                            {metrics.trend.map((point, idx) => {
                                const heightPct = Math.max((point.amount / maxTrend) * 100, 2);
                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                                        <div
                                            className="w-full bg-indigo-950/60 rounded-t border-t border-x border-indigo-500/30 group-hover:bg-indigo-500/30 transition-all motion-reduce:transition-none relative"
                                            style={{ height: `${heightPct}%` }}
                                        >
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-[10px] text-zinc-100 px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                                                {formatExact(point.amount)}
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-zinc-500 truncate w-full text-center">
                                            {point.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Rolling month / quarter / year totals */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                        {metrics.spend_windows.map((w) => (
                            <div key={w.key} className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                                    {w.label}
                                </p>
                                <p className="mt-1 text-base font-bold text-zinc-100 truncate">
                                    {formatCurrency(w.amount)}
                                </p>
                                <p className="text-[11px] text-zinc-500">{w.claim_count} claims</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* People & AI quota */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-5 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-sm font-bold text-zinc-200">People</h2>
                        </div>
                        <span className="text-[11px] text-zinc-400">{people.active_member_count} active</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {people.role_breakdown.map((r) => (
                            <span
                                key={r.role}
                                className="inline-flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950/60 px-2 py-0.5 text-[10px] font-medium text-zinc-300 capitalize"
                            >
                                {r.role}
                                <span className="text-zinc-500">{r.count}</span>
                            </span>
                        ))}
                        {people.unassigned_member_count > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                                No department {people.unassigned_member_count}
                            </span>
                        )}
                    </div>

                    <div className="space-y-2 border-t border-zinc-800/80 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                                Open invitations
                            </span>
                            <span className="text-xs font-bold text-zinc-200">
                                {people.pending_invitation_count}
                            </span>
                        </div>

                        {people.pending_invitations.length === 0 ? (
                            <p className="text-[11px] text-zinc-500">
                                Everyone invited has responded.
                            </p>
                        ) : (
                            <ul className="space-y-1.5">
                                {people.pending_invitations.map((inv) => (
                                    <li key={inv.id} className="flex items-center justify-between gap-2">
                                        <span className="truncate text-[11px] text-zinc-300">{inv.email}</span>
                                        <span
                                            className={`shrink-0 text-[10px] ${
                                                (inv.days_until_expiry ?? 99) <= 3
                                                    ? 'text-amber-400'
                                                    : 'text-zinc-500'
                                            }`}
                                        >
                                            {inv.days_until_expiry !== null
                                                ? `${inv.days_until_expiry}d left`
                                                : '—'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* AI scan quota */}
                    <div className="space-y-2 border-t border-zinc-800/80 pt-4">
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                AI receipt scans
                            </span>
                            <span className="text-xs font-bold text-zinc-200">
                                {ai_quota.is_unlimited
                                    ? `${ai_quota.used} used`
                                    : `${ai_quota.used} / ${ai_quota.limit}`}
                            </span>
                        </div>

                        {ai_quota.is_unlimited ? (
                            <p className="text-[11px] text-zinc-500 capitalize">
                                Unlimited on the {ai_quota.plan_tier ?? 'current'} plan.
                            </p>
                        ) : (
                            <>
                                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${budgetTone(ai_quota.utilization_percentage).bar}`}
                                        style={{ width: `${Math.min(ai_quota.utilization_percentage, 100)}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-zinc-500">
                                    {ai_quota.utilization_percentage}% of the monthly allowance used
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Budget pressure — departments and categories, worst first */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-5 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center space-x-2">
                        <Gauge className="w-4 h-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-zinc-200">Budget pressure</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {totalBudgetIssues === 0 ? (
                            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                All budgets within limits
                            </span>
                        ) : (
                            <>
                                {department_budgets.over_count + category_budgets.over_count > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
                                        <AlertTriangle className="w-3 h-3" />
                                        {department_budgets.over_count + category_budgets.over_count} over budget
                                    </span>
                                )}
                                {department_budgets.at_risk_count + category_budgets.at_risk_count > 0 && (
                                    <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                                        {department_budgets.at_risk_count + category_budgets.at_risk_count} at 80%+
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                    {/* Departments */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                <Building2 className="w-3.5 h-3.5" />
                                Departments
                            </h3>
                            {department_budgets.unbudgeted_count > 0 && (
                                <span className="text-[10px] text-zinc-500">
                                    {department_budgets.unbudgeted_count} without a budget
                                </span>
                            )}
                        </div>

                        {department_budgets.items.length === 0 ? (
                            <p className="py-6 text-center text-[11px] text-zinc-500">
                                No department budgets configured yet. Set one to start tracking utilization.
                            </p>
                        ) : (
                            <ul className="space-y-3.5">
                                {department_budgets.items.map((dept) => {
                                    const tone = budgetTone(dept.utilization_percentage);
                                    return (
                                        <li key={dept.id} className="space-y-1.5">
                                            <div className="flex items-baseline justify-between gap-2 text-xs">
                                                <span className="truncate font-semibold text-zinc-200">
                                                    {dept.name}
                                                    <span className="ml-1.5 font-normal text-zinc-500">
                                                        {dept.member_count} member
                                                        {dept.member_count === 1 ? '' : 's'}
                                                    </span>
                                                </span>
                                                <span className={`shrink-0 font-bold tabular-nums ${tone.text}`}>
                                                    {dept.utilization_percentage}%
                                                </span>
                                            </div>

                                            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${tone.bar}`}
                                                    style={{
                                                        width: `${Math.min(dept.utilization_percentage, 100)}%`,
                                                    }}
                                                />
                                            </div>

                                            <div className="flex items-baseline justify-between gap-2 text-[10px] text-zinc-500">
                                                <span className="truncate">
                                                    {formatExact(dept.committed_amount, dept.budget_currency)} of{' '}
                                                    {formatExact(dept.budget_amount ?? 0, dept.budget_currency)} ·{' '}
                                                    <span className="capitalize">{dept.budget_period}</span>
                                                </span>
                                                <span className={`shrink-0 ${tone.text}`}>
                                                    {dept.utilization_percentage > 100
                                                        ? `Over by ${formatExact(
                                                              dept.committed_amount - (dept.budget_amount ?? 0),
                                                              dept.budget_currency
                                                          )}`
                                                        : `${formatExact(
                                                              dept.remaining_budget ?? 0,
                                                              dept.budget_currency
                                                          )} left`}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>

                    {/* Categories */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                            <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                <Tags className="w-3.5 h-3.5" />
                                Categories
                            </h3>
                            {category_budgets.unbudgeted_count > 0 && (
                                <span className="text-[10px] text-zinc-500">
                                    {category_budgets.unbudgeted_count} without a budget
                                </span>
                            )}
                        </div>

                        {category_budgets.items.length === 0 ? (
                            <p className="py-6 text-center text-[11px] text-zinc-500">
                                No category budgets configured yet. Set one to cap spend per category.
                            </p>
                        ) : (
                            <ul className="space-y-3.5">
                                {category_budgets.items.map((cat) => {
                                    const tone = budgetTone(cat.utilization_percentage);
                                    return (
                                        <li key={cat.id} className="space-y-1.5">
                                            <div className="flex items-baseline justify-between gap-2 text-xs">
                                                <span className="truncate font-semibold text-zinc-200">
                                                    {cat.name}
                                                    {cat.gl_code && (
                                                        <span className="ml-1.5 font-normal text-zinc-500">
                                                            {cat.gl_code}
                                                        </span>
                                                    )}
                                                </span>
                                                <span className={`shrink-0 font-bold tabular-nums ${tone.text}`}>
                                                    {cat.utilization_percentage}%
                                                </span>
                                            </div>

                                            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${tone.bar}`}
                                                    style={{
                                                        width: `${Math.min(cat.utilization_percentage, 100)}%`,
                                                    }}
                                                />
                                            </div>

                                            <div className="flex items-baseline justify-between gap-2 text-[10px] text-zinc-500">
                                                <span className="truncate">
                                                    {formatExact(cat.committed_amount, cat.budget_currency)} of{' '}
                                                    {formatExact(cat.budget_amount ?? 0, cat.budget_currency)} ·{' '}
                                                    <span className="capitalize">{cat.budget_period}</span>
                                                </span>
                                                <span className={`shrink-0 ${tone.text}`}>
                                                    {cat.utilization_percentage > 100
                                                        ? `Over by ${formatExact(
                                                              cat.committed_amount - (cat.budget_amount ?? 0),
                                                              cat.budget_currency
                                                          )}`
                                                        : `${formatExact(
                                                              cat.remaining_budget ?? 0,
                                                              cat.budget_currency
                                                          )} left`}
                                                </span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </div>
            </div>

            {/* Activity + batches */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <ScrollText className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-sm font-bold text-zinc-200">Recent activity</h2>
                        </div>
                        <Link
                            href="/accountant/audit-logs"
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                        >
                            Full audit log <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {metrics.recent_audit_activity.length === 0 ? (
                        <p className="p-8 text-center text-xs text-zinc-400">
                            No recorded activity yet. Approvals, budget edits, and membership changes appear here.
                        </p>
                    ) : (
                        <ul className="divide-y divide-zinc-800/60">
                            {metrics.recent_audit_activity.map((log) => (
                                <li key={log.uuid} className="flex items-center justify-between gap-3 py-2.5">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-semibold text-zinc-200">
                                            {humanizeAction(log.action)}
                                        </p>
                                        <p className="truncate text-[11px] text-zinc-500">
                                            {log.actor_name}
                                            {log.auditable_type && ` · ${log.auditable_type} #${log.auditable_id}`}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-[10px] text-zinc-500">
                                        {formatRelative(log.created_at)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <ClipboardList className="w-4 h-4 text-indigo-400" />
                            <h2 className="text-sm font-bold text-zinc-200">Reimbursement batches</h2>
                        </div>
                        <Link
                            href="/accountant/reimbursements"
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                        >
                            Manage
                        </Link>
                    </div>

                    {metrics.recent_batches.length === 0 ? (
                        <p className="py-6 text-center text-[11px] text-zinc-500">
                            No payout batches yet. Approved claims can be batched from Reimbursements.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {metrics.recent_batches.map((batch) => (
                                <li
                                    key={batch.id}
                                    className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-1"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-[11px] font-semibold text-zinc-200">
                                            {batch.batch_number}
                                        </span>
                                        <span
                                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                                                batch.status === 'completed'
                                                    ? 'bg-emerald-500/10 text-emerald-400'
                                                    : batch.status === 'failed'
                                                      ? 'bg-rose-500/10 text-rose-400'
                                                      : 'bg-amber-500/10 text-amber-400'
                                            }`}
                                        >
                                            {batch.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                                        <span>{batch.claim_count} claims</span>
                                        <span className="font-semibold text-zinc-300">
                                            {formatExact(batch.total_amount, batch.currency_code)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                <h2 className="text-sm font-bold text-zinc-200">Quick actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <Link
                        href="/portal/manager/expenses"
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                        <span className="flex items-center gap-2">
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                            Review approvals
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </Link>

                    <Link
                        href="/accountant/reimbursements"
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                        <span className="flex items-center gap-2">
                            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                            Create payout batch
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </Link>

                    <Link
                        href="/accountant/expenses"
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                        <span className="flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
                            Search all expenses
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
                    </Link>

                    <span
                        aria-disabled="true"
                        title="Available once the Members page ships"
                        className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 text-xs font-medium text-zinc-600 cursor-not-allowed"
                    >
                        <span className="flex items-center gap-2">
                            <UserPlus className="w-3.5 h-3.5" />
                            Invite member
                        </span>
                        <span className="text-[10px] uppercase tracking-wider">Soon</span>
                    </span>
                </div>
            </div>
        </AdminLayout>
    );
}
