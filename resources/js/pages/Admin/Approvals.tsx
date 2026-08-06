import React, { useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import ExpenseApprovalModal from '@/components/portal/ExpenseApprovalModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Eye,
    Loader2,
    RotateCcw,
    Search,
    SlidersHorizontal,
    XCircle,
} from 'lucide-react';

interface ExpenseRow {
    id: string;
    merchant_name: string | null;
    description: string | null;
    amount: number;
    currency_code: string;
    expense_date: string | null;
    status: string;
    submitted_at: string | null;
    rejection_reason: string | null;
    submitter?: { id: number; name: string; email: string } | null;
    category?: { id: number; name: string } | null;
    policy_flags?: Array<{ code: string; severity: string; message: string }>;
    department_name: string | null;
    is_own_claim: boolean;
    can_decide: boolean;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Filters {
    tab: string;
    search: string | null;
    employee: string | null;
    department: string | null;
    category: string | null;
    date_from: string | null;
    date_to: string | null;
    amount_min: string | null;
    amount_max: string | null;
    flagged_only: boolean;
}

interface ApprovalsProps {
    expenses: Paginated<ExpenseRow>;
    filters: Filters;
    tabCounts: Record<string, number>;
    filterOptions: {
        employees: Array<{ id: number; name: string; email: string }>;
        departments: Array<{ id: number; name: string }>;
        categories: Array<{ id: number; name: string }>;
    };
    ownClaimCount: number;
}

const TABS = [
    { key: 'pending', label: 'Pending' },
    { key: 'under_review', label: 'Under review' },
    { key: 'flagged', label: 'Flagged' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
];

export default function Approvals({
    expenses,
    filters,
    tabCounts,
    filterOptions,
    ownClaimCount,
}: ApprovalsProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [reviewing, setReviewing] = useState<ExpenseRow | null>(null);
    const [showFilters, setShowFilters] = useState(
        Boolean(
            filters.employee ||
                filters.department ||
                filters.category ||
                filters.date_from ||
                filters.date_to ||
                filters.amount_min ||
                filters.amount_max
        )
    );
    const [searchTerm, setSearchTerm] = useState(filters.search ?? '');
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkError, setBulkError] = useState<string | null>(null);
    const [rejectingBulk, setRejectingBulk] = useState(false);
    const [bulkReason, setBulkReason] = useState('');

    const rows = expenses.data;

    /** Only claims the server marked decidable can be actioned in bulk. */
    const decidableRows = useMemo(() => rows.filter((r) => r.can_decide), [rows]);
    const selectedRows = useMemo(
        () => rows.filter((r) => selectedIds.includes(r.id) && r.can_decide),
        [rows, selectedIds]
    );

    const allDecidableSelected =
        decidableRows.length > 0 && decidableRows.every((r) => selectedIds.includes(r.id));

    const activeFilterCount = [
        filters.employee,
        filters.department,
        filters.category,
        filters.date_from,
        filters.date_to,
        filters.amount_min,
        filters.amount_max,
    ].filter(Boolean).length;

    const formatCurrency = (val: number, currency = 'USD') =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(
            val || 0
        );

    const selectedTotal = selectedRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    /** Push a filter change to the server, resetting pagination. */
    const applyFilter = (patch: Record<string, string | boolean | null>) => {
        const next: Record<string, string> = {};
        const merged = { ...filters, ...patch };

        Object.entries(merged).forEach(([key, value]) => {
            if (value !== null && value !== '' && value !== false) {
                next[key] = String(value);
            }
        });

        setSelectedIds([]);
        router.get('/admin/approvals', next, { preserveState: true, preserveScroll: true });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedIds([]);
        router.get('/admin/approvals', { tab: filters.tab }, { preserveState: true, preserveScroll: true });
    };

    const toggleRow = (id: string) =>
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

    const toggleAll = () =>
        setSelectedIds(allDecidableSelected ? [] : decidableRows.map((r) => r.id));

    /** Run one decision per selected claim, then refresh from the server. */
    const runBulkDecision = async (decision: 'approve' | 'reject') => {
        if (selectedRows.length === 0) return;
        if (decision === 'reject' && !bulkReason.trim()) {
            setBulkError('Add a reason before rejecting.');
            return;
        }

        setBulkBusy(true);
        setBulkError(null);

        const failures: string[] = [];

        for (const row of selectedRows) {
            try {
                const res = await apiFetch(`/api/v1/expenses/${row.id}/${decision}`, {
                    method: 'POST',
                    headers: decision === 'reject' ? { 'Content-Type': 'application/json' } : undefined,
                    body: decision === 'reject' ? JSON.stringify({ reason: bulkReason }) : undefined,
                });

                if (!res.ok) {
                    failures.push(row.merchant_name || row.id);
                }
            } catch {
                failures.push(row.merchant_name || row.id);
            }
        }

        setBulkBusy(false);
        setRejectingBulk(false);
        setBulkReason('');

        if (failures.length > 0) {
            setBulkError(
                `${failures.length} of ${selectedRows.length} claims could not be ${
                    decision === 'approve' ? 'approved' : 'rejected'
                }: ${failures.slice(0, 3).join(', ')}${failures.length > 3 ? '…' : ''}`
            );
        }

        setSelectedIds([]);
        router.reload({ only: ['expenses', 'tabCounts'] });
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'approved':
            case 'processing':
            case 'reimbursed':
                return (
                    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400 capitalize">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> {status}
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-400">
                        <XCircle className="mr-1 h-3 w-3" /> Rejected
                    </Badge>
                );
            default:
                return (
                    <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
                        <Clock className="mr-1 h-3 w-3" />
                        {status === 'under_review' ? 'Under review' : 'Pending'}
                    </Badge>
                );
        }
    };

    const daysWaiting = (iso: string | null) => {
        if (!iso) return null;
        const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
        return days > 0 ? days : null;
    };

    return (
        <AdminLayout title="Approvals">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        Approval inbox
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Every claim across the organization, not just one department.
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <Button
                        onClick={() => setShowFilters((s) => !s)}
                        variant="outline"
                        className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs rounded-xl"
                    >
                        <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1.5 rounded-full bg-indigo-500/20 px-1.5 text-[10px] font-bold text-indigo-300">
                                {activeFilterCount}
                            </span>
                        )}
                    </Button>
                    {(activeFilterCount > 0 || filters.search) && (
                        <Button
                            onClick={clearFilters}
                            variant="ghost"
                            className="text-xs text-zinc-400 hover:text-zinc-200"
                        >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Separation-of-duties notice */}
            {ownClaimCount > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-xs text-zinc-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                    <p>
                        {ownClaimCount} pending {ownClaimCount === 1 ? 'claim is' : 'claims are'} yours.
                        You can&apos;t decide your own claims — another admin or manager has to review them.
                    </p>
                </div>
            )}

            {/* Tabs + search */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => applyFilter({ tab: tab.key })}
                            aria-current={filters.tab === tab.key ? 'true' : undefined}
                            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                                filters.tab === tab.key
                                    ? 'bg-zinc-800 text-indigo-300 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            {tab.key === 'flagged' && <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />}
                            {tab.label}
                            <span
                                className={
                                    filters.tab === tab.key ? 'text-indigo-400/70' : 'text-zinc-600'
                                }
                            >
                                {tabCounts[tab.key] ?? 0}
                            </span>
                        </button>
                    ))}
                </div>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        applyFilter({ search: searchTerm || null });
                    }}
                    className="relative sm:w-72"
                >
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                    <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search merchant or employee…"
                        aria-label="Search claims"
                        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-indigo-500/50 focus:outline-none"
                    />
                </form>
            </div>

            {/* Filter panel */}
            {showFilters && (
                <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                        <label htmlFor="f-employee" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Employee
                        </label>
                        <select
                            id="f-employee"
                            value={filters.employee ?? ''}
                            onChange={(e) => applyFilter({ employee: e.target.value || null })}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                            <option value="">Everyone</option>
                            {filterOptions.employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                    {emp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="f-dept" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Department
                        </label>
                        <select
                            id="f-dept"
                            value={filters.department ?? ''}
                            onChange={(e) => applyFilter({ department: e.target.value || null })}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                            <option value="">All departments</option>
                            {filterOptions.departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="f-cat" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Category
                        </label>
                        <select
                            id="f-cat"
                            value={filters.category ?? ''}
                            onChange={(e) => applyFilter({ category: e.target.value || null })}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                            <option value="">All categories</option>
                            {filterOptions.categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Amount range
                        </span>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={filters.amount_min ?? ''}
                                onBlur={(e) => applyFilter({ amount_min: e.target.value || null })}
                                placeholder="Min"
                                aria-label="Minimum amount"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            />
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={filters.amount_max ?? ''}
                                onBlur={(e) => applyFilter({ amount_max: e.target.value || null })}
                                placeholder="Max"
                                aria-label="Maximum amount"
                                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="f-from" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Date from
                        </label>
                        <input
                            id="f-from"
                            type="date"
                            defaultValue={filters.date_from ?? ''}
                            onChange={(e) => applyFilter({ date_from: e.target.value || null })}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="f-to" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                            Date to
                        </label>
                        <input
                            id="f-to"
                            type="date"
                            defaultValue={filters.date_to ?? ''}
                            onChange={(e) => applyFilter({ date_to: e.target.value || null })}
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        />
                    </div>

                    <label className="flex items-end gap-2 pb-1.5 text-xs text-zinc-300 sm:col-span-2">
                        <input
                            type="checkbox"
                            checked={filters.flagged_only}
                            onChange={(e) => applyFilter({ flagged_only: e.target.checked })}
                            className="rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500/20"
                        />
                        Only claims with policy flags
                    </label>
                </div>
            )}

            {/* Bulk error */}
            {bulkError && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
                    <span className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                        {bulkError}
                    </span>
                    <button onClick={() => setBulkError(null)} className="shrink-0 hover:text-rose-200">
                        Dismiss
                    </button>
                </div>
            )}

            {/* Claims table */}
            <div className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-xl">
                {/* Mobile cards */}
                <div className="divide-y divide-zinc-800/60 sm:hidden">
                    {rows.length === 0 ? (
                        <p className="p-8 text-center text-xs text-zinc-500">
                            No claims match these filters.
                        </p>
                    ) : (
                        rows.map((exp) => {
                            const flags = exp.policy_flags ?? [];
                            const selected = selectedIds.includes(exp.id);
                            return (
                                <div key={exp.id} className={`space-y-3 p-4 ${selected ? 'bg-indigo-500/5' : ''}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2.5">
                                            {exp.can_decide && (
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={() => toggleRow(exp.id)}
                                                    aria-label={`Select claim from ${exp.submitter?.name ?? 'employee'}`}
                                                    className="rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500/20"
                                                />
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-zinc-100">
                                                    {exp.merchant_name || 'Expense claim'}
                                                </p>
                                                <p className="truncate text-xs text-zinc-400">
                                                    {exp.submitter?.name}
                                                    {exp.department_name && ` · ${exp.department_name}`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <span className="block text-sm font-black text-emerald-400">
                                                {formatCurrency(exp.amount, exp.currency_code)}
                                            </span>
                                            <span className="text-[10px] text-zinc-500">{exp.expense_date}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-2">
                                        <div className="flex items-center gap-2">
                                            {statusBadge(exp.status)}
                                            {flags.length > 0 && (
                                                <Badge className="border-amber-500/30 bg-amber-500/10 py-0.5 text-[10px] text-amber-400">
                                                    <AlertTriangle className="mr-1 h-3 w-3" /> {flags.length}
                                                </Badge>
                                            )}
                                        </div>
                                        <Button
                                            onClick={() => setReviewing(exp)}
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
                                        >
                                            <Eye className="mr-1 h-3.5 w-3.5 text-indigo-400" /> Review
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop table */}
                <div className="hidden overflow-x-auto sm:block">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-zinc-800/80 bg-zinc-900/80 font-medium uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th scope="col" className="w-10 px-4 py-3.5 text-center">
                                    <input
                                        type="checkbox"
                                        checked={allDecidableSelected}
                                        onChange={toggleAll}
                                        disabled={decidableRows.length === 0}
                                        aria-label="Select all decidable claims"
                                        className="rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500/20 disabled:opacity-40"
                                    />
                                </th>
                                <th scope="col" className="px-4 py-3.5">Employee</th>
                                <th scope="col" className="px-4 py-3.5">Merchant</th>
                                <th scope="col" className="px-4 py-3.5">Category</th>
                                <th scope="col" className="px-4 py-3.5 text-right">Amount</th>
                                <th scope="col" className="px-4 py-3.5">Date</th>
                                <th scope="col" className="px-4 py-3.5 text-center">Policy</th>
                                <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                                <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-xs text-zinc-500">
                                        No claims match these filters.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((exp) => {
                                    const flags = exp.policy_flags ?? [];
                                    const selected = selectedIds.includes(exp.id);
                                    const waiting = daysWaiting(exp.submitted_at);

                                    return (
                                        <tr
                                            key={exp.id}
                                            className={`transition-colors motion-reduce:transition-none hover:bg-zinc-900/60 ${
                                                selected ? 'bg-indigo-500/5' : ''
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    disabled={!exp.can_decide}
                                                    onChange={() => toggleRow(exp.id)}
                                                    aria-label={`Select claim from ${exp.submitter?.name ?? 'employee'}`}
                                                    title={
                                                        exp.is_own_claim
                                                            ? 'You cannot decide your own claim'
                                                            : undefined
                                                    }
                                                    className="rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-indigo-500/20 disabled:opacity-30"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[11px] font-bold text-indigo-300">
                                                        {exp.submitter?.name?.charAt(0).toUpperCase() ?? 'E'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-zinc-100">
                                                            {exp.submitter?.name ?? 'Employee'}
                                                            {exp.is_own_claim && (
                                                                <span className="ml-1.5 text-[10px] font-normal text-amber-400">
                                                                    you
                                                                </span>
                                                            )}
                                                        </p>
                                                        <p className="truncate text-[10px] text-zinc-500">
                                                            {exp.department_name ?? 'No department'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="max-w-[180px] px-4 py-3">
                                                <p className="truncate font-semibold text-zinc-200">
                                                    {exp.merchant_name || 'Expense claim'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400">
                                                {exp.category?.name ?? 'Uncategorized'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-extrabold tabular-nums text-emerald-400">
                                                {formatCurrency(exp.amount, exp.currency_code)}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400">
                                                <span>{exp.expense_date ?? '—'}</span>
                                                {waiting !== null && filters.tab === 'pending' && (
                                                    <span
                                                        className={`ml-1.5 text-[10px] ${
                                                            waiting >= 7 ? 'text-amber-400' : 'text-zinc-600'
                                                        }`}
                                                    >
                                                        {waiting}d
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {flags.length > 0 ? (
                                                    <Badge
                                                        className="border-amber-500/30 bg-amber-500/10 py-0.5 text-[10px] text-amber-400"
                                                        title={flags.map((f) => f.message).join('\n')}
                                                    >
                                                        <AlertTriangle className="mr-1 h-3 w-3" />
                                                        {flags.length}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-emerald-400/70">
                                                        Clear
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">{statusBadge(exp.status)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    onClick={() => setReviewing(exp)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 px-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                                >
                                                    <Eye className="mr-1 h-3.5 w-3.5 text-indigo-400" /> Review
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {expenses.last_page > 1 && (
                    <div className="flex items-center justify-between gap-3 border-t border-zinc-800/80 bg-zinc-900/60 px-4 py-3">
                        <p className="text-[11px] text-zinc-500">
                            Showing {expenses.from ?? 0}–{expenses.to ?? 0} of {expenses.total}
                        </p>
                        <div className="flex items-center gap-1.5">
                            {expenses.prev_page_url ? (
                                <Link
                                    href={expenses.prev_page_url}
                                    preserveState
                                    preserveScroll
                                    className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                                </Link>
                            ) : (
                                <span className="flex items-center gap-1 rounded-lg border border-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-600">
                                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                                </span>
                            )}
                            <span className="px-2 text-[11px] text-zinc-500">
                                {expenses.current_page} / {expenses.last_page}
                            </span>
                            {expenses.next_page_url ? (
                                <Link
                                    href={expenses.next_page_url}
                                    preserveState
                                    preserveScroll
                                    className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                                >
                                    Next <ChevronRight className="h-3.5 w-3.5" />
                                </Link>
                            ) : (
                                <span className="flex items-center gap-1 rounded-lg border border-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-600">
                                    Next <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Decision bar — only present while claims are selected */}
            {selectedRows.length > 0 && (
                <div className="sticky bottom-4 z-30 mx-auto w-full max-w-3xl">
                    <div className="rounded-2xl border border-indigo-500/30 bg-zinc-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-md">
                        {rejectingBulk ? (
                            <div className="space-y-2">
                                <label htmlFor="bulk-reason" className="block text-xs font-semibold text-rose-300">
                                    Why are these {selectedRows.length} claims being rejected?
                                </label>
                                <textarea
                                    id="bulk-reason"
                                    rows={2}
                                    value={bulkReason}
                                    onChange={(e) => setBulkReason(e.target.value)}
                                    placeholder="This reason is sent to every employee in the selection."
                                    className="w-full rounded-lg border border-rose-500/30 bg-zinc-950 p-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-rose-500 focus:outline-none"
                                />
                                <div className="flex items-center justify-end gap-2">
                                    <Button
                                        onClick={() => {
                                            setRejectingBulk(false);
                                            setBulkReason('');
                                        }}
                                        variant="ghost"
                                        className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => runBulkDecision('reject')}
                                        disabled={bulkBusy || !bulkReason.trim()}
                                        className="h-8 bg-rose-600 text-xs text-white hover:bg-rose-500"
                                    >
                                        {bulkBusy ? (
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        Reject {selectedRows.length}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-xs">
                                    <p className="font-semibold text-zinc-100">
                                        {selectedRows.length} selected
                                    </p>
                                    <p className="text-[11px] text-zinc-400">
                                        {formatCurrency(selectedTotal, selectedRows[0]?.currency_code)} total
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => setSelectedIds([])}
                                        variant="ghost"
                                        className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
                                    >
                                        Clear
                                    </Button>
                                    <Button
                                        onClick={() => setRejectingBulk(true)}
                                        disabled={bulkBusy}
                                        variant="outline"
                                        className="h-8 border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                                    >
                                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                        Reject
                                    </Button>
                                    <Button
                                        onClick={() => runBulkDecision('approve')}
                                        disabled={bulkBusy}
                                        className="h-8 bg-emerald-500 text-xs font-semibold text-zinc-950 shadow-sm shadow-emerald-500/20 hover:bg-emerald-400"
                                    >
                                        {bulkBusy ? (
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Check className="mr-1.5 h-3.5 w-3.5 stroke-[2.5]" />
                                        )}
                                        Approve {selectedRows.length}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Shared review modal */}
            <ExpenseApprovalModal
                isOpen={reviewing !== null}
                expense={reviewing}
                onClose={() => setReviewing(null)}
                onApproveSuccess={() => router.reload({ only: ['expenses', 'tabCounts'] })}
                onRejectSuccess={() => router.reload({ only: ['expenses', 'tabCounts'] })}
            />
        </AdminLayout>
    );
}
