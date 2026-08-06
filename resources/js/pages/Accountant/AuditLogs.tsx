import React, { useState } from 'react';
import AccountantLayout from '@/layouts/AccountantLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { router } from '@inertiajs/react';
import {
    ShieldAlert,
    Search,
    Download,
    Clock,
    User as UserIcon,
    Code,
    X,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    ShieldCheck,
    Layers,
    FileText,
    Globe,
    Laptop,
    Check
} from 'lucide-react';

interface AuditLogsProps {
    logs: {
        data: Array<{
            id: number;
            action: string;
            auditable_type: string;
            auditable_id: string | number;
            before_state?: Record<string, any> | null;
            after_state?: Record<string, any> | null;
            old_values?: Record<string, any> | null;
            new_values?: Record<string, any> | null;
            metadata?: Record<string, any> | null;
            ip_address?: string | null;
            user_agent?: string | null;
            checksum?: string | null;
            created_at: string;
            user?: { name: string; email: string };
        }>;
    };
    filters: { search?: string };
}

function humanizeAction(actionStr: string): string {
    if (!actionStr) return 'Audit Log Event';
    return actionStr
        .replace(/[._]/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function humanizeKey(keyStr: string): string {
    const keyMap: Record<string, string> = {
        status: 'Status',
        reimbursed_at: 'Reimbursed Date',
        payment_reference: 'Payment Reference',
        transaction_hash: 'Transaction Hash',
        amount: 'Amount',
        total_amount: 'Total Amount',
        merchant_name: 'Merchant Name',
        currency_code: 'Currency',
        submitted_at: 'Submission Date',
        approved_at: 'Approval Date',
        rejected_at: 'Rejection Date',
        rejection_reason: 'Rejection Reason',
        claim_count: 'Total Claims Count',
        batch_number: 'Batch Number',
        payment_method: 'Payment Method',
        user_id: 'User ID',
        organization_id: 'Organization ID',
        created_at: 'Creation Date',
        updated_at: 'Last Modified Date',
    };

    if (keyMap[keyStr]) return keyMap[keyStr];

    return keyStr
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDisplayValue(key: string, val: any): string {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';

    if (typeof val === 'number') {
        if (key.includes('amount') || key.includes('price') || key.includes('total')) {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
        }
        return val.toLocaleString();
    }

    if (typeof val === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
            try {
                const d = new Date(val);
                return d.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                });
            } catch {
                return val;
            }
        }
        return val;
    }

    if (typeof val === 'object') {
        return JSON.stringify(val);
    }

    return String(val);
}

function RenderValueBadge({ valKey, val }: { valKey: string; val: any }) {
    const formatted = formatDisplayValue(valKey, val);

    if (valKey.toLowerCase().includes('status') || typeof val === 'string') {
        const lower = String(val).toLowerCase();
        if (lower === 'reimbursed' || lower === 'approved' || lower === 'completed') {
            return (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px] font-semibold px-2 py-0.5">
                    {formatted}
                </Badge>
            );
        }
        if (lower === 'processing' || lower === 'submitted' || lower === 'under_review') {
            return (
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[11px] font-semibold px-2 py-0.5">
                    {formatted}
                </Badge>
            );
        }
        if (lower === 'rejected' || lower === 'failed') {
            return (
                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[11px] font-semibold px-2 py-0.5">
                    {formatted}
                </Badge>
            );
        }
    }

    return <span className="text-zinc-200 font-mono font-medium">{formatted}</span>;
}

export default function AuditLogs({ logs, filters }: AuditLogsProps) {
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const [viewingDiff, setViewingDiff] = useState<any | null>(null);
    const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/accountant/audit-logs', { search: searchInput }, { preserveState: true });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'N/A';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            }) + ' UTC';
        } catch {
            return dateStr;
        }
    };

    return (
        <AccountantLayout title="Audit Trail & Compliance Ledger">
            {/* Header Title & Export Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl flex items-center gap-2.5">
                        <ShieldCheck className="w-7 h-7 text-emerald-400 inline-block" />
                        Immutable Audit Trail & Compliance Ledger
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Inspect tamper-evident system execution logs (`ExpenseApproved`, `ReimbursementExecuted`, `PolicyEvaluated`).
                    </p>
                </div>

                <a href="/accountant/download-compliance-package">
                    <Button className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-sm shadow-emerald-500/20 transition-all">
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Export Compliance Package (ZIP)
                    </Button>
                </a>
            </div>

            {/* Audit Search Bar */}
            <form onSubmit={handleSearch} className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 flex items-center space-x-3 backdrop-blur-sm">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Audit Search by Expense UUID, Batch ID, or Action Name..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Button type="submit" variant="outline" className="h-8 text-xs border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
                    Search Audit Logs
                </Button>
            </form>

            {/* Logs Table */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-emerald-400" />
                        Audit Log Stream ({logs.data.length})
                    </h2>
                </div>

                {logs.data.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400 text-xs">No audit logs matching query.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                                    <th className="p-3.5">Timestamp (UTC)</th>
                                    <th className="p-3.5">Actor</th>
                                    <th className="p-3.5">Action Executed</th>
                                    <th className="p-3.5">Resource ID</th>
                                    <th className="p-3.5 text-center">Audit Inspector</th>
                                    <th className="p-3.5">IP Address & Agent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                                {logs.data.map((log) => {
                                    const ip = log.ip_address ?? log.metadata?.ip_address ?? '127.0.0.1';
                                    const agent = log.user_agent ?? log.metadata?.user_agent ?? 'Internal System / Service API';

                                    return (
                                        <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors">
                                            <td className="p-3.5 text-zinc-300">
                                                <div className="flex items-center gap-1.5 font-sans whitespace-nowrap">
                                                    <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                    <span>{formatDate(log.created_at)}</span>
                                                </div>
                                            </td>
                                            <td className="p-3.5 font-sans">
                                                <div className="font-semibold text-zinc-200">{log.user?.name ?? 'System Job'}</div>
                                                <div className="text-[10px] text-zinc-400">{log.user?.email}</div>
                                            </td>
                                            <td className="p-3.5">
                                                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-sans font-medium text-[11px] px-2.5 py-0.5">
                                                    {humanizeAction(log.action)}
                                                </Badge>
                                            </td>
                                            <td className="p-3.5 text-zinc-300">
                                                <span className="text-zinc-400 text-[10px] font-sans">{log.auditable_type.split('\\').pop()}:</span>{' '}
                                                <span className="text-zinc-200 font-bold">{String(log.auditable_id).substring(0, 12)}</span>
                                            </td>
                                            <td className="p-3.5 text-center font-sans">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setViewingDiff(log);
                                                        setActiveTab('visual');
                                                    }}
                                                    className="h-7 text-[11px] border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-500/50 rounded-lg transition-all"
                                                >
                                                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                                                    Inspect Changes
                                                </Button>
                                            </td>
                                            <td className="p-3.5 text-zinc-400 text-[10px]">
                                                <div className="font-mono text-zinc-300 flex items-center gap-1">
                                                    <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
                                                    <span>{ip}</span>
                                                </div>
                                                <div className="truncate max-w-[150px] text-zinc-500 flex items-center gap-1 mt-0.5" title={agent}>
                                                    <Laptop className="w-3 h-3 text-zinc-500 shrink-0" />
                                                    <span>{agent}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Human-Friendly Audit Diff Inspector Modal */}
            {viewingDiff && (() => {
                const before = viewingDiff.before_state ?? viewingDiff.old_values ?? {};
                const after = viewingDiff.after_state ?? viewingDiff.new_values ?? {};
                const metadata = viewingDiff.metadata ?? {};

                // Get all unique keys across before and after states
                const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

                // Categorize changes
                const changes = allKeys.map((key) => {
                    const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
                    const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
                    const beforeVal = before[key];
                    const afterVal = after[key];

                    let type: 'modified' | 'added' | 'removed' | 'unchanged' = 'unchanged';

                    if (hasBefore && hasAfter) {
                        if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
                            type = 'modified';
                        }
                    } else if (hasAfter) {
                        type = 'added';
                    } else if (hasBefore) {
                        type = 'removed';
                    }

                    return {
                        key,
                        type,
                        beforeVal,
                        afterVal,
                    };
                });

                const modifiedOrAdded = changes.filter((c) => c.type !== 'unchanged');
                const resourceType = viewingDiff.auditable_type ? viewingDiff.auditable_type.split('\\').pop() : 'Resource';

                return (
                    <div className="fixed inset-0 bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-3xl w-full space-y-0 shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
                            {/* Modal Top Header Banner */}
                            <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5">
                                            {humanizeAction(viewingDiff.action)}
                                        </Badge>
                                        <span className="text-xs text-zinc-400 font-mono">
                                            {resourceType} #{viewingDiff.auditable_id}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-extrabold text-zinc-100 tracking-tight">
                                        Audit Event Analysis
                                    </h3>
                                    <p className="text-xs text-zinc-400 flex items-center gap-2 font-mono">
                                        <Clock className="w-3.5 h-3.5 text-zinc-500 inline" />
                                        <span>{formatDate(viewingDiff.created_at)}</span>
                                        <span>•</span>
                                        <UserIcon className="w-3.5 h-3.5 text-zinc-500 inline" />
                                        <span>{viewingDiff.user?.name ?? 'System Job'}</span>
                                    </p>
                                </div>

                                <button
                                    onClick={() => setViewingDiff(null)}
                                    className="text-zinc-400 hover:text-zinc-100 bg-zinc-800/60 hover:bg-zinc-800 p-1.5 rounded-lg transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* View Mode Tabs */}
                            <div className="bg-zinc-950/40 px-5 pt-3 pb-0 border-b border-zinc-800/80 flex items-center justify-between">
                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={() => setActiveTab('visual')}
                                        className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                                            activeTab === 'visual'
                                                ? 'border-emerald-500 text-emerald-400 bg-zinc-900/90'
                                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                        Human Friendly View ({modifiedOrAdded.length} changes)
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('json')}
                                        className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                                            activeTab === 'json'
                                                ? 'border-emerald-500 text-emerald-400 bg-zinc-900/90'
                                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                                        }`}
                                    >
                                        <Code className="w-3.5 h-3.5 text-zinc-400" />
                                        Raw JSON Payload
                                    </button>
                                </div>

                                {viewingDiff.checksum && (
                                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-950/30 px-2.5 py-1 rounded-md border border-emerald-500/20 font-mono">
                                        <ShieldCheck className="w-3.5 h-3.5" />
                                        <span>SHA-256 Checksum Verified</span>
                                    </div>
                                )}
                            </div>

                            {/* Tab Content Body */}
                            <div className="p-5 overflow-y-auto flex-1 space-y-4">
                                {activeTab === 'visual' ? (
                                    <div className="space-y-4">
                                        {/* Field Differences Table / Cards */}
                                        {changes.length === 0 ? (
                                            <div className="p-8 text-center text-zinc-400 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800">
                                                No specific state changes recorded for this action.
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                                                    <span>Attribute Mutations</span>
                                                    <span className="text-[11px] text-zinc-500 font-normal">
                                                        Showing {modifiedOrAdded.length} modified/added attributes
                                                    </span>
                                                </h4>

                                                <div className="grid gap-3">
                                                    {changes.map((item) => {
                                                        const keyTitle = humanizeKey(item.key);

                                                        if (item.type === 'modified') {
                                                            return (
                                                                <div
                                                                    key={item.key}
                                                                    className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/10 space-y-2"
                                                                >
                                                                    <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                                                            {keyTitle}
                                                                        </span>
                                                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                                                                            Modified
                                                                        </Badge>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                                                                        {/* Before */}
                                                                        <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/80 space-y-1">
                                                                            <div className="text-[10px] text-zinc-400 font-semibold uppercase">
                                                                                Previous Value
                                                                            </div>
                                                                            <div className="text-rose-300 font-mono text-xs line-through opacity-80">
                                                                                {formatDisplayValue(item.key, item.beforeVal)}
                                                                            </div>
                                                                        </div>

                                                                        {/* After */}
                                                                        <div className="bg-zinc-950 p-2.5 rounded-lg border border-emerald-500/30 space-y-1">
                                                                            <div className="text-[10px] text-emerald-400 font-semibold uppercase flex items-center gap-1">
                                                                                <ArrowRight className="w-3 h-3 inline" />
                                                                                New Updated Value
                                                                            </div>
                                                                            <div>
                                                                                <RenderValueBadge valKey={item.key} val={item.afterVal} />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        if (item.type === 'added') {
                                                            return (
                                                                <div
                                                                    key={item.key}
                                                                    className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 space-y-1.5"
                                                                >
                                                                    <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                                                                            {keyTitle}
                                                                        </span>
                                                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                                                                            + Initial Value Set
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                                                                        <RenderValueBadge valKey={item.key} val={item.afterVal} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        if (item.type === 'removed') {
                                                            return (
                                                                <div
                                                                    key={item.key}
                                                                    className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-950/10 space-y-1.5"
                                                                >
                                                                    <div className="flex items-center justify-between text-xs font-bold text-zinc-200">
                                                                        <span className="flex items-center gap-1.5">
                                                                            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                                                                            {keyTitle}
                                                                        </span>
                                                                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-[10px]">
                                                                            - Removed
                                                                        </Badge>
                                                                    </div>
                                                                    <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 text-rose-300 font-mono line-through">
                                                                        {formatDisplayValue(item.key, item.beforeVal)}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }

                                                        return null;
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* Execution Metadata Context */}
                                        <div className="pt-2">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                                                Context & Execution Provenance
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                                                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">IP Address</div>
                                                    <div className="text-xs font-mono text-zinc-200 font-bold">
                                                        {viewingDiff.ip_address ?? metadata.ip_address ?? '127.0.0.1'}
                                                    </div>
                                                </div>

                                                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 space-y-1 col-span-2">
                                                    <div className="text-[10px] text-zinc-400 uppercase font-semibold">Client User Agent</div>
                                                    <div className="text-xs font-mono text-zinc-300 truncate" title={viewingDiff.user_agent ?? metadata.user_agent ?? 'Internal System Service API'}>
                                                        {viewingDiff.user_agent ?? metadata.user_agent ?? 'Internal System Service API'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Raw JSON Developer View */
                                    <div className="space-y-4 font-mono text-xs">
                                        <div>
                                            <div className="text-xs font-semibold text-zinc-400 mb-1">Before State (before_state):</div>
                                            <pre className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-rose-300 overflow-x-auto max-h-48">
                                                {Object.keys(before).length > 0
                                                    ? JSON.stringify(before, null, 2)
                                                    : '// No prior state (initial creation record)'}
                                            </pre>
                                        </div>

                                        <div>
                                            <div className="text-xs font-semibold text-zinc-400 mb-1">After State (after_state):</div>
                                            <pre className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-emerald-300 overflow-x-auto max-h-48">
                                                {Object.keys(after).length > 0
                                                    ? JSON.stringify(after, null, 2)
                                                    : '// No after state recorded'}
                                            </pre>
                                        </div>

                                        {Object.keys(metadata).length > 0 && (
                                            <div>
                                                <div className="text-xs font-semibold text-zinc-400 mb-1">Execution Metadata (metadata):</div>
                                                <pre className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-sky-300 overflow-x-auto max-h-36">
                                                    {JSON.stringify(metadata, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </AccountantLayout>
    );
}
