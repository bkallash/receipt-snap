import ApprovalQueueTable from '@/components/portal/ApprovalQueueTable';
import ExpenseApprovalModal from '@/components/portal/ExpenseApprovalModal';
import ExpenseDetailDrawer from '@/components/portal/ExpenseDetailDrawer';
import ExpenseDraftEditorModal from '@/components/portal/ExpenseDraftEditorModal';
import ExpensesFilterTable from '@/components/portal/ExpensesFilterTable';
import PortalNavbar from '@/components/portal/PortalNavbar';
import ReceiptAnalyzingModal from '@/components/portal/ReceiptAnalyzingModal';
import ReceiptDropzone from '@/components/portal/ReceiptDropzone';
import { apiFetch } from '@/lib/api';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    CheckSquare,
    Clock,
    DollarSign,
    Plus,
    Receipt,
    ShieldCheck,
    Sparkles,
    Upload,
    Users,
    XCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ManagerDashboardProps {
    expenses: any[];
    my_expenses?: any[];
    categories: any[];
    department: {
        id: number | null;
        name: string;
        description?: string | null;
        budget_amount?: number | null;
        budget_currency?: string | null;
        budget_period?: string | null;
    };
    budget_status?: {
        budget_amount: number | null;
        budget_currency: string | null;
        budget_period: string | null;
        spent_amount: number;
        pending_amount: number;
        remaining_budget: number | null;
        utilization_percentage: number;
    } | null;
    stats: {
        pending_count: number;
        pending_amount: number;
        approved_count: number;
        approved_amount: number;
        rejected_count: number;
        flagged_count: number;
        total_count: number;
    };
    organization?: any;
    userRole?: string;
}

export default function ManagerDashboard({
    expenses = [],
    my_expenses = [],
    categories = [],
    department = { id: null, name: 'Department' },
    budget_status = null,
    stats = {
        pending_count: 0,
        pending_amount: 0,
        approved_count: 0,
        approved_amount: 0,
        rejected_count: 0,
        flagged_count: 0,
        total_count: 0,
    },
    organization,
    userRole,
}: ManagerDashboardProps) {
    const safeTeamExpenses = Array.isArray(expenses) ? expenses : [];
    const safeMyExpenses = Array.isArray(my_expenses) ? my_expenses : [];
    const safeCategories = Array.isArray(categories) ? categories : [];
    const safeDepartment = department || { id: null, name: 'Department' };
    const safeStats = stats || {
        pending_count: 0,
        pending_amount: 0,
        approved_count: 0,
        approved_amount: 0,
        rejected_count: 0,
        flagged_count: 0,
        total_count: 0,
    };

    const [activeViewTab, setActiveViewTab] = useState<'team_approvals' | 'my_expenses'>('team_approvals');
    const [localTeamExpenses, setLocalTeamExpenses] = useState<any[]>(safeTeamExpenses);
    const [localMyExpenses, setLocalMyExpenses] = useState<any[]>(safeMyExpenses);

    const [activeReviewExpense, setActiveReviewExpense] = useState<any | null>(null);
    const [activeDraftExpense, setActiveDraftExpense] = useState<any | null>(null);
    const [activeDetailExpense, setActiveDetailExpense] = useState<any | null>(null);

    const [activeFilterTab, setActiveFilterTab] = useState<string>('pending');
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const pollingIntervalRef = useRef<any>(null);

    useEffect(() => {
        setLocalTeamExpenses(safeTeamExpenses);
    }, [expenses]);

    useEffect(() => {
        setLocalMyExpenses(safeMyExpenses);
    }, [my_expenses]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Clean up scan polling interval on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    // Switch to manager's personal expense creation & upload section
    const handleNewReceiptClick = () => {
        setActiveViewTab('my_expenses');
        setTimeout(() => {
            const dropzoneEl = document.getElementById('manager-receipt-dropzone');
            if (dropzoneEl) {
                dropzoneEl.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    // Handler when manager uploads a new receipt image
    const handleUploadSuccess = (newExpense: any) => {
        setLocalMyExpenses((prev) => [newExpense, ...prev]);
        setActiveViewTab('my_expenses');

        if (newExpense.status === 'PendingScan' || newExpense.status === 'pending_scan') {
            setIsScanning(true);
            setIsAnalyzing(true);
            startScanPolling(newExpense.id);
        } else {
            setIsScanning(false);
            setIsAnalyzing(false);
            setActiveDraftExpense(newExpense);
            showToast('Receipt uploaded! Review extracted details below.');
        }
    };

    // Poll OCR scan status until processing completes
    const startScanPolling = (expenseId: string | number) => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

        let pollAttempts = 0;
        pollingIntervalRef.current = setInterval(async () => {
            pollAttempts++;
            try {
                const res = await apiFetch(`/api/v1/expenses/${expenseId}/scan-status`);
                if (!res.ok) return;

                const data = await res.json();
                if (
                    data.status === 'completed' ||
                    data.status === 'failed' ||
                    pollAttempts >= 30
                ) {
                    clearInterval(pollingIntervalRef.current);
                    setIsScanning(false);
                    setIsAnalyzing(false);

                    const expRes = await apiFetch(`/api/v1/expenses/${expenseId}`);
                    if (expRes.ok) {
                        const updatedData = await expRes.json();
                        const freshExpense = updatedData.data;

                        setLocalMyExpenses((prev) =>
                            prev.map((e) => (e.id === freshExpense.id ? freshExpense : e))
                        );
                        setActiveDraftExpense(freshExpense);
                        showToast(
                            data.status === 'completed'
                                ? 'AI Scan complete! Review extracted details & items.'
                                : 'Scan completed. Please review details.'
                        );
                    }
                }
            } catch (e) {
                // Ignore transient network errors during polling
            }
        }, 2000);
    };

    // Manager draft save / submission handlers for personal expenses
    const handleSaveDraftSuccess = (updatedExpense: any) => {
        setLocalMyExpenses((prev) =>
            prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e))
        );
        setActiveDraftExpense(updatedExpense);
        showToast('Draft expense saved successfully.');
    };

    const handleSubmitSuccess = (submittedExpense: any) => {
        setLocalMyExpenses((prev) =>
            prev.map((e) => (e.id === submittedExpense.id ? submittedExpense : e))
        );
        setActiveDraftExpense(null);
        showToast('Personal expense submitted for processing!');
        router.reload({ only: ['my_expenses'] });
    };

    const handleSubmitFromTable = async (expense: any) => {
        try {
            const response = await apiFetch(`/api/v1/expenses/${expense.id}/submit`, {
                method: 'POST',
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to submit expense.');
            }

            const data = await response.json();
            handleSubmitSuccess(data.data);
        } catch (err: any) {
            showToast(err.message || 'Error submitting expense.');
        }
    };

    const handleDeleteDraft = async (expense: any) => {
        if (!confirm('Are you sure you want to delete this draft receipt?')) return;

        try {
            const response = await apiFetch(`/api/v1/expenses/${expense.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setLocalMyExpenses((prev) => prev.filter((e) => e.id !== expense.id));
                showToast('Draft receipt deleted.');
                router.reload({ only: ['my_expenses'] });
            }
        } catch (err) {
            showToast('Failed to delete draft.');
        }
    };

    // Team approval actions
    const handleApproveSuccess = (approvedExpense: any) => {
        setLocalTeamExpenses((prev) =>
            prev.map((e) => (e.id === approvedExpense.id ? { ...e, status: 'approved' } : e))
        );
        showToast(`Expense claim for ${approvedExpense.merchant_name || 'employee'} approved.`);
        router.reload({ only: ['stats', 'expenses', 'budget_status'] });
    };

    const handleRejectSuccess = (rejectedExpense: any) => {
        setLocalTeamExpenses((prev) =>
            prev.map((e) => (e.id === rejectedExpense.id ? { ...e, status: 'rejected' } : e))
        );
        showToast(`Expense claim rejected.`);
        router.reload({ only: ['stats', 'expenses', 'budget_status'] });
    };

    const handleQuickApprove = async (expense: any) => {
        try {
            const res = await apiFetch(`/api/v1/expenses/${expense.id}/approve`, {
                method: 'POST',
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to approve expense.');
            }

            const data = await res.json();
            handleApproveSuccess(data.data || expense);
        } catch (err: any) {
            showToast(err.message || 'Error approving expense.');
        }
    };

    const handleBulkApprove = async (selectedExpenses: any[]) => {
        if (selectedExpenses.length === 0) return;

        let successCount = 0;
        for (const exp of selectedExpenses) {
            try {
                const res = await apiFetch(`/api/v1/expenses/${exp.id}/approve`, {
                    method: 'POST',
                });
                if (res.ok) {
                    successCount++;
                }
            } catch (e) {
                // Continue with remaining batch
            }
        }

        showToast(`Successfully bulk approved ${successCount} expense claims.`);
        router.reload({ only: ['stats', 'expenses', 'budget_status'] });
    };

    const formatCurrency = (val: number | null | undefined, currency = 'USD') => {
        if (val === null || val === undefined) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency || 'USD',
        }).format(val || 0);
    };

    const utilization = budget_status?.utilization_percentage || 0;
    const getProgressBarColor = (pct: number) => {
        if (pct >= 90) return 'bg-rose-500 shadow-rose-500/30';
        if (pct >= 75) return 'bg-amber-500 shadow-amber-500/30';
        return 'bg-emerald-500 shadow-emerald-500/30';
    };

    return (
        <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
            <Head title="Manager Portal - ReceiptSnap" />

            {/* Navigation Bar */}
            <PortalNavbar
                onNewReceiptClick={handleNewReceiptClick}
                activeTab={activeViewTab}
                onTabChange={setActiveViewTab}
            />

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-zinc-900 px-4 py-3 text-xs font-medium text-emerald-300 shadow-2xl shadow-emerald-950/50 animate-in fade-in slide-in-from-bottom-5">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    {toastMessage}
                </div>
            )}

            {/* Main Content Area */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {/* Header Welcome */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                                {activeViewTab === 'team_approvals' ? 'Team Expense Approvals' : 'My Personal Expenses & Receipts'}
                            </h1>
                            <span className="shrink-0 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                                Manager Portal
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 sm:text-sm">
                            {activeViewTab === 'team_approvals'
                                ? 'Review out-of-pocket claims submitted by department employees and track budget capacity.'
                                : 'Upload your own out-of-pocket receipts for AI itemization and reimbursement.'}
                        </p>
                    </div>

                    {/* Department Scope & Create Button */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs text-zinc-300">
                            <Users className="h-4 w-4 text-emerald-400" />
                            <div>
                                <span className="text-[10px] text-zinc-500 block">Department Scope</span>
                                <span className="font-bold text-zinc-200">{safeDepartment.name}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleNewReceiptClick}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-xs font-bold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110 active:scale-[0.98]"
                        >
                            <Plus className="h-4 w-4 stroke-[2.5]" />
                            Create Expense
                        </button>
                    </div>
                </div>

                {/* VIEW TAB 1: TEAM APPROVALS */}
                {activeViewTab === 'team_approvals' && (
                    <div className="space-y-8 animate-in fade-in duration-200">
                        {/* Department Budget Financial Utilization Banner */}
                        {budget_status && (
                            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-xl space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-base font-bold text-zinc-100">
                                                {safeDepartment.name} Budget Utilization
                                            </h2>
                                            <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300 capitalize">
                                                {budget_status.budget_period || 'Monthly'} Cycle
                                            </span>
                                        </div>
                                        {safeDepartment.description && (
                                            <p className="mt-1 text-xs text-zinc-400">{safeDepartment.description}</p>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Total Allocated Budget</span>
                                        <span className="text-xl font-black text-zinc-100">
                                            {budget_status.budget_amount
                                                ? formatCurrency(budget_status.budget_amount, budget_status.budget_currency || 'USD')
                                                : 'Uncapped Budget'}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                {budget_status.budget_amount && (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-semibold">
                                            <span className="text-zinc-400">Budget Usage ({utilization}%)</span>
                                            <span className={utilization >= 90 ? 'text-rose-400' : utilization >= 75 ? 'text-amber-400' : 'text-emerald-400'}>
                                                {formatCurrency((budget_status.spent_amount + budget_status.pending_amount), budget_status.budget_currency || 'USD')} committed
                                            </span>
                                        </div>
                                        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-950 p-0.5 border border-zinc-800">
                                            <div
                                                style={{ width: `${Math.min(100, utilization)}%` }}
                                                className={`h-full rounded-full transition-all duration-500 shadow-md ${getProgressBarColor(utilization)}`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Breakdown Metrics Grid */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-2">
                                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Approved Spent</span>
                                        <p className="mt-1 text-lg font-bold text-emerald-400">
                                            {formatCurrency(budget_status.spent_amount, budget_status.budget_currency || 'USD')}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Pending Claims</span>
                                        <p className="mt-1 text-lg font-bold text-amber-400">
                                            {formatCurrency(budget_status.pending_amount, budget_status.budget_currency || 'USD')}
                                        </p>
                                    </div>

                                    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Remaining Available</span>
                                        <p className={`mt-1 text-lg font-bold ${
                                            budget_status.remaining_budget !== null && budget_status.remaining_budget <= 0
                                                ? 'text-rose-400'
                                                : 'text-zinc-100'
                                        }`}>
                                            {budget_status.remaining_budget !== null
                                                ? formatCurrency(budget_status.remaining_budget, budget_status.budget_currency || 'USD')
                                                : 'Unlimited'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Metric Summary Cards Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                            {/* Card 1: Pending Approvals */}
                            <button
                                onClick={() => setActiveFilterTab('pending')}
                                className={`rounded-2xl border p-3.5 sm:p-5 shadow-lg relative overflow-hidden text-left transition-all duration-200 hover:scale-[1.01] ${
                                    activeFilterTab === 'pending'
                                        ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
                                        : 'border-amber-500/20 bg-zinc-900/40 hover:border-amber-500/40'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400 truncate">
                                        Pending
                                    </span>
                                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                                        <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-3">
                                    <h3 className="text-lg sm:text-2xl font-extrabold text-amber-300 truncate">
                                        {formatCurrency(safeStats.pending_amount)}
                                    </h3>
                                    <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-400 truncate">
                                        {safeStats.pending_count} claims to review
                                    </p>
                                </div>
                            </button>

                            {/* Card 2: Approved Total */}
                            <button
                                onClick={() => setActiveFilterTab('approved')}
                                className={`rounded-2xl border p-3.5 sm:p-5 shadow-lg relative overflow-hidden text-left transition-all duration-200 hover:scale-[1.01] ${
                                    activeFilterTab === 'approved'
                                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/50'
                                        : 'border-emerald-500/20 bg-zinc-900/40 hover:border-emerald-500/40'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-400 truncate">
                                        Approved
                                    </span>
                                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                                        <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-3">
                                    <h3 className="text-lg sm:text-2xl font-extrabold text-emerald-400 truncate">
                                        {formatCurrency(safeStats.approved_amount)}
                                    </h3>
                                    <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-400 truncate">
                                        {safeStats.approved_count} approved claims
                                    </p>
                                </div>
                            </button>

                            {/* Card 3: Flagged Policy Violations */}
                            <button
                                onClick={() => setActiveFilterTab('flagged')}
                                className={`rounded-2xl border p-3.5 sm:p-5 shadow-lg relative overflow-hidden text-left transition-all duration-200 hover:scale-[1.01] ${
                                    activeFilterTab === 'flagged'
                                        ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/50'
                                        : 'border-zinc-800 bg-zinc-900/40 hover:border-amber-500/40'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-amber-400 truncate">
                                        Warnings
                                    </span>
                                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                                        <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-3">
                                    <h3 className="text-lg sm:text-2xl font-extrabold text-zinc-100 truncate">
                                        {safeStats.flagged_count}
                                    </h3>
                                    <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-400 truncate">
                                        Policy flags detected
                                    </p>
                                </div>
                            </button>

                            {/* Card 4: Total Claims Handled */}
                            <button
                                onClick={() => setActiveFilterTab('all')}
                                className={`rounded-2xl border p-3.5 sm:p-5 shadow-lg relative overflow-hidden text-left transition-all duration-200 hover:scale-[1.01] ${
                                    activeFilterTab === 'all'
                                        ? 'border-zinc-700 bg-zinc-800/60 ring-1 ring-zinc-600'
                                        : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
                                        Total Claims
                                    </span>
                                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                                        <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    </div>
                                </div>
                                <div className="mt-2 sm:mt-3">
                                    <h3 className="text-lg sm:text-2xl font-extrabold text-zinc-100 truncate">
                                        {safeStats.total_count}
                                    </h3>
                                    <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-zinc-400 truncate">
                                        {safeStats.rejected_count} rejected claims
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* Team Approval Queue Table */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    Department Claims Queue
                                </h2>
                            </div>

                            <ApprovalQueueTable
                                expenses={localTeamExpenses}
                                categories={safeCategories}
                                selectedStatus={activeFilterTab}
                                onStatusChange={setActiveFilterTab}
                                onReviewExpense={(exp) => setActiveReviewExpense(exp)}
                                onQuickApprove={handleQuickApprove}
                                onBulkApprove={handleBulkApprove}
                            />
                        </div>
                    </div>
                )}

                {/* VIEW TAB 2: MY PERSONAL EXPENSES & RECEIPT UPLOAD */}
                {activeViewTab === 'my_expenses' && (
                    <div className="space-y-8 animate-in fade-in duration-200">
                        {/* Receipt Dropzone Upload Section */}
                        <div id="manager-receipt-dropzone" className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    Upload Receipt Image or PDF
                                </h2>
                                <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    <Sparkles className="h-3.5 w-3.5" /> AI Automated OCR & Itemization
                                </span>
                            </div>

                            <ReceiptDropzone
                                onUploadSuccess={handleUploadSuccess}
                                isScanning={isScanning}
                            />
                        </div>

                        {/* Manager's Personal Expenses History & Drafts Table */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                                    My Personal Claims & Drafts
                                </h2>
                            </div>

                            <ExpensesFilterTable
                                expenses={localMyExpenses}
                                categories={safeCategories}
                                onEditDraft={(exp) => setActiveDraftExpense(exp)}
                                onViewDetail={(exp) => setActiveDetailExpense(exp)}
                                onSubmitExpense={handleSubmitFromTable}
                                onDeleteDraft={handleDeleteDraft}
                            />
                        </div>
                    </div>
                )}
            </main>

            {/* Modal 1: Team Expense Side-by-Side Review & Approval Modal */}
            <ExpenseApprovalModal
                isOpen={!!activeReviewExpense}
                onClose={() => setActiveReviewExpense(null)}
                expense={activeReviewExpense}
                onApproveSuccess={handleApproveSuccess}
                onRejectSuccess={handleRejectSuccess}
            />

            {/* Modal 2: AI Scanning Overlay Modal */}
            <ReceiptAnalyzingModal isOpen={isAnalyzing} />

            {/* Modal 3: Personal Expense Draft Editor Modal */}
            <ExpenseDraftEditorModal
                isOpen={!!activeDraftExpense}
                onClose={() => setActiveDraftExpense(null)}
                expense={activeDraftExpense}
                categories={safeCategories}
                onSaveSuccess={handleSaveDraftSuccess}
                onSubmitSuccess={handleSubmitSuccess}
                onDeleteSuccess={handleDeleteDraft}
            />

            {/* Drawer 4: Personal Expense Detail Viewer */}
            <ExpenseDetailDrawer
                isOpen={!!activeDetailExpense}
                onClose={() => setActiveDetailExpense(null)}
                expense={activeDetailExpense}
            />
        </div>
    );
}
