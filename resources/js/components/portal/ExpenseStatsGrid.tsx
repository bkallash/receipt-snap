import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle2, Clock, DollarSign, FileEdit } from 'lucide-react';

interface ExpenseStatsGridProps {
    stats: {
        total_claimed: number;
        pending_amount: number;
        approved_amount: number;
        drafts_count: number;
        pending_count: number;
        approved_count: number;
        rejected_count: number;
        total_count: number;
    };
    onDraftFilterClick?: () => void;
}

export default function ExpenseStatsGrid({ stats, onDraftFilterClick }: ExpenseStatsGridProps) {
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(val || 0);
    };

    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Total Claimed Card */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-3.5 sm:p-5">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                            Total Expenses
                        </span>
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-3">
                        <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                            {formatCurrency(stats.total_claimed)}
                        </h3>
                        <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-500 truncate">
                            {stats.total_count} total receipts
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Pending Approval Card */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-3.5 sm:p-5">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400/90 truncate">
                            Pending Review
                        </span>
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-3">
                        <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                            {formatCurrency(stats.pending_amount)}
                        </h3>
                        <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-400 truncate">
                            <span className="font-semibold text-amber-400">
                                {stats.pending_count}
                            </span>{' '}
                            awaiting review
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Approved & Reimbursed Card */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-3.5 sm:p-5">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-400/90 truncate">
                            Approved Total
                        </span>
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-3">
                        <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100 truncate">
                            {formatCurrency(stats.approved_amount)}
                        </h3>
                        <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-400 truncate">
                            <span className="font-semibold text-emerald-400">
                                {stats.approved_count}
                            </span>{' '}
                            approved claims
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Actionable Drafts Card */}
            <Card
                onClick={onDraftFilterClick}
                className={`cursor-pointer transition-all duration-200 ${
                    stats.drafts_count > 0
                        ? 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/50'
                        : 'border-zinc-800 bg-zinc-900/60'
                }`}
            >
                <CardContent className="p-3.5 sm:p-5">
                    <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-300 truncate">
                            Drafts
                        </span>
                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
                            <FileEdit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                    </div>
                    <div className="mt-2 sm:mt-3">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                            <h3 className="text-lg sm:text-2xl font-bold tracking-tight text-zinc-100">
                                {stats.drafts_count}
                            </h3>
                            {stats.drafts_count > 0 && (
                                <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] sm:text-[10px] font-medium text-emerald-300">
                                    Action Required
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-400 truncate">
                            Ready to submit
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
