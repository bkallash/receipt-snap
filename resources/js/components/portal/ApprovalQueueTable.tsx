import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    Check,
    CheckCircle2,
    Clock,
    Eye,
    Filter,
    Search,
    User as UserIcon,
    XCircle,
} from 'lucide-react';
import React, { useState } from 'react';

interface ApprovalQueueTableProps {
    expenses: any[];
    categories: any[];
    selectedStatus?: string;
    onStatusChange?: (status: string) => void;
    onReviewExpense: (expense: any) => void;
    onQuickApprove: (expense: any) => void;
    onBulkApprove: (expenses: any[]) => void;
}

export default function ApprovalQueueTable({
    expenses = [],
    categories = [],
    selectedStatus: externalStatus,
    onStatusChange,
    onReviewExpense,
    onQuickApprove,
    onBulkApprove,
}: ApprovalQueueTableProps) {
    const [internalStatus, setInternalStatus] = useState<string>('pending');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);

    const activeStatus = externalStatus !== undefined ? externalStatus : internalStatus;

    const handleStatusSelect = (status: string) => {
        setInternalStatus(status);
        setSelectedExpenseIds([]);
        if (onStatusChange) {
            onStatusChange(status);
        }
    };

    const flaggedCount = expenses.filter((exp) => {
        const rawFlags = exp.policy_flags || exp.policyFlags || exp.metadata?.policy_flags || [];
        return Array.isArray(rawFlags) && rawFlags.length > 0;
    }).length;

    const filteredExpenses = expenses.filter((exp) => {
        // Status filter
        if (activeStatus === 'pending') {
            if (exp.status !== 'submitted' && exp.status !== 'under_review') return false;
        } else if (activeStatus === 'flagged') {
            const rawFlags = exp.policy_flags || exp.policyFlags || exp.metadata?.policy_flags || [];
            if (!Array.isArray(rawFlags) || rawFlags.length === 0) return false;
        } else if (activeStatus !== 'all') {
            if (exp.status !== activeStatus) return false;
        }

        // Category filter
        if (selectedCategory && String(exp.category?.id || exp.expense_category_id) !== selectedCategory) {
            return false;
        }

        // Search query (submitter name, email, or merchant name)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const submitterName = (exp.submitter?.name || exp.user?.name || '').toLowerCase();
            const submitterEmail = (exp.submitter?.email || exp.user?.email || '').toLowerCase();
            const merchant = (exp.merchant_name || '').toLowerCase();
            const description = (exp.description || '').toLowerCase();

            return (
                submitterName.includes(query) ||
                submitterEmail.includes(query) ||
                merchant.includes(query) ||
                description.includes(query)
            );
        }

        return true;
    });

    // Handle check all / toggle selection
    const isAllSelected =
        filteredExpenses.length > 0 &&
        filteredExpenses.every((exp) => selectedExpenseIds.includes(exp.id));

    const handleToggleAll = () => {
        if (isAllSelected) {
            setSelectedExpenseIds([]);
        } else {
            setSelectedExpenseIds(filteredExpenses.map((exp) => exp.id));
        }
    };

    const handleToggleRow = (id: string) => {
        if (selectedExpenseIds.includes(id)) {
            setSelectedExpenseIds((prev) => prev.filter((item) => item !== id));
        } else {
            setSelectedExpenseIds((prev) => [...prev, id]);
        }
    };

    const handleTriggerBulkApprove = () => {
        const selectedObjects = expenses.filter((e) => selectedExpenseIds.includes(e.id));
        onBulkApprove(selectedObjects);
        setSelectedExpenseIds([]);
    };

    const formatCurrency = (val: number, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(val || 0);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="border-rose-500/20 bg-rose-500/10 text-rose-400">
                        <XCircle className="mr-1 h-3 w-3" /> Rejected
                    </Badge>
                );
            case 'submitted':
            case 'under_review':
                return (
                    <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-400">
                        <Clock className="mr-1 h-3 w-3" /> Pending Review
                    </Badge>
                );
            default:
                return <Badge className="bg-zinc-800 text-zinc-300">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            {/* Header Controls & Filter Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Status Tabs - Scrollable on mobile */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
                    <button
                        onClick={() => handleStatusSelect('pending')}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            activeStatus === 'pending'
                                ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Pending Review
                    </button>
                    <button
                        onClick={() => handleStatusSelect('flagged')}
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            activeStatus === 'flagged'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                        Policy Warnings ({flaggedCount})
                    </button>
                    <button
                        onClick={() => handleStatusSelect('approved')}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            activeStatus === 'approved'
                                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => handleStatusSelect('rejected')}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            activeStatus === 'rejected'
                                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Rejected
                    </button>
                    <button
                        onClick={() => handleStatusSelect('all')}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            activeStatus === 'all'
                                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        All Claims
                    </button>
                </div>

                {/* Bulk Action & Search Inputs */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {selectedExpenseIds.length > 0 && (
                        <Button
                            onClick={handleTriggerBulkApprove}
                            className="bg-emerald-500 font-semibold text-zinc-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400 text-xs py-1.5"
                        >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 stroke-[2.5]" />
                            Approve Selected ({selectedExpenseIds.length})
                        </Button>
                    )}

                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                        <input
                            type="text"
                            placeholder="Search submitter or merchant..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Card List View (Visible on Small Screens) */}
            <div className="block sm:hidden space-y-3">
                {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((exp) => {
                        const submitter = exp.submitter || exp.user;
                        const isSelected = selectedExpenseIds.includes(exp.id);
                        const rawFlags = exp.policy_flags || exp.policyFlags || exp.metadata?.policy_flags || [];
                        const hasFlags = Array.isArray(rawFlags) && rawFlags.length > 0;

                        return (
                            <div
                                key={exp.id}
                                className={`rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3 shadow-md ${
                                    isSelected ? 'border-emerald-500/50 bg-emerald-500/5' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleRow(exp.id)}
                                            className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/20"
                                        />
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 font-bold text-emerald-400 text-xs shrink-0">
                                            {submitter?.name ? submitter.name.charAt(0).toUpperCase() : 'E'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-zinc-100">{exp.merchant_name || 'Expense Claim'}</h4>
                                            <p className="text-xs text-zinc-400">{submitter?.name || 'Employee'}</p>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-sm font-black text-emerald-400 block">
                                            {formatCurrency(exp.amount, exp.currency_code)}
                                        </span>
                                        <span className="text-[10px] text-zinc-500">{exp.expense_date || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/60 pt-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(exp.status)}
                                        {hasFlags && (
                                            <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] py-0.5">
                                                <AlertTriangle className="mr-1 h-3 w-3" /> Flagged
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => onReviewExpense(exp)}
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 px-2 text-xs text-zinc-300 hover:bg-zinc-800"
                                        >
                                            <Eye className="mr-1 h-3.5 w-3.5 text-emerald-400" /> Review
                                        </Button>
                                        {(exp.status === 'submitted' || exp.status === 'under_review') && (
                                            <Button
                                                onClick={() => onQuickApprove(exp)}
                                                size="sm"
                                                className="h-8 bg-emerald-500 text-zinc-950 font-bold px-3 hover:bg-emerald-400 text-xs"
                                            >
                                                <Check className="mr-1 h-3.5 w-3.5" /> Approve
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
                        No team expense claims found matching your criteria.
                    </div>
                )}
            </div>

            {/* Desktop Table View (Hidden on Small Screens) */}
            <div className="hidden sm:block overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/40 shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="border-b border-zinc-800/80 bg-zinc-900/80 uppercase tracking-wider text-zinc-400 font-medium">
                            <tr>
                                <th className="px-4 py-3.5 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={handleToggleAll}
                                        className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/20"
                                    />
                                </th>
                                <th className="px-4 py-3.5">Submitter Employee</th>
                                <th className="px-4 py-3.5">Merchant / Item</th>
                                <th className="px-4 py-3.5">Category</th>
                                <th className="px-4 py-3.5">Amount</th>
                                <th className="px-4 py-3.5">Date</th>
                                <th className="px-4 py-3.5 text-center">Policy Status</th>
                                <th className="px-4 py-3.5 text-center">Status</th>
                                <th className="px-4 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50 text-zinc-300">
                            {filteredExpenses.length > 0 ? (
                                filteredExpenses.map((exp) => {
                                    const submitter = exp.submitter || exp.user;
                                    const isSelected = selectedExpenseIds.includes(exp.id);
                                    const rawFlags = exp.policy_flags || exp.policyFlags || exp.metadata?.policy_flags || [];
                                    const hasFlags = Array.isArray(rawFlags) && rawFlags.length > 0;

                                    return (
                                        <tr
                                            key={exp.id}
                                            className={`transition-colors hover:bg-zinc-900/60 ${
                                                isSelected ? 'bg-emerald-500/5' : ''
                                            }`}
                                        >
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleRow(exp.id)}
                                                    className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/20"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 font-bold text-emerald-400 text-[11px]">
                                                        {submitter?.name ? submitter.name.charAt(0).toUpperCase() : 'E'}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-zinc-100">
                                                            {submitter?.name || 'Employee'}
                                                        </p>
                                                        <p className="text-[10px] text-zinc-500">
                                                            {submitter?.email || 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-zinc-200">
                                                {exp.merchant_name || 'Expense Claim'}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400">
                                                {exp.category?.name || 'General'}
                                            </td>
                                            <td className="px-4 py-3 font-extrabold text-emerald-400">
                                                {formatCurrency(exp.amount, exp.currency_code)}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400">
                                                {exp.expense_date || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {hasFlags ? (
                                                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] py-0.5">
                                                        <AlertTriangle className="mr-1 h-3 w-3" /> Flagged ({rawFlags.length})
                                                    </Badge>
                                                ) : (
                                                    <span className="text-[10px] text-emerald-400/80 font-medium">Clear</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {getStatusBadge(exp.status)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        onClick={() => onReviewExpense(exp)}
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                                                        title="Review Side-by-Side"
                                                    >
                                                        <Eye className="mr-1 h-3.5 w-3.5 text-emerald-400" /> Review
                                                    </Button>

                                                    {(exp.status === 'submitted' || exp.status === 'under_review') && (
                                                        <Button
                                                            onClick={() => onQuickApprove(exp)}
                                                            size="sm"
                                                            className="h-8 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-zinc-950 font-medium border border-emerald-500/30"
                                                            title="Quick Approve"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-zinc-500 text-xs">
                                        No team expense claims found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
