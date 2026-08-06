import React, { useState, FormEvent } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/portal/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, Building2, CheckCircle2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';

interface Department {
    id: number;
    name: string;
    description: string | null;
    members_count: number;
    budget_amount: number | null;
    budget_currency: string | null;
    budget_period: string | null;
    spent_amount: number;
    pending_amount: number;
    remaining_budget: number | null;
    utilization_percentage: number | null;
}

interface BudgetPeriodOption {
    value: string;
    label: string;
}

interface DepartmentsProps {
    departments: Department[];
    budgetPeriods: BudgetPeriodOption[];
    organization: { id: number; name: string; slug: string };
    administeredOrganizations: Array<{ id: number; name: string; slug: string; role: string | null }>;
}

interface FormState {
    name: string;
    description: string;
    budget_amount: string;
    budget_currency: string;
    budget_period: string;
}

const EMPTY_FORM: FormState = {
    name: '',
    description: '',
    budget_amount: '',
    budget_currency: 'USD',
    budget_period: 'monthly',
};

export default function Departments({
    departments,
    budgetPeriods,
    organization,
    administeredOrganizations,
}: DepartmentsProps) {
    const page = usePage<{ flash?: { success?: string; error?: string }; errors: Record<string, string> }>();
    const flash = page.props.flash;
    const errors = page.props.errors;

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
    const [processing, setProcessing] = useState(false);

    const formatCurrency = (val: number | null, currency?: string | null) =>
        val !== null
            ? new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: currency ?? 'USD',
                  maximumFractionDigits: 0,
              }).format(val)
            : '—';

    const openCreate = () => {
        setFormData(EMPTY_FORM);
        setEditingId(null);
        setShowForm(true);
    };

    const openEdit = (dept: Department) => {
        setFormData({
            name: dept.name,
            description: dept.description ?? '',
            budget_amount: dept.budget_amount?.toString() ?? '',
            budget_currency: dept.budget_currency ?? 'USD',
            budget_period: dept.budget_period ?? 'monthly',
        });
        setEditingId(dept.id);
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData(EMPTY_FORM);
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        const payload = {
            name: formData.name,
            description: formData.description || null,
            budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
            budget_currency: formData.budget_amount ? formData.budget_currency : null,
            budget_period: formData.budget_amount ? formData.budget_period : null,
        };

        if (editingId) {
            router.put(`/admin/departments/${editingId}`, payload, {
                preserveScroll: true,
                onSuccess: closeForm,
                onFinish: () => setProcessing(false),
            });
        } else {
            router.post('/admin/departments', payload, {
                preserveScroll: true,
                onSuccess: closeForm,
                onFinish: () => setProcessing(false),
            });
        }
    };

    const confirmDelete = (dept: Department) => {
        if (!confirm(`Delete "${dept.name}"? This cannot be undone.`)) return;
        setProcessing(true);
        router.delete(`/admin/departments/${dept.id}`, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const utilizationColor = (pct: number | null) => {
        if (pct === null) return 'bg-zinc-700';
        if (pct >= 90) return 'bg-rose-500';
        if (pct >= 75) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <AdminLayout title="Departments">
            <AdminPageHeader
                organization={organization}
                administeredOrganizations={administeredOrganizations}
                title="Departments"
                subtitle="Organize members into departments and track budget utilization."
            >
                <Button
                    onClick={openCreate}
                    disabled={processing}
                    className="h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-zinc-950 text-sm font-semibold gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" />
                    New department
                </Button>
            </AdminPageHeader>

            {flash?.success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}
            {flash?.error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 animate-in fade-in">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{flash.error}</span>
                </div>
            )}

            {/* Create/Edit form */}
            {showForm && (
                <Card className="border-zinc-800 bg-zinc-900/60">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-zinc-200">
                                {editingId ? 'Edit department' : 'Create department'}
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={closeForm}
                                disabled={processing}
                                className="h-7 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    disabled={processing}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                                {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
                            </div>

                            <div>
                                <label htmlFor="description" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Description <span className="text-zinc-600">(optional)</span>
                                </label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    disabled={processing}
                                    rows={2}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                            </div>

                            <div className="border-t border-zinc-800 pt-4">
                                <h3 className="text-xs font-semibold text-zinc-300 mb-3">Budget (optional)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="budget_amount" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            Amount
                                        </label>
                                        <input
                                            id="budget_amount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.budget_amount}
                                            onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                                            disabled={processing}
                                            placeholder="0.00"
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="budget_currency" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            Currency
                                        </label>
                                        <select
                                            id="budget_currency"
                                            value={formData.budget_currency}
                                            onChange={(e) => setFormData({ ...formData, budget_currency: e.target.value })}
                                            disabled={processing}
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        >
                                            <option value="USD">USD</option>
                                            <option value="EUR">EUR</option>
                                            <option value="GBP">GBP</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="budget_period" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            Period
                                        </label>
                                        <select
                                            id="budget_period"
                                            value={formData.budget_period}
                                            onChange={(e) => setFormData({ ...formData, budget_period: e.target.value })}
                                            disabled={processing}
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        >
                                            {budgetPeriods.map((p) => (
                                                <option key={p.value} value={p.value}>
                                                    {p.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeForm}
                                    disabled={processing}
                                    className="h-9 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing || !formData.name.trim()}
                                    className="h-9 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-sm font-semibold"
                                >
                                    {editingId ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Departments list */}
            <div className="space-y-3">
                {departments.map((dept) => (
                    <Card key={dept.id} className="border-zinc-800 bg-zinc-900/60">
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Building2 className="h-4 w-4 text-indigo-400 shrink-0" />
                                        <h3 className="text-base font-bold text-zinc-100">{dept.name}</h3>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
                                            <Users className="h-3 w-3" />
                                            {dept.members_count}
                                        </span>
                                    </div>
                                    {dept.description && (
                                        <p className="text-xs text-zinc-400 mb-3">{dept.description}</p>
                                    )}

                                    {/* Budget utilization */}
                                    {dept.budget_amount !== null && (
                                        <div className="space-y-2 mt-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-zinc-400">
                                                    Budget ({dept.budget_period})
                                                </span>
                                                <span className="font-medium text-zinc-200">
                                                    {formatCurrency(dept.spent_amount + dept.pending_amount, dept.budget_currency)} of{' '}
                                                    {formatCurrency(dept.budget_amount, dept.budget_currency)}
                                                </span>
                                            </div>
                                            <div className="relative h-2 rounded-full bg-zinc-800 overflow-hidden">
                                                <div
                                                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${utilizationColor(dept.utilization_percentage)}`}
                                                    style={{ width: `${Math.min(dept.utilization_percentage ?? 0, 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-zinc-500">
                                                        Spent: {formatCurrency(dept.spent_amount, dept.budget_currency)}
                                                    </span>
                                                    <span className="text-zinc-500">
                                                        Pending: {formatCurrency(dept.pending_amount, dept.budget_currency)}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`font-semibold ${
                                                        dept.utilization_percentage !== null && dept.utilization_percentage >= 90
                                                            ? 'text-rose-400'
                                                            : dept.utilization_percentage !== null && dept.utilization_percentage >= 75
                                                              ? 'text-amber-400'
                                                              : 'text-emerald-400'
                                                    }`}
                                                >
                                                    {dept.utilization_percentage !== null
                                                        ? `${dept.utilization_percentage.toFixed(0)}%`
                                                        : '—'}
                                                </span>
                                            </div>
                                            {dept.remaining_budget !== null && dept.remaining_budget < 0 && (
                                                <p className="text-[11px] text-rose-400 font-medium">
                                                    Over budget by {formatCurrency(Math.abs(dept.remaining_budget), dept.budget_currency)}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openEdit(dept)}
                                        disabled={processing}
                                        className="h-7 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => confirmDelete(dept)}
                                        disabled={processing || dept.members_count > 0}
                                        title={dept.members_count > 0 ? 'Cannot delete: members still assigned' : 'Delete department'}
                                        className="h-7 rounded-lg border-rose-700/50 bg-rose-900/20 hover:bg-rose-800/30 text-rose-400"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {departments.length === 0 && (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-12 text-center">
                        <Building2 className="mx-auto h-12 w-12 text-zinc-700" />
                        <p className="mt-3 text-sm font-medium text-zinc-400">No departments yet</p>
                        <p className="mt-1 text-xs text-zinc-600">
                            Create departments to organize members and track budgets.
                        </p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
