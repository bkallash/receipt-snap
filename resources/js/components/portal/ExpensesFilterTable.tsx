import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Eye,
    FileEdit,
    Filter,
    Receipt,
    Search,
    Send,
    Trash2,
    XCircle,
} from 'lucide-react';
import React, { useState } from 'react';

interface ExpensesFilterTableProps {
    expenses: any[];
    categories: any[];
    onEditDraft: (expense: any) => void;
    onViewDetail: (expense: any) => void;
    onSubmitExpense: (expense: any) => void;
    onDeleteDraft: (expense: any) => void;
}

export default function ExpensesFilterTable({
    expenses,
    categories,
    onEditDraft,
    onViewDetail,
    onSubmitExpense,
    onDeleteDraft,
}: ExpensesFilterTableProps) {
    const [selectedTab, setSelectedTab] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

    // Filter logic
    const filteredExpenses = expenses.filter((expense) => {
        // Tab Status filter
        if (selectedTab === 'drafts') {
            if (expense.status !== 'draft' && expense.status !== 'pending_scan') return false;
        } else if (selectedTab === 'pending') {
            if (expense.status !== 'submitted' && expense.status !== 'under_review') return false;
        } else if (selectedTab === 'approved') {
            if (expense.status !== 'approved') return false;
        } else if (selectedTab === 'rejected') {
            if (expense.status !== 'rejected') return false;
        }

        // Category filter
        if (selectedCategoryId !== 'all') {
            const catId = expense.category?.id || expense.expense_category_id;
            if (String(catId) !== selectedCategoryId) return false;
        }

        // Search query filter (merchant name or description)
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            const merchant = (expense.merchant_name || '').toLowerCase();
            const desc = (expense.description || '').toLowerCase();
            if (!merchant.includes(q) && !desc.includes(q)) return false;
        }

        return true;
    });

    const formatCurrency = (val: number, currency: string = 'USD') => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(val || 0);
    };

    const renderStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-400">
                        <XCircle className="mr-1 h-3 w-3" /> Rejected
                    </Badge>
                );
            case 'submitted':
            case 'under_review':
                return (
                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                        <Clock className="mr-1 h-3 w-3" /> Under Review
                    </Badge>
                );
            case 'pending_scan':
                return (
                    <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300 animate-pulse">
                        Scanning Receipt...
                    </Badge>
                );
            default:
                return (
                    <Badge className="border-zinc-700 bg-zinc-800 text-zinc-300">
                        Draft
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-4">
            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {/* Tabs */}
                <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
                    {[
                        { id: 'all', label: 'All Expenses' },
                        { id: 'drafts', label: 'Drafts' },
                        { id: 'pending', label: 'Pending Review' },
                        { id: 'approved', label: 'Approved' },
                        { id: 'rejected', label: 'Rejected' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setSelectedTab(tab.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                selectedTab === tab.id
                                    ? 'bg-emerald-500 font-semibold text-zinc-950 shadow-sm'
                                    : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search & Category Filter */}
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                        <Input
                            placeholder="Search merchant..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 w-44 pl-8 text-xs border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500"
                        />
                    </div>

                    <select
                        value={selectedCategoryId}
                        onChange={(e) => setSelectedCategoryId(e.target.value)}
                        className="h-8 rounded-md border border-zinc-800 bg-zinc-900 px-2 text-xs text-zinc-300 focus:border-emerald-500 focus:outline-none"
                    >
                        <option value="all">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Expenses List / Table */}
            {filteredExpenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
                    <Receipt className="mx-auto h-12 w-12 text-zinc-600 stroke-[1.5]" />
                    <h3 className="mt-3 text-sm font-semibold text-zinc-300">
                        No expenses found
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                        {searchQuery || selectedTab !== 'all'
                            ? 'Try adjusting your filters or search terms.'
                            : 'Upload your first receipt using the dropzone above.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                                <tr>
                                    <th className="px-4 py-3">Merchant / Seller</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60">
                                {filteredExpenses.map((expense) => {
                                    const isDraft =
                                        expense.status === 'draft' ||
                                        expense.status === 'pending_scan';
                                    const policyFlags =
                                        expense.policy_flags ||
                                        expense.metadata?.policy_flags ||
                                        [];

                                    return (
                                        <tr
                                            key={expense.id}
                                            className="transition-colors hover:bg-zinc-800/30"
                                        >
                                            {/* Merchant */}
                                            <td className="px-4 py-3 font-semibold text-zinc-100">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span>
                                                            {expense.merchant_name ||
                                                                'Unnamed Merchant'}
                                                        </span>
                                                    </div>
                                                    {policyFlags.length > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
                                                            <AlertTriangle className="h-3 w-3 shrink-0" />
                                                            <span className="truncate max-w-[220px]">
                                                                {policyFlags[0].message || policyFlags[0].code}
                                                                {policyFlags.length > 1 ? ` (+${policyFlags.length - 1} more)` : ''}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td className="px-4 py-3 text-zinc-400">
                                                {expense.category?.name || 'Uncategorized'}
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                                                {expense.expense_date || 'N/A'}
                                            </td>

                                            {/* Amount */}
                                            <td className="px-4 py-3 text-right font-bold text-emerald-400 whitespace-nowrap">
                                                {formatCurrency(
                                                    expense.amount,
                                                    expense.currency_code
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {renderStatusBadge(expense.status)}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {isDraft ? (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => onEditDraft(expense)}
                                                                className="h-7 bg-emerald-500/10 px-2 text-[11px] font-medium text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-zinc-950"
                                                            >
                                                                <FileEdit className="mr-1 h-3 w-3" />
                                                                Edit & Review
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                onClick={() => onSubmitExpense(expense)}
                                                                className="h-7 bg-emerald-500 px-2 text-[11px] font-semibold text-zinc-950 hover:bg-emerald-400"
                                                            >
                                                                <Send className="h-3 w-3" />
                                                            </Button>

                                                            <button
                                                                onClick={() => onDeleteDraft(expense)}
                                                                className="p-1 text-zinc-500 hover:text-rose-400"
                                                                title="Delete Draft"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => onViewDetail(expense)}
                                                            className="h-7 border-zinc-800 bg-zinc-900 px-2.5 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                                        >
                                                            <Eye className="mr-1 h-3 w-3 text-emerald-400" />
                                                            View Details
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
