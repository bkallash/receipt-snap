import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import {
    AlertCircle,
    AlertTriangle,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    DollarSign,
    FileText,
    Loader2,
    Receipt,
    UserCheck,
    X,
    XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ExpenseDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    expense: any;
}

export default function ExpenseDetailDrawer({
    isOpen,
    onClose,
    expense,
}: ExpenseDetailDrawerProps) {
    const [detailExpense, setDetailExpense] = useState<any>(expense);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

    useEffect(() => {
        setDetailExpense(expense);
        if (!isOpen || !expense?.id) return;

        setIsLoadingDetails(true);
        apiFetch(`/api/v1/expenses/${expense.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.data) {
                    setDetailExpense(data.data);
                }
            })
            .catch(() => {})
            .finally(() => setIsLoadingDetails(false));
    }, [isOpen, expense?.id]);

    if (!isOpen || !expense) return null;

    const currentExp = detailExpense || expense;

    const images = currentExp.receipt_images || currentExp.receiptImages || [];
    const receiptImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
    const receiptImageUrl = receiptImage?.url || receiptImage?.file_path;

    const rawPolicyFlags = currentExp.policy_flags || currentExp.policyFlags || currentExp.metadata?.policy_flags || [];
    const policyFlags = Array.isArray(rawPolicyFlags) ? rawPolicyFlags : [];

    const rawLineItems = currentExp.line_items || currentExp.lineItems || [];
    const lineItems = Array.isArray(rawLineItems) ? rawLineItems : [];

    const rawSteps = currentExp.approval_steps || currentExp.approvalSteps || [];
    const approvalSteps = Array.isArray(rawSteps) ? rawSteps : [];

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currentExp.currency_code || 'USD',
        }).format(val || 0);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
                    </Badge>
                );
            case 'rejected':
                return (
                    <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20">
                        <XCircle className="mr-1 h-3 w-3" /> Rejected
                    </Badge>
                );
            case 'submitted':
            case 'under_review':
                return (
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                        <Clock className="mr-1 h-3 w-3" /> Under Review
                    </Badge>
                );
            default:
                return (
                    <Badge className="bg-zinc-800 text-zinc-300">
                        {status}
                    </Badge>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex h-full w-full max-w-xl flex-col border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-100">
                                {currentExp.merchant_name || 'Expense Details'}
                            </h3>
                            <p className="text-[11px] text-zinc-400">
                                ID: {currentExp.id}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoadingDetails && (
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400 animate-pulse">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading latest line items & details...
                        </div>
                    )}

                    {/* Status & Amount Highlight */}
                    <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <div>
                            <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                                Claim Amount
                            </span>
                            <h2 className="text-3xl font-extrabold tracking-tight text-emerald-400">
                                {formatCurrency(currentExp.amount)}
                            </h2>
                        </div>
                        <div>{getStatusBadge(currentExp.status)}</div>
                    </div>

                    {/* Rejection Reason Alert if rejected */}
                    {currentExp.status === 'rejected' && (
                        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
                            <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                                <XCircle className="h-4 w-4" />
                                Manager Rejection Reason
                            </div>
                            <p className="mt-1.5 text-xs text-rose-200/90">
                                "{currentExp.rejection_reason || 'No specific comment provided.'}"
                            </p>
                        </div>
                    )}

                    {/* Metadata Summary Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                            <span className="text-zinc-500">Category</span>
                            <p className="mt-1 font-semibold text-zinc-200">
                                {currentExp.category?.name || 'Uncategorized'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                            <span className="text-zinc-500">Expense Date</span>
                            <p className="mt-1 font-semibold text-zinc-200">
                                {currentExp.expense_date || 'N/A'}
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                            <span className="text-zinc-500">Payment Method</span>
                            <p className="mt-1 font-semibold text-zinc-200 capitalize">
                                {typeof currentExp.payment_method === 'string'
                                    ? currentExp.payment_method.replace('_', ' ')
                                    : (currentExp.payment_method?.value?.replace('_', ' ') || 'Corporate Card')}
                            </p>
                        </div>

                        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                            <span className="text-zinc-500">Tax / Tip</span>
                            <p className="mt-1 font-semibold text-zinc-200">
                                Tax: ${currentExp.tax_amount || '0.00'} | Tip: ${currentExp.tip_amount || '0.00'}
                            </p>
                        </div>
                    </div>

                    {/* Policy Flags if any */}
                    {policyFlags.length > 0 && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                                <AlertTriangle className="h-4 w-4" />
                                Automated Policy Flags
                            </div>
                            <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
                                {policyFlags.map((flag: any, idx: number) => (
                                    <li key={idx}>• {flag.message || flag.code}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Itemized Line Items Breakdown */}
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Itemized Line Items ({lineItems.length})
                        </h4>
                        {lineItems.length > 0 ? (
                            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
                                <table className="w-full text-left text-xs">
                                    <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                                        <tr>
                                            <th className="px-3 py-2">Item Description</th>
                                            <th className="px-2 py-2 text-center">Quantity (Qt)</th>
                                            <th className="px-3 py-2 text-right">Unit Price</th>
                                            <th className="px-3 py-2 text-right">Total Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                                        {lineItems.map((item: any, idx: number) => (
                                            <tr key={item.id || idx}>
                                                <td className="px-3 py-2.5 font-medium text-zinc-200">
                                                    {item.description}
                                                </td>
                                                <td className="px-2 py-2.5 text-center font-medium">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-3 py-2.5 text-right text-zinc-400">
                                                    ${Number(item.unit_price || 0).toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-bold text-emerald-400">
                                                    ${Number(item.total_price || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                                No itemized purchase line items extracted for this claim.
                            </div>
                        )}
                    </div>

                    {/* Attached Receipt Image */}
                    {receiptImageUrl && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Attached Scanned Image
                            </h4>
                            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-2">
                                <img
                                    src={receiptImageUrl}
                                    alt="Receipt attachment"
                                    className="max-h-80 w-full object-contain rounded-lg"
                                />
                            </div>
                        </div>
                    )}

                    {/* Approval Step Audit Log Timeline */}
                    {approvalSteps.length > 0 && (
                        <div className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Approval Process Timeline
                            </h4>
                            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                                {approvalSteps.map((step: any) => (
                                    <div
                                        key={step.id}
                                        className="flex items-start gap-3 text-xs"
                                    >
                                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                                            <UserCheck className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-zinc-200">
                                                {step.approver?.name || 'Manager'}{' '}
                                                <span className="font-normal text-zinc-400">
                                                    ({step.status})
                                                </span>
                                            </p>
                                            {step.comment && (
                                                <p className="mt-1 italic text-zinc-400">
                                                    "{step.comment}"
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Drawer Footer */}
                <div className="border-t border-zinc-800 bg-zinc-900/60 px-6 py-4 text-right">
                    <Button
                        onClick={onClose}
                        className="bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
