import ExpenseDetailDrawer from '@/components/portal/ExpenseDetailDrawer';
import ExpenseDraftEditorModal from '@/components/portal/ExpenseDraftEditorModal';
import ExpensesFilterTable from '@/components/portal/ExpensesFilterTable';
import ExpenseStatsGrid from '@/components/portal/ExpenseStatsGrid';
import PortalNavbar from '@/components/portal/PortalNavbar';
import ReceiptAnalyzingModal from '@/components/portal/ReceiptAnalyzingModal';
import ReceiptDropzone from '@/components/portal/ReceiptDropzone';
import { apiFetch } from '@/lib/api';
import { Head, router } from '@inertiajs/react';
import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DashboardProps {
    expenses: any[];
    categories: any[];
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
    organization?: any;
}

export default function Dashboard({
    expenses = [],
    categories = [],
    stats = {
        total_claimed: 0,
        pending_amount: 0,
        approved_amount: 0,
        drafts_count: 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        total_count: 0,
    },
    organization,
}: DashboardProps) {
    const [localExpenses, setLocalExpenses] = useState<any[]>(expenses);
    const [activeDraftExpense, setActiveDraftExpense] = useState<any | null>(null);
    const [activeDetailExpense, setActiveDetailExpense] = useState<any | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const pollingIntervalRef = useRef<any>(null);

    useEffect(() => {
        setLocalExpenses(expenses);
    }, [expenses]);

    // Show temporary toast message
    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // When new receipt is uploaded, show analyzing modal and dispatch scan polling
    const handleUploadSuccess = (newExpense: any) => {
        setLocalExpenses((prev) => [newExpense, ...prev]);

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
                const res = await apiFetch(
                    `/api/v1/expenses/${expenseId}/scan-status`
                );
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

                    // Fetch updated full expense model
                    const expRes = await apiFetch(
                        `/api/v1/expenses/${expenseId}`
                    );
                    if (expRes.ok) {
                        const updatedData = await expRes.json();
                        const freshExpense = updatedData.data;

                        setLocalExpenses((prev) =>
                            prev.map((e) =>
                                e.id === freshExpense.id ? freshExpense : e
                            )
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

    // Clean up polling interval on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    const handleSaveDraftSuccess = (updatedExpense: any) => {
        setLocalExpenses((prev) =>
            prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e))
        );
        setActiveDraftExpense(updatedExpense);
        showToast('Draft receipt saved successfully.');
    };

    const handleSubmitSuccess = (submittedExpense: any) => {
        setLocalExpenses((prev) =>
            prev.map((e) => (e.id === submittedExpense.id ? submittedExpense : e))
        );
        setActiveDraftExpense(null);
        showToast('Expense submitted to manager for review!');
        router.reload({ only: ['stats', 'expenses'] });
    };

    const handleSubmitFromTable = async (expense: any) => {
        try {
            const response = await apiFetch(
                `/api/v1/expenses/${expense.id}/submit`,
                {
                    method: 'POST',
                }
            );

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
                setLocalExpenses((prev) => prev.filter((e) => e.id !== expense.id));
                showToast('Draft receipt deleted.');
                router.reload({ only: ['stats', 'expenses'] });
            }
        } catch (err) {
            showToast('Failed to delete draft.');
        }
    };

    return (
        <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
            <Head title="Employee Portal - ReceiptSnap" />

            {/* Navigation Bar */}
            <PortalNavbar
                onNewReceiptClick={() => {
                    const dropzoneEl = document.getElementById('receipt-dropzone-section');
                    if (dropzoneEl) {
                        dropzoneEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }}
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
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        Employee Expense Portal
                    </h1>
                    <p className="text-xs text-zinc-400 sm:text-sm">
                        Upload receipts for instant AI itemization, edit draft details, and submit claims to your manager.
                    </p>
                </div>

                {/* Metric Summary Cards Grid */}
                <ExpenseStatsGrid stats={stats} />

                {/* Upload & Quick Action Area */}
                <div id="receipt-dropzone-section" className="space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                        Upload New Receipt
                    </h2>
                    <ReceiptDropzone
                        onUploadSuccess={handleUploadSuccess}
                        isScanning={isScanning}
                    />
                </div>

                {/* Expenses List & Filter Table */}
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                            My Expenses History & Drafts
                        </h2>
                    </div>

                    <ExpensesFilterTable
                        expenses={localExpenses}
                        categories={categories}
                        onEditDraft={(exp) => setActiveDraftExpense(exp)}
                        onViewDetail={(exp) => setActiveDetailExpense(exp)}
                        onSubmitExpense={handleSubmitFromTable}
                        onDeleteDraft={handleDeleteDraft}
                    />
                </div>
            </main>

            {/* Modal: Receipt Analyzing Modal */}
            <ReceiptAnalyzingModal isOpen={isAnalyzing} />

            {/* Modal: Draft Editor Modal */}
            <ExpenseDraftEditorModal
                isOpen={!!activeDraftExpense}
                onClose={() => setActiveDraftExpense(null)}
                expense={activeDraftExpense}
                categories={categories}
                onSaveSuccess={handleSaveDraftSuccess}
                onSubmitSuccess={handleSubmitSuccess}
                onDeleteSuccess={handleDeleteDraft}
            />

            {/* Drawer: Detailed Expense Viewer */}
            <ExpenseDetailDrawer
                isOpen={!!activeDetailExpense}
                onClose={() => setActiveDetailExpense(null)}
                expense={activeDetailExpense}
            />
        </div>
    );
}
