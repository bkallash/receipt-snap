import React, { useState, FormEvent } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/portal/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    description: string | null;
    icon: string | null;
    color: string | null;
    gl_code: string | null;
    is_active: boolean;
    max_amount: number | null;
    default_tax_rate: number | null;
    requires_itemized_tax: boolean;
    budget_amount: number | null;
    budget_currency: string | null;
    budget_period: string | null;
    sort_order: number;
    expenses_count: number;
    spent_amount: number;
    pending_amount: number;
    remaining_budget: number | null;
    utilization_percentage: number | null;
}

interface BudgetPeriodOption {
    value: string;
    label: string;
}

interface CategoriesProps {
    categories: Category[];
    budgetPeriods: BudgetPeriodOption[];
    organization: { id: number; name: string; slug: string };
    administeredOrganizations: Array<{ id: number; name: string; slug: string; role: string | null }>;
}

interface FormState {
    name: string;
    description: string;
    color: string;
    gl_code: string;
    is_active: boolean;
    max_amount: string;
    default_tax_rate: string;
    requires_itemized_tax: boolean;
    budget_amount: string;
    budget_currency: string;
    budget_period: string;
}

const EMPTY_FORM: FormState = {
    name: '',
    description: '',
    color: '#6366f1',
    gl_code: '',
    is_active: true,
    max_amount: '',
    default_tax_rate: '',
    requires_itemized_tax: false,
    budget_amount: '',
    budget_currency: 'USD',
    budget_period: 'monthly',
};

export default function Categories({
    categories,
    budgetPeriods,
    organization,
    administeredOrganizations,
}: CategoriesProps) {
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

    const openEdit = (cat: Category) => {
        setFormData({
            name: cat.name,
            description: cat.description ?? '',
            color: cat.color ?? '#6366f1',
            gl_code: cat.gl_code ?? '',
            is_active: cat.is_active,
            max_amount: cat.max_amount?.toString() ?? '',
            default_tax_rate: cat.default_tax_rate?.toString() ?? '',
            requires_itemized_tax: cat.requires_itemized_tax,
            budget_amount: cat.budget_amount?.toString() ?? '',
            budget_currency: cat.budget_currency ?? 'USD',
            budget_period: cat.budget_period ?? 'monthly',
        });
        setEditingId(cat.id);
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
            color: formData.color || null,
            gl_code: formData.gl_code || null,
            is_active: formData.is_active,
            max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
            default_tax_rate: formData.default_tax_rate ? parseFloat(formData.default_tax_rate) : null,
            requires_itemized_tax: formData.requires_itemized_tax,
            budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : null,
            budget_currency: formData.budget_amount ? formData.budget_currency : null,
            budget_period: formData.budget_amount ? formData.budget_period : null,
        };

        if (editingId) {
            router.put(`/admin/categories/${editingId}`, payload, {
                preserveScroll: true,
                onSuccess: closeForm,
                onFinish: () => setProcessing(false),
            });
        } else {
            router.post('/admin/categories', payload, {
                preserveScroll: true,
                onSuccess: closeForm,
                onFinish: () => setProcessing(false),
            });
        }
    };

    const toggleActive = (cat: Category) => {
        setProcessing(true);
        router.put(
            `/admin/categories/${cat.id}`,
            {
                name: cat.name,
                description: cat.description,
                color: cat.color,
                gl_code: cat.gl_code,
                is_active: !cat.is_active,
                max_amount: cat.max_amount,
                default_tax_rate: cat.default_tax_rate,
                requires_itemized_tax: cat.requires_itemized_tax,
                budget_amount: cat.budget_amount,
                budget_currency: cat.budget_amount !== null ? cat.budget_currency : null,
                budget_period: cat.budget_amount !== null ? cat.budget_period : null,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
            }
        );
    };

    const confirmDelete = (cat: Category) => {
        if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return;
        setProcessing(true);
        router.delete(`/admin/categories/${cat.id}`, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AdminLayout title="Categories">
            <AdminPageHeader
                organization={organization}
                administeredOrganizations={administeredOrganizations}
                title="Categories"
                subtitle="Define expense categories, spending rules, tax treatment, and budgets."
            >
                <Button
                    onClick={openCreate}
                    disabled={processing}
                    className="h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-zinc-950 text-sm font-semibold gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" />
                    New category
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
                                {editingId ? 'Edit category' : 'Create category'}
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
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
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
                                    <label htmlFor="color" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                        Color
                                    </label>
                                    <input
                                        id="color"
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        disabled={processing}
                                        className="h-[38px] w-16 rounded-lg border border-zinc-700 bg-zinc-800 cursor-pointer"
                                    />
                                </div>
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

                            {/* Spending rules */}
                            <div className="border-t border-zinc-800 pt-4">
                                <h3 className="text-xs font-semibold text-zinc-300 mb-3">Spending rules</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="max_amount" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            Max amount per claim
                                        </label>
                                        <input
                                            id="max_amount"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.max_amount}
                                            onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                                            disabled={processing}
                                            placeholder="No limit"
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="gl_code" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            GL code
                                        </label>
                                        <input
                                            id="gl_code"
                                            type="text"
                                            value={formData.gl_code}
                                            onChange={(e) => setFormData({ ...formData, gl_code: e.target.value })}
                                            disabled={processing}
                                            placeholder="e.g. 6100"
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="default_tax_rate" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                            Default tax rate (%)
                                        </label>
                                        <input
                                            id="default_tax_rate"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={formData.default_tax_rate}
                                            onChange={(e) => setFormData({ ...formData, default_tax_rate: e.target.value })}
                                            disabled={processing}
                                            placeholder="0"
                                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        />
                                    </div>
                                </div>

                                <div className="mt-3 flex flex-col gap-2">
                                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.requires_itemized_tax}
                                            onChange={(e) => setFormData({ ...formData, requires_itemized_tax: e.target.checked })}
                                            disabled={processing}
                                            className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-indigo-400"
                                        />
                                        Require itemized tax breakdown
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.is_active}
                                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            disabled={processing}
                                            className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-400"
                                        />
                                        Active (available for new expenses)
                                    </label>
                                </div>
                            </div>

                            {/* Budget */}
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

            {/* Categories table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="border-b border-zinc-800 px-5 py-4 flex items-center gap-2">
                    <Tags className="h-4 w-4 text-indigo-400" />
                    <h2 className="text-sm font-bold text-zinc-200">All categories ({categories.length})</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th className="px-5 py-3">Category</th>
                                <th className="px-5 py-3">Rules</th>
                                <th className="px-5 py-3">GL code</th>
                                <th className="px-5 py-3">Budget</th>
                                <th className="px-5 py-3">Usage</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {categories.map((cat) => (
                                <tr key={cat.id} className={`hover:bg-zinc-800/40 transition-colors ${!cat.is_active ? 'opacity-60' : ''}`}>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <span
                                                className="h-3 w-3 rounded-full shrink-0 ring-1 ring-zinc-700"
                                                style={{ backgroundColor: cat.color ?? '#71717a' }}
                                            />
                                            <div className="min-w-0">
                                                <p className="font-medium text-zinc-200 truncate">{cat.name}</p>
                                                {cat.description && (
                                                    <p className="text-xs text-zinc-500 truncate">{cat.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex flex-col gap-1 text-[11px]">
                                            {cat.max_amount !== null && (
                                                <span className="text-zinc-400">
                                                    Max {formatCurrency(cat.max_amount)}
                                                </span>
                                            )}
                                            {cat.default_tax_rate !== null && (
                                                <span className="text-zinc-400">Tax {cat.default_tax_rate}%</span>
                                            )}
                                            {cat.requires_itemized_tax && (
                                                <span className="text-amber-400">Itemized tax</span>
                                            )}
                                            {cat.max_amount === null &&
                                                cat.default_tax_rate === null &&
                                                !cat.requires_itemized_tax && (
                                                    <span className="text-zinc-600">—</span>
                                                )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs font-mono text-zinc-400">
                                            {cat.gl_code || <span className="text-zinc-600">—</span>}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {cat.budget_amount !== null ? (
                                            <div className="text-xs">
                                                <p className="text-zinc-300">
                                                    {formatCurrency(cat.budget_amount, cat.budget_currency)}
                                                </p>
                                                <p className="text-zinc-600 capitalize">{cat.budget_period}</p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-zinc-600">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        {cat.budget_amount !== null ? (
                                            <div className="w-24">
                                                <div className="relative h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                                    <div
                                                        className={`absolute inset-y-0 left-0 rounded-full ${
                                                            (cat.utilization_percentage ?? 0) >= 90
                                                                ? 'bg-rose-500'
                                                                : (cat.utilization_percentage ?? 0) >= 75
                                                                  ? 'bg-amber-500'
                                                                  : 'bg-emerald-500'
                                                        }`}
                                                        style={{ width: `${Math.min(cat.utilization_percentage ?? 0, 100)}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1 text-[11px] text-zinc-500">
                                                    {cat.utilization_percentage !== null
                                                        ? `${cat.utilization_percentage.toFixed(0)}%`
                                                        : '—'}
                                                </p>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-zinc-500">{cat.expenses_count} claims</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <button
                                            onClick={() => toggleActive(cat)}
                                            disabled={processing}
                                            title="Toggle active status"
                                            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                                cat.is_active
                                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                                                    : 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20 hover:bg-zinc-500/20'
                                            }`}
                                        >
                                            {cat.is_active ? 'Active' : 'Disabled'}
                                        </button>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEdit(cat)}
                                                disabled={processing}
                                                className="h-7 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => confirmDelete(cat)}
                                                disabled={processing || cat.expenses_count > 0}
                                                title={cat.expenses_count > 0 ? 'Used by expenses — disable instead' : 'Delete category'}
                                                className="h-7 rounded-lg border-rose-700/50 bg-rose-900/20 hover:bg-rose-800/30 text-rose-400"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {categories.length === 0 && (
                    <div className="px-5 py-12 text-center">
                        <Tags className="mx-auto h-12 w-12 text-zinc-700" />
                        <p className="mt-3 text-sm font-medium text-zinc-400">No categories yet</p>
                        <p className="mt-1 text-xs text-zinc-600">
                            Create categories to organize and control expenses.
                        </p>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
