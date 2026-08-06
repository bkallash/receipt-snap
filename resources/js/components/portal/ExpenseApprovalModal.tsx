import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import {
    AlertTriangle,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Loader2,
    Receipt,
    User as UserIcon,
    X,
    XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface ExpenseApprovalModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense: any;
    onApproveSuccess: (expense: any) => void;
    onRejectSuccess: (expense: any) => void;
}

export default function ExpenseApprovalModal({
    isOpen,
    onClose,
    expense,
    onApproveSuccess,
    onRejectSuccess,
}: ExpenseApprovalModalProps) {
    const [detailExpense, setDetailExpense] = useState<any>(expense);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [showRejectInput, setShowRejectInput] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        setDetailExpense(expense);
        setRejectionReason('');
        setShowRejectInput(false);
        setErrorMsg(null);

        if (!isOpen || !expense?.id) return;

        setIsLoadingDetails(true);
        apiFetch(`/api/v1/expenses/${expense.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.data) {
                    // Keep caller-supplied context (can_decide, is_own_claim,
                    // department_name) that the API resource does not return.
                    setDetailExpense({ ...expense, ...data.data });
                }
            })
            .catch(() => {})
            .finally(() => setIsLoadingDetails(false));
    }, [isOpen, expense?.id]);

    if (!isOpen || !expense) return null;

    const currentExp = detailExpense || expense;

    const images = currentExp.receipt_images || currentExp.receiptImages || [];
    const receiptImage = Array.isArray(images) && images.length > 0 ? images[0] : null;
    const receiptImageUrl = receiptImage?.url ? receiptImage.url : (receiptImage?.id ? `/portal/receipt-images/${receiptImage.id}/file` : null);

    const rawPolicyFlags = currentExp.policy_flags || currentExp.policyFlags || currentExp.metadata?.policy_flags || [];
    const policyFlags = Array.isArray(rawPolicyFlags) ? rawPolicyFlags : [];

    const rawLineItems = currentExp.line_items || currentExp.lineItems || [];
    const lineItems = Array.isArray(rawLineItems) ? rawLineItems : [];

    const rawApprovalSteps = currentExp.approval_steps || currentExp.approvalSteps || [];
    const approvalSteps = Array.isArray(rawApprovalSteps) ? rawApprovalSteps : [];

    // Callers that know the viewer cannot decide (e.g. their own claim) pass
    // can_decide explicitly; other callers leave it undefined and keep the actions.
    const canDecide = currentExp.can_decide !== false;

    const submitter = currentExp.submitter || currentExp.user;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currentExp.currency_code || 'USD',
        }).format(val || 0);
    };

    const handleApprove = async () => {
        setIsSubmitting(true);
        setErrorMsg(null);
        try {
            const res = await apiFetch(`/api/v1/expenses/${currentExp.id}/approve`, {
                method: 'POST',
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to approve expense.');
            }

            const data = await res.json();
            onApproveSuccess(data.data || currentExp);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'An error occurred during approval.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setErrorMsg('Please provide a reason for rejecting this expense claim.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        try {
            const res = await apiFetch(`/api/v1/expenses/${currentExp.id}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: rejectionReason,
                }),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to reject expense.');
            }

            const data = await res.json();
            onRejectSuccess(data.data || currentExp);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'An error occurred during rejection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-zinc-100">
                                Review Expense Claim — {currentExp.merchant_name || 'Expense'}
                            </h3>
                            <p className="text-xs text-zinc-400">
                                Submitter: <span className="font-semibold text-zinc-200">{submitter?.name || 'Employee'}</span> ({submitter?.email})
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="border-b border-rose-500/30 bg-rose-500/10 px-6 py-2.5 text-xs text-rose-300 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-rose-400" />
                            {errorMsg}
                        </span>
                        <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Main Side-by-Side Body */}
                <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:overflow-hidden lg:grid-cols-12">
                    {/* Left Column: Attached Receipt Image Preview (5 cols) */}
                    <div className="flex flex-col border-b border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 lg:col-span-5 lg:border-r lg:border-b-0">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Receipt Document Verification
                        </h4>
                        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                            {receiptImageUrl ? (
                                <img
                                    src={receiptImageUrl}
                                    alt="Scanned Receipt Image"
                                    className="max-h-[40vh] lg:max-h-[60vh] w-full object-contain rounded-lg shadow-md"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-2 p-8 text-center text-zinc-500">
                                    <Receipt className="h-12 w-12 stroke-1 text-zinc-600" />
                                    <p className="text-xs font-medium">No original receipt image attached</p>
                                    <p className="text-[11px] text-zinc-600">Manual entry claim</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: AI Extraction & Details Verification (7 cols) */}
                    <div className="flex flex-col overflow-y-auto p-4 sm:p-6 lg:col-span-7 space-y-6">
                        {isLoadingDetails && (
                            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400 animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading detailed itemization & verification data...
                            </div>
                        )}

                        {/* Amount & Status Card */}
                        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                            <div>
                                <span className="text-[11px] uppercase tracking-wider text-zinc-400">
                                    Claim Total Amount
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-400">
                                    {formatCurrency(currentExp.amount)}
                                </h2>
                            </div>
                            <div className="text-right">
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 px-3 py-1 text-xs">
                                    <Clock className="mr-1.5 h-3.5 w-3.5" /> Pending Approval
                                </Badge>
                            </div>
                        </div>

                        {/* Summary Details Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3">
                                <span className="text-zinc-500">Category</span>
                                <p className="mt-1 font-semibold text-zinc-200 truncate">
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
                                <p className="mt-1 font-semibold text-zinc-200 capitalize truncate">
                                    {typeof currentExp.payment_method === 'string'
                                        ? currentExp.payment_method.replace('_', ' ')
                                        : (currentExp.payment_method?.value?.replace('_', ' ') || 'Out of Pocket')}
                                </p>
                            </div>
                        </div>

                        {/* Policy Flags Alert if present */}
                        {policyFlags.length > 0 && (
                            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    Policy Enforcement Flags Detected
                                </div>
                                <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
                                    {policyFlags.map((flag: any, idx: number) => (
                                        <li key={idx}>• {flag.message || flag.code}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Line Items Extraction Table */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Line Item Breakdown ({lineItems.length})
                            </h4>
                            {lineItems.length > 0 ? (
                                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/40">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-400">
                                            <tr>
                                                <th className="px-3 py-2">Item Description</th>
                                                <th className="px-2 py-2 text-center">Qt</th>
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
                                    No itemized purchase breakdown extracted for this claim.
                                </div>
                            )}
                        </div>

                        {/* Approval History */}
                        {approvalSteps.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Approval History
                                </h4>
                                <ol className="space-y-2">
                                    {approvalSteps.map((step: any, idx: number) => (
                                        <li
                                            key={step.id || idx}
                                            className="flex items-start justify-between gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-zinc-200 capitalize">
                                                    {String(step.status || '').replace(/_/g, ' ')}
                                                    <span className="ml-1.5 font-normal text-zinc-500">
                                                        by {step.approver?.name || 'Pending approver'}
                                                    </span>
                                                </p>
                                                {step.comment && (
                                                    <p className="mt-0.5 text-[11px] text-zinc-400">{step.comment}</p>
                                                )}
                                            </div>
                                            <span className="shrink-0 text-[10px] text-zinc-500">
                                                {step.acted_at
                                                    ? new Date(step.acted_at).toLocaleDateString()
                                                    : 'Awaiting'}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {/* Rejection Form Input */}
                        {showRejectInput && (
                            <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-4 space-y-2 animate-in fade-in duration-150">
                                <label className="block text-xs font-semibold text-rose-300">
                                    Mandatory Rejection Comment / Reason
                                </label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="Explain why this expense claim is being rejected (e.g. Invalid receipt image, policy violation)..."
                                    className="w-full rounded-lg border border-rose-500/30 bg-zinc-900 p-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                    rows={3}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-900/80 px-4 py-3 sm:px-6 sm:py-4">
                    <Button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs h-9"
                    >
                        Cancel
                    </Button>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {!canDecide ? (
                            <p className="flex items-center gap-1.5 text-xs text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                {currentExp.is_own_claim
                                    ? 'You cannot decide your own claim.'
                                    : 'This claim is no longer awaiting a decision.'}
                            </p>
                        ) : (
                            <>
                                {!showRejectInput ? (
                                    <Button
                                        onClick={() => setShowRejectInput(true)}
                                        disabled={isSubmitting}
                                        variant="outline"
                                        className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 text-xs h-9"
                                    >
                                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                        Reject...
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={handleReject}
                                        disabled={isSubmitting || !rejectionReason.trim()}
                                        className="bg-rose-600 text-white hover:bg-rose-500 text-xs h-9"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        Confirm Rejection
                                    </Button>
                                )}

                                <Button
                                    onClick={handleApprove}
                                    disabled={isSubmitting}
                                    className="bg-emerald-500 font-semibold text-zinc-950 shadow-md shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.98] text-xs h-9"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 stroke-[2.5]" />
                                    )}
                                    Approve Expense
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
