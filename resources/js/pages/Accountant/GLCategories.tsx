import React, { useState } from 'react';
import AccountantLayout from '@/layouts/AccountantLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { router } from '@inertiajs/react';
import {
    BookOpenCheck,
    AlertTriangle,
    Edit3,
    Save
} from 'lucide-react';

interface GLCategoriesProps {
    categories: Array<{
        id: number;
        name: string;
        gl_code: string | null;
        default_tax_rate: number | null;
        requires_itemized_tax: boolean;
        max_amount: number | null;
        budget_amount: number | null;
        expenses_count: number;
    }>;
    unmappedCount: number;
}

export default function GLCategories({ categories, unmappedCount }: GLCategoriesProps) {
    const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
    const [glCodeInput, setGlCodeInput] = useState<string>('');
    const [taxRateInput, setTaxRateInput] = useState<string>('');
    const [requiresItemizedInput, setRequiresItemizedInput] = useState<boolean>(false);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
    };

    const startEditing = (cat: any) => {
        setEditingCategoryId(cat.id);
        setGlCodeInput(cat.gl_code ?? '');
        setTaxRateInput(cat.default_tax_rate ? String(cat.default_tax_rate) : '');
        setRequiresItemizedInput(cat.requires_itemized_tax ?? false);
    };

    const handleSave = (id: number) => {
        router.put(`/accountant/gl-categories/${id}`, {
            gl_code: glCodeInput,
            default_tax_rate: taxRateInput ? Number(taxRateInput) : null,
            requires_itemized_tax: requiresItemizedInput,
        }, {
            onSuccess: () => setEditingCategoryId(null),
        });
    };

    return (
        <AccountantLayout title="GL Categories & Accounting Taxonomy">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                        General Ledger (GL) & Accounting Taxonomy
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                        Audit category classifications, map General Ledger accounting codes, and set VAT/Tax itemization requirements.
                    </p>
                </div>
            </div>

            {/* Unmapped Categories Warning Banner */}
            {unmappedCount > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center space-x-3 text-amber-300 text-xs">
                        <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                        <div>
                            <span className="font-bold">{unmappedCount} Expense Category(ies) Lacking GL Code Mapping</span>
                            <p className="text-zinc-400 text-[11px]">Expenses under unmapped categories cannot be exported cleanly to ERPs.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* GL Mapping Table */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden shadow-sm backdrop-blur-sm">
                <div className="p-4 border-b border-zinc-800/80">
                    <h2 className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                        <BookOpenCheck className="w-4 h-4 text-emerald-400" />
                        Chart of Accounts & GL Mapping Directory
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-zinc-950 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                                <th className="p-3.5">Category Name</th>
                                <th className="p-3.5">Mapped GL Code</th>
                                <th className="p-3.5">Default Tax / VAT %</th>
                                <th className="p-3.5 text-center">Requires Itemized Tax</th>
                                <th className="p-3.5 text-right">Active Spend Limit</th>
                                <th className="p-3.5 text-center">Total Claims</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                            {categories.map((cat) => {
                                const isEditing = editingCategoryId === cat.id;
                                return (
                                    <tr key={cat.id} className="hover:bg-zinc-800/40 transition-colors">
                                        <td className="p-3.5 font-semibold text-zinc-200">{cat.name}</td>
                                        <td className="p-3.5">
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={glCodeInput}
                                                    onChange={(e) => setGlCodeInput(e.target.value)}
                                                    placeholder="e.g. GL-6010"
                                                    className="bg-zinc-950 border border-emerald-500 text-zinc-200 text-xs rounded-lg px-2 py-1 font-mono w-28"
                                                />
                                            ) : (
                                                <span className={`inline-block font-mono text-[10.5px] px-2.5 py-0.5 rounded-full border ${
                                                    cat.gl_code
                                                        ? 'bg-zinc-800 text-emerald-400 border-zinc-700'
                                                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                                }`}>
                                                    {cat.gl_code ?? 'UNMAPPED ⚠️'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3.5">
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={taxRateInput}
                                                    onChange={(e) => setTaxRateInput(e.target.value)}
                                                    placeholder="e.g. 20.0"
                                                    className="bg-zinc-950 border border-emerald-500 text-zinc-200 text-xs rounded-lg px-2 py-1 w-20"
                                                />
                                            ) : (
                                                <span className="text-zinc-300 font-medium">{cat.default_tax_rate ? `${cat.default_tax_rate}%` : 'Standard / Exempt'}</span>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-center">
                                            {isEditing ? (
                                                <input
                                                    type="checkbox"
                                                    checked={requiresItemizedInput}
                                                    onChange={(e) => setRequiresItemizedInput(e.target.checked)}
                                                    className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-0"
                                                />
                                            ) : (
                                                <Badge className={`text-[10px] font-semibold ${
                                                    cat.requires_itemized_tax ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                                                }`}>
                                                    {cat.requires_itemized_tax ? 'YES' : 'NO'}
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-3.5 text-right font-medium text-zinc-300">
                                            {cat.max_amount ? formatCurrency(Number(cat.max_amount)) : 'No Limit'}
                                        </td>
                                        <td className="p-3.5 text-center font-mono text-zinc-400">{cat.expenses_count}</td>
                                        <td className="p-3.5 text-right">
                                            {isEditing ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSave(cat.id)}
                                                    className="h-7 text-[11px] bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400"
                                                >
                                                    <Save className="mr-1 h-3 w-3" /> Save
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => startEditing(cat)}
                                                    className="h-7 text-[11px] border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                                                >
                                                    <Edit3 className="mr-1 h-3 w-3 text-emerald-400" /> Map GL
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AccountantLayout>
    );
}
