import React from 'react';
import AccountantLayout from '@/layouts/AccountantLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import {
    DollarSign,
    Layers,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    PieChart,
    Users,
    ArrowRight,
    Download,
    CreditCard,
    FileSpreadsheet,
    ShieldAlert,
    Clock
} from 'lucide-react';

interface DashboardProps {
    metrics: {
        kpis: {
            unpaid_approved_count: number;
            unpaid_approved_amount: number;
            ready_for_payout_count: number;
            ready_for_payout_amount: number;
            total_mtd_reimbursed: number;
            pending_tax_audit_count: number;
        };
        daily_outflow_projection: Array<{ date: string; projected_amount: number }>;
        spend_by_gl_code: Array<{ gl_code: string; category_name: string; total_amount: number }>;
        top_unreimbursed_employees: Array<{
            user_id: number;
            employee_name: string;
            employee_email: string;
            claim_count: number;
            total_owed: number;
        }>;
    };
}

export default function Dashboard({ metrics }: DashboardProps) {
    const { kpis, daily_outflow_projection, spend_by_gl_code, top_unreimbursed_employees } = metrics;
    const totalGlSpend = spend_by_gl_code.reduce((sum, item) => sum + item.total_amount, 0);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
    };

    return (
        <AccountantLayout title="Financial Dashboard">
            {/* Header Welcome & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        Accountant Financial Cockpit
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Real-time pending liabilities, tax compliance audit status, and cash flow projections.
                    </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <Link href="/accountant/reimbursements">
                        <Button className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-sm shadow-emerald-500/20">
                            <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                            Create Reimbursement Batch
                        </Button>
                    </Link>
                    <a href="/accountant/export-erp?target=tax_ledger">
                        <Button variant="outline" className="border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs rounded-xl">
                            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                            Export Monthly Tax Ledger
                        </Button>
                    </a>
                </div>
            </div>

            {/* Stat Cards Grid - Matching Manager & Employee Portals */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                {/* Unpaid Approved Claims */}
                <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                    <CardContent className="p-3.5 sm:p-5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400/90 truncate">
                                Unpaid Approved Claims
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                                {formatCurrency(kpis.unpaid_approved_amount)}
                            </h3>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-amber-400 truncate">
                                {kpis.unpaid_approved_count} claims pending payout
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Ready for Batch Payout */}
                <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                    <CardContent className="p-3.5 sm:p-5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-indigo-400/90 truncate">
                                Ready for Batch Payout
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                                {formatCurrency(kpis.ready_for_payout_amount)}
                            </h3>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-indigo-400 truncate">
                                {kpis.ready_for_payout_count} claims cleared for ACH
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Total MTD Reimbursed */}
                <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                    <CardContent className="p-3.5 sm:p-5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-400/90 truncate">
                                Total MTD Reimbursed
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                                {formatCurrency(kpis.total_mtd_reimbursed)}
                            </h3>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-emerald-400 truncate">
                                Paid out in current month
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Tax Audit Review */}
                <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                    <CardContent className="p-3.5 sm:p-5">
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-rose-400/90 truncate">
                                Pending Tax Audit
                            </span>
                            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </div>
                        </div>
                        <div className="mt-2 sm:mt-3">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                                {kpis.pending_tax_audit_count}
                            </h3>
                            <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-rose-400 truncate">
                                Approved missing GL/Tax info
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts & Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 14-Day Cash Outflow Projection */}
                <div className="lg:col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <h2 className="text-sm font-bold text-zinc-200">Daily Cash Outflow Projection</h2>
                        </div>
                        <span className="text-[11px] text-zinc-400 bg-zinc-800 px-2.5 py-0.5 rounded-full border border-zinc-700/50">Upcoming 14 Days</span>
                    </div>

                    <div className="h-48 flex items-end justify-between gap-2 pt-4 px-2 border-b border-zinc-800/80">
                        {daily_outflow_projection.map((point, idx) => {
                            const maxVal = Math.max(...daily_outflow_projection.map((p) => p.projected_amount), 1);
                            const heightPct = Math.max((point.projected_amount / maxVal) * 100, 10);
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                                    <div className="w-full bg-emerald-950/60 rounded-t border-t border-x border-emerald-500/30 group-hover:bg-emerald-500/30 transition-all relative" style={{ height: `${heightPct}%` }}>
                                        <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 text-[10px] text-zinc-100 px-2 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                                            {formatCurrency(point.projected_amount)}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-zinc-400 truncate w-full text-center">{point.date}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Spend by GL Code / Category */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <PieChart className="w-4 h-4 text-emerald-400" />
                            <h2 className="text-sm font-bold text-zinc-200">Spend by GL Code</h2>
                        </div>
                        <Link href="/accountant/gl-categories" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">View All</Link>
                    </div>

                    <div className="space-y-3">
                        {spend_by_gl_code.slice(0, 5).map((item, idx) => {
                            const pct = totalGlSpend > 0 ? (item.total_amount / totalGlSpend) * 100 : 0;
                            return (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-zinc-300">{item.category_name} <span className="text-zinc-500">({item.gl_code})</span></span>
                                        <span className="text-zinc-200 font-semibold">{formatCurrency(item.total_amount)}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Top Unreimbursed Employees & Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-amber-400" />
                            <h2 className="text-sm font-bold text-zinc-200">Top Unreimbursed Employees</h2>
                        </div>
                        <Link href="/accountant/reimbursements" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
                            Process Payouts <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {top_unreimbursed_employees.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 text-xs">No pending unreimbursed employee balances found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                                        <th className="pb-2">Employee</th>
                                        <th className="pb-2 text-center">Approved Claims</th>
                                        <th className="pb-2 text-right">Total Balance Owed</th>
                                        <th className="pb-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60">
                                    {top_unreimbursed_employees.map((emp) => (
                                        <tr key={emp.user_id} className="hover:bg-zinc-800/40">
                                            <td className="py-2.5">
                                                <div className="font-semibold text-zinc-200">{emp.employee_name}</div>
                                                <div className="text-zinc-400 text-[10px]">{emp.employee_email}</div>
                                            </td>
                                            <td className="py-2.5 text-center font-medium text-zinc-300">{emp.claim_count}</td>
                                            <td className="py-2.5 text-right font-bold text-emerald-400">
                                                {formatCurrency(emp.total_owed)}
                                            </td>
                                            <td className="py-2.5 text-right">
                                                <Link href="/accountant/reimbursements">
                                                    <Button size="sm" variant="outline" className="h-7 text-[11px] border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
                                                        Process Payout
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ERP & Export Shortcut Cards */}
                <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 backdrop-blur-sm">
                    <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        Quick Ledger Exports
                    </h2>
                    <div className="space-y-2">
                        <a
                            href="/accountant/export-erp?target=quickbooks_csv"
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all"
                        >
                            <span>QuickBooks CSV Ledger</span>
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                        </a>
                        <a
                            href="/accountant/export-erp?target=xero"
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all"
                        >
                            <span>Xero Payables Import</span>
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                        </a>
                        <a
                            href="/accountant/export-erp?target=netsuite"
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all"
                        >
                            <span>NetSuite / SAP Journal Entry</span>
                            <Download className="w-3.5 h-3.5 text-amber-400" />
                        </a>
                        <a
                            href="/accountant/download-compliance-package"
                            className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition-all"
                        >
                            <span>Download Compliance Package (ZIP)</span>
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        </a>
                    </div>
                </div>
            </div>
        </AccountantLayout>
    );
}
