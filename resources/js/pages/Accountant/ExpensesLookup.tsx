import React, { useState } from 'react';
import AccountantLayout from '@/layouts/AccountantLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { router } from '@inertiajs/react';
import {
    Search,
    Eye,
    Receipt as ReceiptIcon,
    Clock,
    CheckCircle2,
    X
} from 'lucide-react';

interface ExpensesLookupProps {
    expenses: {
        data: Array<{
            id: number;
            uuid: string;
            merchant_name: string;
            amount: number;
            currency_code: string;
            status: string;
            expense_date: string;
            submitted_at: string | null;
            approved_at: string | null;
            rejected_at: string | null;
            reimbursed_at: string | null;
            user?: { name: string; email: string };
            category?: { name: string; gl_code: string | null };
            receipt?: { image_url?: string };
            lineItems?: Array<{ description: string; quantity: number; unit_price: number; total_price: number }>;
            approvalSteps?: Array<{ step_order: number; status: string; approver?: { name: string } }>;
        }>;
    };
    filters: { search?: string; status?: string };
}

export default function ExpensesLookup({ expenses, filters }: ExpensesLookupProps) {
    const [searchInput, setSearchInput] = useState(filters.search ?? '');
    const [statusFilter, setStatusFilter] = useState(filters.status ?? 'all');
    const [selectedExpense, setSelectedExpense] = useState<any | null>(null);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/accountant/expenses', {
            search: searchInput,
            status: statusFilter === 'all' ? undefined : statusFilter
        }, { preserveState: true });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Approved 🟢</Badge>;
            case 'reimbursed':
                return <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400">Reimbursed 🟣</Badge>;
            case 'rejected':
                return <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-400">Rejected 🔴</Badge>;
            case 'submitted':
                return <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Submitted 🟡</Badge>;
            default:
                return <Badge className="border-zinc-800 bg-zinc-900 text-zinc-300">{status.toUpperCase()}</Badge>;
        }
    };

    return (
        <AccountantLayout title="All Expenses Directory">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        Organization-Wide Expenses Search Directory
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Complete directory across all expense lifecycle states (Draft, Submitted, Approved, Rejected, Reimbursed).
                    </p>
                </div>
            </div>

            {/* Global Search & Filters */}
            <form onSubmit={handleSearch} className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 flex flex-col md:flex-row items-center gap-3 backdrop-blur-sm">
                <div className="flex-1 flex items-center space-x-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 w-full">
                    <Search className="w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Search merchant, employee name, or expense UUID..."
                        className="w-full bg-transparent text-zinc-200 text-xs focus:outline-none"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                    <option value="all">All Expense Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="reimbursed">Reimbursed</option>
                    <option value="rejected">Rejected</option>
                </select>

                <Button type="submit" className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-sm shadow-emerald-500/20">
                    Lookup
                </Button>
            </form>

            {/* Expenses Table */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                                <th className="p-3.5">Expense ID & Date</th>
                                <th className="p-3.5">Employee</th>
                                <th className="p-3.5">Merchant</th>
                                <th className="p-3.5">Category & GL</th>
                                <th className="p-3.5 text-right">Total Amount</th>
                                <th className="p-3.5 text-center">Status</th>
                                <th className="p-3.5 text-right">Inspect Drawer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {expenses.data.map((exp) => (
                                <tr key={exp.id} className="hover:bg-zinc-800/40 transition-colors">
                                    <td className="p-3.5">
                                        <div className="font-mono font-semibold text-zinc-200 text-[11px]">{exp.uuid.substring(0, 8)}...</div>
                                        <div className="text-[10px] text-zinc-400">{exp.expense_date}</div>
                                    </td>
                                    <td className="p-3.5">
                                        <div className="font-semibold text-zinc-200">{exp.user?.name ?? 'N/A'}</div>
                                        <div className="text-[10px] text-zinc-400">{exp.user?.email}</div>
                                    </td>
                                    <td className="p-3.5 font-medium text-zinc-200">{exp.merchant_name}</td>
                                    <td className="p-3.5">
                                        <div className="text-zinc-300">{exp.category?.name ?? 'Uncategorized'}</div>
                                        <span className="font-mono text-[10px] text-emerald-400">{exp.category?.gl_code ?? 'GL-UNMAPPED'}</span>
                                    </td>
                                    <td className="p-3.5 text-right font-bold text-emerald-400">
                                        {formatCurrency(Number(exp.amount))}
                                    </td>
                                    <td className="p-3.5 text-center">{getStatusBadge(exp.status)}</td>
                                    <td className="p-3.5 text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setSelectedExpense(exp)}
                                            className="h-7 text-[11px] border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                        >
                                            <Eye className="mr-1 h-3 w-3 text-emerald-400" /> Inspect
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Complete Detail View Drawer */}
            {selectedExpense && (
                <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex justify-end z-50">
                    <div className="w-full max-w-lg bg-zinc-900 border-l border-zinc-800 h-full p-6 space-y-6 overflow-y-auto relative shadow-2xl">
                        <button onClick={() => setSelectedExpense(null)} className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-200">
                            <X className="w-5 h-5" />
                        </button>

                        <div>
                            <div className="text-xs text-emerald-400 font-mono font-semibold">EXPENSE DRAWER</div>
                            <h3 className="text-lg font-bold text-zinc-100">{selectedExpense.merchant_name}</h3>
                            <div className="text-xs text-zinc-400 font-mono mt-0.5">UUID: {selectedExpense.uuid}</div>
                        </div>

                        {/* Status & Amount Overview */}
                        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                            <div>
                                <div className="text-xs text-zinc-400">Total Amount</div>
                                <div className="text-xl font-bold text-emerald-400">{formatCurrency(Number(selectedExpense.amount))}</div>
                            </div>
                            <div>{getStatusBadge(selectedExpense.status)}</div>
                        </div>

                        {/* Line Items Breakdown */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Line Items</h4>
                            {(!selectedExpense.lineItems || selectedExpense.lineItems.length === 0) ? (
                                <div className="text-xs text-zinc-400 italic">No line items itemized.</div>
                            ) : (
                                <div className="space-y-1 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs">
                                    {selectedExpense.lineItems.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between py-1 border-b border-zinc-900 last:border-0">
                                            <span className="text-zinc-300">{item.description} (x{item.quantity})</span>
                                            <span className="text-zinc-200 font-medium">{formatCurrency(Number(item.total_price ?? (item.quantity * item.unit_price)))}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Approval History Timeline */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Approval Timeline</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center space-x-2 text-zinc-400">
                                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Expense Date: {selectedExpense.expense_date}</span>
                                </div>
                                {selectedExpense.submitted_at && (
                                    <div className="flex items-center space-x-2 text-zinc-400">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Submitted: {selectedExpense.submitted_at}</span>
                                    </div>
                                )}
                                {selectedExpense.approved_at && (
                                    <div className="flex items-center space-x-2 text-emerald-400">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Approved: {selectedExpense.approved_at}</span>
                                    </div>
                                )}
                                {selectedExpense.reimbursed_at && (
                                    <div className="flex items-center space-x-2 text-indigo-400">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>Reimbursed: {selectedExpense.reimbursed_at}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AccountantLayout>
    );
}
