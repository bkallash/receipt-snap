import React, { useState } from 'react';
import AccountantLayout from '@/layouts/AccountantLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileCheck2,
    Download,
    Eye,
    CheckCircle2,
    Filter,
    FileSpreadsheet,
    Receipt as ReceiptIcon,
    X
} from 'lucide-react';

interface ApprovedExpensesProps {
    expenses: {
        data: Array<{
            id: number;
            uuid: string;
            merchant_name: string;
            merchant_vat_id: string | null;
            amount: number;
            tax_amount: number | null;
            currency_code: string;
            expense_date: string;
            payment_method: string;
            tax_verified: boolean;
            user?: { name: string; email: string };
            category?: { name: string; gl_code: string | null; default_tax_rate: number | null };
            receipt?: { image_url?: string; ocr_data?: any };
        }>;
    };
    categories: Array<{ id: number; name: string; gl_code: string | null }>;
}

export default function ApprovedExpenses({ expenses, categories }: ApprovedExpensesProps) {
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
    };

    const filteredExpenses = expenses.data.filter((exp) => {
        if (selectedCategory !== 'all' && exp.category?.id !== Number(selectedCategory)) {
            return false;
        }
        return true;
    });

    return (
        <AccountantLayout title="Approved Expenses & Tax Ledger">
            {/* Header Title & ERP Exporter Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        Approved Expenses & Tax Ledger
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Read-only audit vault of approved expenses ready for GL code allocation, VAT tax auditing, and ERP export.
                    </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                    <a href="/accountant/export-erp?target=quickbooks_csv">
                        <Button variant="outline" className="h-8 text-xs border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800">
                            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> QuickBooks
                        </Button>
                    </a>
                    <a href="/accountant/export-erp?target=xero">
                        <Button variant="outline" className="h-8 text-xs border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800">
                            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Xero
                        </Button>
                    </a>
                    <a href="/accountant/export-erp?target=netsuite">
                        <Button variant="outline" className="h-8 text-xs border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800">
                            <Download className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> NetSuite / SAP
                        </Button>
                    </a>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 flex items-center space-x-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2 text-xs text-zinc-400 font-semibold">
                    <Filter className="w-4 h-4 text-emerald-400" />
                    <span>Financial Filters:</span>
                </div>
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
                >
                    <option value="all">All Categories & GL Codes</option>
                    {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.gl_code ?? 'UNMAPPED'})
                        </option>
                    ))}
                </select>
            </div>

            {/* Data Table */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                                <th className="p-3.5">Expense ID & Date</th>
                                <th className="p-3.5">Employee</th>
                                <th className="p-3.5">Merchant & VAT ID</th>
                                <th className="p-3.5">Subtotal / Tax / Total</th>
                                <th className="p-3.5">Category & GL Code</th>
                                <th className="p-3.5 text-center">Receipt & OCR</th>
                                <th className="p-3.5 text-center">Audit Checkmark</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {filteredExpenses.map((exp) => {
                                const subtotal = Number(exp.amount) - Number(exp.tax_amount ?? 0);
                                return (
                                    <tr key={exp.id} className="hover:bg-zinc-800/40 transition-colors">
                                        <td className="p-3.5">
                                            <div className="font-mono font-semibold text-zinc-200 text-[11px]">{exp.uuid.substring(0, 8)}...</div>
                                            <div className="text-[10px] text-zinc-400">{exp.expense_date}</div>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="font-semibold text-zinc-200">{exp.user?.name ?? 'N/A'}</div>
                                            <div className="text-[10px] text-zinc-400">{exp.user?.email}</div>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="font-medium text-zinc-200">{exp.merchant_name}</div>
                                            <div className="text-[10px] text-zinc-400 font-mono">VAT: {exp.merchant_vat_id ?? 'N/A'}</div>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="font-bold text-zinc-100">{formatCurrency(Number(exp.amount))}</div>
                                            <div className="text-[10px] text-zinc-400">
                                                Net: {formatCurrency(subtotal)} | Tax: {formatCurrency(Number(exp.tax_amount ?? 0))}
                                            </div>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="font-medium text-zinc-200">{exp.category?.name ?? 'Uncategorized'}</div>
                                            <span className="inline-block bg-zinc-800 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded-full border border-zinc-700">
                                                {exp.category?.gl_code ?? 'GL-UNMAPPED'}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setViewingReceipt(exp)}
                                                className="h-7 text-[11px] border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                            >
                                                <Eye className="mr-1 h-3 w-3 text-emerald-400" /> View OCR
                                            </Button>
                                        </td>
                                        <td className="p-3.5 text-center">
                                            {exp.tax_verified || exp.category?.gl_code ? (
                                                <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
                                                </Badge>
                                            ) : (
                                                <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                                                    Pending Audit
                                                </Badge>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Receipt Modal */}
            {viewingReceipt && (
                <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
                        <button onClick={() => setViewingReceipt(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200">
                            <X className="w-5 h-5" />
                        </button>
                        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                            <ReceiptIcon className="w-5 h-5 text-emerald-400" />
                            Receipt Document & Tax Extraction
                        </h3>
                        <div className="space-y-2 text-xs text-zinc-300 bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono">
                            <div><span className="text-zinc-400">Merchant:</span> {viewingReceipt.merchant_name}</div>
                            <div><span className="text-zinc-400">Expense Date:</span> {viewingReceipt.expense_date}</div>
                            <div><span className="text-zinc-400">Total Amount:</span> {formatCurrency(Number(viewingReceipt.amount))}</div>
                            <div><span className="text-zinc-400">Tax Amount:</span> {formatCurrency(Number(viewingReceipt.tax_amount ?? 0))}</div>
                            <div><span className="text-zinc-400">GL Code:</span> {viewingReceipt.category?.gl_code ?? 'GL-UNMAPPED'}</div>
                            <div><span className="text-zinc-400">Tax ID / VAT:</span> {viewingReceipt.merchant_vat_id ?? 'N/A'}</div>
                        </div>
                    </div>
                </div>
            )}
        </AccountantLayout>
    );
}
