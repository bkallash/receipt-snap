import React from 'react';
import AccountantLayout from '@/layouts/AccountantLayout';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    Download,
    Building2,
    PieChart,
    TrendingUp
} from 'lucide-react';

interface AnalyticsProps {
    departmentSummary: Array<{
        id: number;
        name: string;
        total_spend: number;
        expense_count: number;
        average_claim: number;
    }>;
    categorySummary: Array<{
        cat_id: number;
        claim_count: number;
        total_spend: number;
    }>;
}

export default function Analytics({ departmentSummary }: AnalyticsProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
    };

    return (
        <AccountantLayout title="Financial Analytics">
            {/* Header Title & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        Financial Analytics & Aggregate Reports
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Deep month-end financial analytics powered by pre-computed aggregate models for CFO and Board reviews.
                    </p>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                    <a href="/accountant/aggregates-summary" target="_blank" rel="noreferrer">
                        <Button variant="outline" className="h-8 text-xs border-zinc-800 bg-zinc-900/80 text-zinc-200 hover:bg-zinc-800">
                            <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                            Download Raw JSON Aggregates
                        </Button>
                    </a>
                </div>
            </div>

            {/* Department Summary Table */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-5 space-y-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-400" />
                        Departmental Expenditure Summary & Velocity
                    </h2>
                </div>

                {departmentSummary.length === 0 ? (
                    <div className="text-xs text-zinc-400 py-4">No departmental spend recorded yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                                    <th className="pb-2">Department Name</th>
                                    <th className="pb-2 text-center">Total Claim Count</th>
                                    <th className="pb-2 text-right">Average Claim Size</th>
                                    <th className="pb-2 text-right">Total Aggregate Spend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60">
                                {departmentSummary.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-zinc-800/40">
                                        <td className="py-3 font-semibold text-zinc-200">{dept.name}</td>
                                        <td className="py-3 text-center text-zinc-300 font-mono">{dept.expense_count}</td>
                                        <td className="py-3 text-right text-zinc-300">{formatCurrency(Number(dept.average_claim))}</td>
                                        <td className="py-3 text-right font-bold text-emerald-400">{formatCurrency(Number(dept.total_spend))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AccountantLayout>
    );
}
