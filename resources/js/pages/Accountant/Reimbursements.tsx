import React, { useState } from 'react';
import AccountantLayout from '@/layouts/AccountantLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { router } from '@inertiajs/react';
import {
    CreditCard,
    CheckSquare,
    Square,
    Download,
    Send,
    CheckCircle2,
    Clock,
    FileSpreadsheet,
    ShieldCheck,
    AlertCircle,
    X
} from 'lucide-react';

interface ReimbursementsProps {
    unpaidClaims: Array<{
        id: number;
        uuid: string;
        merchant_name: string;
        amount: number;
        currency_code: string;
        status: string;
        expense_date: string;
        approved_at: string | null;
        payment_method: string;
        user?: { id: number; name: string; email: string };
        category?: { id: number; name: string; gl_code: string | null };
    }>;
    recentBatches: Array<{
        id: number;
        uuid: string;
        batch_number: string;
        status: string;
        payment_method: string;
        total_amount: number;
        claim_count: number;
        created_at: string;
        processed_at: string | null;
    }>;
}

export default function Reimbursements({ unpaidClaims, recentBatches }: ReimbursementsProps) {
    const [selectedUuids, setSelectedUuids] = useState<string[]>([]);
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<'all' | 'out_of_pocket' | 'corporate_card'>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [paymentRefInput, setPaymentRefInput] = useState<string>('');
    const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
    };

    const toggleSelectAll = () => {
        if (selectedUuids.length === unpaidClaims.length) {
            setSelectedUuids([]);
        } else {
            setSelectedUuids(unpaidClaims.map((c) => c.uuid));
        }
    };

    const toggleSelectClaim = (uuid: string) => {
        setSelectedUuids((prev) =>
            prev.includes(uuid) ? prev.filter((id) => id !== uuid) : [...prev, uuid]
        );
    };

    const selectedTotal = unpaidClaims
        .filter((c) => selectedUuids.includes(c.uuid))
        .reduce((sum, c) => sum + Number(c.amount), 0);

    const handleCreateBatch = async (method: string) => {
        if (selectedUuids.length === 0) return;
        setIsProcessing(true);
        try {
            await fetch('/api/v1/reimbursement-batches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    expense_uuids: selectedUuids,
                    payment_method: method,
                }),
            });
            setSelectedUuids([]);
            router.reload();
        } catch (e) {
            alert('Failed to create batch.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMarkReimbursedSubmit = async () => {
        if (selectedUuids.length === 0 || !paymentRefInput) return;
        setIsProcessing(true);
        try {
            await fetch('/api/v1/reimbursements/mark-reimbursed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({
                    expense_uuids: selectedUuids,
                    payment_reference: paymentRefInput,
                }),
            });
            setIsMarkingModalOpen(false);
            setPaymentRefInput('');
            setSelectedUuids([]);
            router.reload();
        } catch (e) {
            alert('Failed to mark claims as reimbursed.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <AccountantLayout title="Reimbursements Portal">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        Reimbursements & Batch Payout Portal
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Bundle approved employee out-of-pocket claims, execute direct bank payouts, or generate NACHA/SEPA bank transfer files.
                    </p>
                </div>
            </div>

            {/* Metrics & Control Bar */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-sm">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
                        <button
                            onClick={() => setPaymentMethodFilter('all')}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                paymentMethodFilter === 'all' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            All Expenses
                        </button>
                        <button
                            onClick={() => setPaymentMethodFilter('out_of_pocket')}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                                paymentMethodFilter === 'out_of_pocket' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            Out-of-pocket Cash
                        </button>
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="approved">Approved (Unpaid 🟡)</option>
                        <option value="processing">Processing (In Batch 🔵)</option>
                    </select>
                </div>

                {/* Batch Action Toolbar */}
                <div className="flex items-center space-x-3">
                    {selectedUuids.length > 0 && (
                        <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            {selectedUuids.length} Selected ({formatCurrency(selectedTotal)})
                        </span>
                    )}

                    <Button
                        disabled={selectedUuids.length === 0 || isProcessing}
                        onClick={() => handleCreateBatch('nacha_ach')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-sm shadow-emerald-500/20"
                    >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        Create ACH Batch
                    </Button>

                    <Button
                        disabled={selectedUuids.length === 0 || isProcessing}
                        onClick={() => setIsMarkingModalOpen(true)}
                        variant="outline"
                        className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 text-xs rounded-xl"
                    >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                        Mark Reimbursed
                    </Button>
                </div>
            </div>

            {/* Main Unpaid Claims Table */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-amber-400" />
                        Approved Claims Ready for Payout ({unpaidClaims.length})
                    </h2>
                </div>

                {unpaidClaims.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400 text-xs">
                        No approved unpaid claims available for batch reimbursement.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                                    <th className="p-3.5 w-10 text-center">
                                        <button onClick={toggleSelectAll} className="text-zinc-400 hover:text-zinc-200">
                                            {selectedUuids.length === unpaidClaims.length ? (
                                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <Square className="w-4 h-4" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="p-3.5">Claim ID & Date</th>
                                    <th className="p-3.5">Employee</th>
                                    <th className="p-3.5">Merchant & Category</th>
                                    <th className="p-3.5">GL Code</th>
                                    <th className="p-3.5 text-right">Amount Owed</th>
                                    <th className="p-3.5 text-center">Payment Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60">
                                {unpaidClaims.map((claim) => {
                                    const isSelected = selectedUuids.includes(claim.uuid);
                                    return (
                                        <tr key={claim.uuid} className={`hover:bg-zinc-800/40 transition-colors ${isSelected ? 'bg-emerald-950/20' : ''}`}>
                                            <td className="p-3.5 text-center">
                                                <button onClick={() => toggleSelectClaim(claim.uuid)} className="text-zinc-400 hover:text-zinc-200">
                                                    {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                            <td className="p-3.5">
                                                <div className="font-mono text-zinc-200 font-semibold text-[11px]">{claim.uuid.substring(0, 8)}...</div>
                                                <div className="text-[10px] text-zinc-400">{claim.expense_date}</div>
                                            </td>
                                            <td className="p-3.5">
                                                <div className="font-semibold text-zinc-200">{claim.user?.name ?? 'Employee'}</div>
                                                <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                                                    <span>{claim.user?.email}</span>
                                                    <span className="text-emerald-400 font-medium">✓ Direct Deposit</span>
                                                </div>
                                            </td>
                                            <td className="p-3.5">
                                                <div className="font-medium text-zinc-200">{claim.merchant_name}</div>
                                                <div className="text-[10px] text-zinc-400">{claim.category?.name ?? 'Uncategorized'}</div>
                                            </td>
                                            <td className="p-3.5">
                                                <span className="inline-block bg-zinc-800 text-emerald-400 font-mono text-[10.5px] px-2 py-0.5 rounded-full border border-zinc-700">
                                                    {claim.category?.gl_code ?? 'GL-UNMAPPED'}
                                                </span>
                                            </td>
                                            <td className="p-3.5 text-right font-bold text-emerald-400 text-sm">
                                                {formatCurrency(Number(claim.amount))}
                                            </td>
                                            <td className="p-3.5 text-center">
                                                {claim.status === 'approved' ? (
                                                    <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                                                        Approved - Unpaid 🟡
                                                    </Badge>
                                                ) : (
                                                    <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                                                        Processing 🔵
                                                    </Badge>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Reimbursement Batches */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    Recent Reimbursement Batches & Bank Files
                </h2>

                {recentBatches.length === 0 ? (
                    <div className="text-xs text-zinc-400 py-4">No reimbursement batches created yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="text-zinc-400 border-b border-zinc-800 uppercase text-[10px]">
                                    <th className="pb-2">Batch Number</th>
                                    <th className="pb-2">Claims Count</th>
                                    <th className="pb-2 text-right">Total Payout</th>
                                    <th className="pb-2 text-center">Status</th>
                                    <th className="pb-2 text-right">Download Bank File</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60">
                                {recentBatches.map((batch) => (
                                    <tr key={batch.id} className="hover:bg-zinc-800/40">
                                        <td className="py-2.5 font-mono font-semibold text-emerald-400">{batch.batch_number}</td>
                                        <td className="py-2.5">{batch.claim_count} Claims</td>
                                        <td className="py-2.5 text-right font-bold text-emerald-400">{formatCurrency(Number(batch.total_amount))}</td>
                                        <td className="py-2.5 text-center">
                                            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                                {batch.status.toUpperCase()}
                                            </Badge>
                                        </td>
                                        <td className="py-2.5 text-right space-x-2">
                                            <a
                                                href={`/accountant/reimbursement-batches/${batch.id}/bank-file?format=nacha`}
                                                className="inline-flex items-center gap-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded-lg border border-zinc-700"
                                            >
                                                <Download className="w-3 h-3 text-emerald-400" /> NACHA
                                            </a>
                                            <a
                                                href={`/accountant/reimbursement-batches/${batch.id}/bank-file?format=sepa_xml`}
                                                className="inline-flex items-center gap-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded-lg border border-zinc-700"
                                            >
                                                <Download className="w-3 h-3 text-emerald-400" /> SEPA XML
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mark Reimbursed Modal */}
            {isMarkingModalOpen && (
                <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                Mark {selectedUuids.length} Claim(s) as Reimbursed
                            </h3>
                            <button onClick={() => setIsMarkingModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Enter the bank transaction reference number or ACH batch hash to mark these claims as settled.
                        </p>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-300 mb-1">Payment Reference Note / Transaction ID *</label>
                            <input
                                type="text"
                                value={paymentRefInput}
                                onChange={(e) => setPaymentRefInput(e.target.value)}
                                placeholder="e.g., ACH-CONF-984210"
                                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                            <Button variant="outline" onClick={() => setIsMarkingModalOpen(false)} className="h-8 text-xs border-zinc-800 text-zinc-300">
                                Cancel
                            </Button>
                            <Button disabled={!paymentRefInput || isProcessing} onClick={handleMarkReimbursedSubmit} className="h-8 text-xs bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400">
                                Confirm Reimbursed
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AccountantLayout>
    );
}
