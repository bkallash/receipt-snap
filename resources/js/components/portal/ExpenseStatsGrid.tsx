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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Claimed Card */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                            Total Expenses Claimed
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-bold tracking-tight text-zinc-100">
                            {formatCurrency(stats.total_claimed)}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                            Across {stats.total_count} total submitted receipts
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Pending Approval Card */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-amber-400/90">
                            Pending Review
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                            <Clock className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-bold tracking-tight text-zinc-100">
                            {formatCurrency(stats.pending_amount)}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400">
                            <span className="font-semibold text-amber-400">
                                {stats.pending_count}
                            </span>{' '}
                            expense{stats.pending_count === 1 ? '' : 's'} awaiting manager decision
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Approved & Reimbursed Card */}
            <Card className="border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-emerald-400/90">
                            Approved & Reimbursed
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <h3 className="text-2xl font-bold tracking-tight text-zinc-100">
                            {formatCurrency(stats.approved_amount)}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-400">
                            <span className="font-semibold text-emerald-400">
                                {stats.approved_count}
                            </span>{' '}
                            approved claim{stats.approved_count === 1 ? '' : 's'}
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
                <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-300">
                            Unsubmitted Drafts
                        </span>
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                            <FileEdit className="h-4 w-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold tracking-tight text-zinc-100">
                                {stats.drafts_count}
                            </h3>
                            {stats.drafts_count > 0 && (
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                                    Action Required
                                </span>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                            Draft receipts ready to review & submit
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
