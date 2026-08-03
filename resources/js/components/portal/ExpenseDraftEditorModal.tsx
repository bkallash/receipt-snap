import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import {
    AlertTriangle,
    FileText,
    Loader2,
    Plus,
    Receipt,
    Save,
    Send,
    Sparkles,
    Trash2,
    X,
    ZoomIn,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface LineItemForm {
    id?: number;
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}

export interface Category {
    id: number;
    name: string;
    code?: string;
}

export interface ExpenseDraftEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense: any;
    categories: Category[];
    onSaveSuccess: (updatedExpense: any) => void;
    onSubmitSuccess: (submittedExpense: any) => void;
    onDeleteSuccess?: (deletedExpenseId: number | string) => void;
}

function mapLineItems(items: any): LineItemForm[] {
    if (!items || !Array.isArray(items) || items.length === 0) {
        return [];
    }

    return items.map((item: any) => ({
        id: item?.id,
        description: item?.description || '',
        quantity: Number(item?.quantity) || 1,
        unit_price: Number(item?.unit_price) || 0,
        total_price:
            Number(item?.total_price) ||
            Number(item?.quantity) * Number(item?.unit_price) ||
            0,
    }));
}

export default function ExpenseDraftEditorModal({
    isOpen,
    onClose,
    expense,
    categories,
    onSaveSuccess,
    onSubmitSuccess,
    onDeleteSuccess,
}: ExpenseDraftEditorModalProps) {
    // Hooks must run unconditionally — early return after hooks only.
    const [merchantName, setMerchantName] = useState('');
    const [expenseCategoryId, setExpenseCategoryId] = useState<number | string>('');
    const [amount, setAmount] = useState<string | number>(0);
    const [taxAmount, setTaxAmount] = useState<string | number>(0);
    const [tipAmount, setTipAmount] = useState<string | number>(0);
    const [currencyCode, setCurrencyCode] = useState('USD');
    const [expenseDate, setExpenseDate] = useState(
        () => new Date().toISOString().split('T')[0]
    );
    const [paymentMethod, setPaymentMethod] = useState('corporate_card');
    const [description, setDescription] = useState('');
    const [lineItems, setLineItems] = useState<LineItemForm[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [imageZoomed, setImageZoomed] = useState(false);

    const [currentExpense, setCurrentExpense] = useState<any>(expense);
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

    // Fetch fresh expense details including line items when modal opens
    useEffect(() => {
        setCurrentExpense(expense);
        if (!isOpen || !expense?.id) return;

        setIsLoadingDetails(true);
        apiFetch(`/api/v1/expenses/${expense.id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data?.data) {
                    setCurrentExpense(data.data);
                }
            })
            .catch(() => {})
            .finally(() => setIsLoadingDetails(false));
    }, [isOpen, expense?.id]);

    // Sync form when expense or fetched data changes
    useEffect(() => {
        const target = currentExpense || expense;
        if (!target) {
            return;
        }

        setMerchantName(target.merchant_name || '');
        setExpenseCategoryId(
            target.category?.id || target.expense_category_id || ''
        );
        setAmount(target.amount !== undefined && target.amount !== null ? String(target.amount) : '0');
        setTaxAmount(target.tax_amount !== undefined && target.tax_amount !== null ? String(target.tax_amount) : '0');
        setTipAmount(target.tip_amount !== undefined && target.tip_amount !== null ? String(target.tip_amount) : '0');
        setCurrencyCode(target.currency_code || 'USD');

        const rawDate = target.expense_date ? String(target.expense_date).split('T')[0] : new Date().toISOString().split('T')[0];
        setExpenseDate(rawDate);

        const rawPaymentMethod = typeof target.payment_method === 'object'
            ? target.payment_method?.value
            : target.payment_method;
        setPaymentMethod(rawPaymentMethod || 'corporate_card');

        setDescription(target.description || '');

        const rawItems = target.line_items || target.lineItems || [];
        setLineItems(mapLineItems(rawItems));
        setErrorMsg(null);
        setImageZoomed(false);
    }, [currentExpense, expense]);

    if (!isOpen || !expense) {
        return null;
    }

    const handleLineItemChange = (
        index: number,
        field: keyof LineItemForm,
        value: any
    ) => {
        const updated = [...lineItems];
        const current = { ...updated[index], [field]: value };

        if (field === 'quantity' || field === 'unit_price') {
            const qty = Number(field === 'quantity' ? value : current.quantity) || 0;
            const price = Number(field === 'unit_price' ? value : current.unit_price) || 0;
            current.total_price = Number((qty * price).toFixed(2));
        }

        updated[index] = current;
        setLineItems(updated);

        const sumLineItems = updated.reduce(
            (sum, item) => sum + (Number(item.total_price) || 0),
            0
        );
        if (sumLineItems > 0) {
            const total = sumLineItems + Number(taxAmount || 0) + Number(tipAmount || 0);
            setAmount(Number(total.toFixed(2)));
        }
    };

    const addLineItem = () => {
        setLineItems([
            ...lineItems,
            { description: '', quantity: 1, unit_price: 0, total_price: 0 },
        ]);
    };

    const removeLineItem = (index: number) => {
        setLineItems(lineItems.filter((_, i) => i !== index));
    };

    const activeExp = currentExpense || expense;

    const receiptImages = activeExp.receipt_images || activeExp.receiptImages || [];
    const receiptImage =
        Array.isArray(receiptImages) && receiptImages.length > 0
            ? receiptImages[0]
            : null;
    const receiptImageUrl = receiptImage?.url || receiptImage?.file_path;

    const confidenceScore = activeExp.receipt?.confidence_score
        ? Number(activeExp.receipt.confidence_score)
        : null;

    const rawPolicyFlags = activeExp.policy_flags || activeExp.policyFlags || activeExp.metadata?.policy_flags || [];
    const policyFlags = Array.isArray(rawPolicyFlags) ? rawPolicyFlags : [];
    const safeCategories = Array.isArray(categories) ? categories : [];

    const buildPayload = () => ({
        merchant_name: merchantName,
        expense_category_id: expenseCategoryId ? Number(expenseCategoryId) : null,
        amount: Number(amount),
        tax_amount: Number(taxAmount),
        tip_amount: Number(tipAmount),
        currency_code: currencyCode,
        expense_date: expenseDate,
        payment_method: paymentMethod,
        description: description,
        line_items: lineItems
            .filter((item) => item.description && item.description.trim() !== '')
            .map((item) => ({
                description: item.description.trim(),
                quantity: Math.max(0.001, Number(item.quantity) || 1),
                unit_price: Math.max(0, Number(item.unit_price) || 0),
                total_price: Math.max(0, Number(item.total_price) || 0),
            })),
    });

    const handleSaveDraft = async () => {
        setIsSaving(true);
        setErrorMsg(null);

        try {
            const response = await apiFetch(`/api/v1/expenses/${expense.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildPayload()),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to save draft expense.');
            }

            const resData = await response.json();
            onSaveSuccess(resData.data);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to save draft expense.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteDraft = async () => {
        if (!confirm('Discard this draft receipt? This cannot be undone.')) {
            return;
        }

        setIsDeleting(true);
        setErrorMsg(null);

        try {
            const response = await apiFetch(`/api/v1/expenses/${expense.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to discard draft.');
            }

            onDeleteSuccess?.(expense.id);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to discard draft.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSubmitToManager = async () => {
        setIsSubmitting(true);
        setErrorMsg(null);

        try {
            const updateResponse = await apiFetch(`/api/v1/expenses/${expense.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(buildPayload()),
            });

            if (!updateResponse.ok) {
                const errData = await updateResponse.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to save draft before submit.');
            }

            const submitResponse = await apiFetch(
                `/api/v1/expenses/${expense.id}/submit`,
                {
                    method: 'POST',
                }
            );

            if (!submitResponse.ok) {
                const errData = await submitResponse.json().catch(() => ({}));
                throw new Error(
                    errData.message || 'Failed to submit expense for review.'
                );
            }

            const resData = await submitResponse.json();
            onSubmitSuccess(resData.data);
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to submit expense.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">
            <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-emerald-950/20">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                            <Receipt className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-zinc-100">
                                    Review & Edit Scanned Receipt
                                </h3>
                                <Badge className="bg-zinc-800 text-zinc-300">
                                    {expense.status}
                                </Badge>
                                {confidenceScore !== null && (
                                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                                        <Sparkles className="mr-1 h-3 w-3" />
                                        {confidenceScore}% AI Confidence
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-zinc-400">
                                Cross-reference extracted items with your receipt preview and submit to your manager.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal Main Content (Split view) */}
                <div className="grid grid-cols-1 overflow-y-auto lg:grid-cols-12">
                    {/* Left: Scanned Receipt Image Preview */}
                    <div className="border-b border-zinc-800 bg-zinc-900/40 p-4 lg:col-span-5 lg:border-b-0 lg:border-r">
                        <div className="flex items-center justify-between pb-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Scanned Image Preview
                            </span>
                            {receiptImageUrl && (
                                <button
                                    onClick={() => setImageZoomed(!imageZoomed)}
                                    className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:underline"
                                >
                                    <ZoomIn className="h-3.5 w-3.5" />
                                    {imageZoomed ? 'Reset View' : 'Zoom In'}
                                </button>
                            )}
                        </div>

                        <div className="flex min-h-[350px] items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80 p-2">
                            {receiptImageUrl ? (
                                <img
                                    src={receiptImageUrl}
                                    alt="Scanned receipt"
                                    className={`rounded-lg object-contain transition-all duration-200 ${
                                        imageZoomed
                                            ? 'max-h-[700px] scale-125 cursor-zoom-out'
                                            : 'max-h-[480px] w-full cursor-zoom-in'
                                    }`}
                                    onClick={() => setImageZoomed(!imageZoomed)}
                                />
                            ) : (
                                <div className="text-center p-8 text-zinc-500">
                                    <FileText className="mx-auto h-12 w-12 stroke-[1.5]" />
                                    <p className="mt-2 text-xs">
                                        No image preview available
                                    </p>
                                </div>
                            )}
                        </div>

                        {policyFlags.length > 0 && (
                            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
                                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                                    <AlertTriangle className="h-4 w-4" />
                                    Policy Engine Warnings ({policyFlags.length})
                                </div>
                                <ul className="mt-2 space-y-1 text-[11px] text-amber-200/90">
                                    {policyFlags.map((flag: any, idx: number) => (
                                        <li key={idx} className="flex items-start gap-1.5">
                                            <span className="font-bold">•</span>
                                            <span>{flag.message || flag.code}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Right: Editable Receipt & Line Items Form */}
                    <div className="p-6 lg:col-span-7 space-y-6">
                        {(expense.status === 'PendingScan' || expense.status === 'pending_scan') && (
                            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-300 animate-pulse">
                                <Loader2 className="h-4 w-4 animate-spin text-emerald-400 shrink-0" />
                                <span>AI OCR scanning in progress... Merchant, amounts, and itemized purchases will auto-populate shortly.</span>
                            </div>
                        )}

                        {errorMsg && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
                                {errorMsg}
                            </div>
                        )}

                        {/* Basic Details */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <Label className="text-xs text-zinc-300">
                                    Merchant / Seller Name *
                                </Label>
                                <Input
                                    value={merchantName}
                                    onChange={(e) => setMerchantName(e.target.value)}
                                    placeholder="e.g. Starbucks, Uber, Delta Airlines"
                                    className="mt-1 border-zinc-800 bg-zinc-900/80 text-zinc-100 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <Label className="text-xs text-zinc-300">
                                    Expense Category
                                </Label>
                                <select
                                    value={expenseCategoryId}
                                    onChange={(e) => setExpenseCategoryId(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">Select Category...</option>
                                    {safeCategories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <Label className="text-xs text-zinc-300">
                                    Expense Date *
                                </Label>
                                <Input
                                    type="date"
                                    value={expenseDate}
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    className="mt-1 border-zinc-800 bg-zinc-900/80 text-zinc-100 focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <Label className="text-xs text-zinc-300">
                                    Payment Method
                                </Label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="corporate_card">Corporate Card</option>
                                    <option value="personal_card">Personal Card (Reimbursable)</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>
                        </div>

                        {/* Amounts (Total, Tax, Tip) */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                Financial Amounts ({currencyCode})
                            </h4>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <Label className="text-xs text-zinc-400">
                                        Total Amount *
                                    </Label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2.5 top-2.5 text-xs text-zinc-500">
                                            $
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="pl-6 border-zinc-800 bg-zinc-900 font-semibold text-emerald-400 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-zinc-400">
                                        Tax Amount
                                    </Label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2.5 top-2.5 text-xs text-zinc-500">
                                            $
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={taxAmount}
                                            onChange={(e) => setTaxAmount(e.target.value)}
                                            className="pl-6 border-zinc-800 bg-zinc-900 text-zinc-200 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-zinc-400">
                                        Tip Amount
                                    </Label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2.5 top-2.5 text-xs text-zinc-500">
                                            $
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={tipAmount}
                                            onChange={(e) => setTipAmount(e.target.value)}
                                            className="pl-6 border-zinc-800 bg-zinc-900 text-zinc-200 focus:border-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Itemized Line Items Table */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                                    Itemized Purchases (Extracted Items)
                                </h4>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addLineItem}
                                    className="h-7 border-zinc-800 bg-zinc-900 px-2.5 text-xs text-emerald-400 hover:bg-zinc-800"
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add Item
                                </Button>
                            </div>

                            {lineItems.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-500">
                                    No itemized line items extracted yet. Click "Add Item" to add item details.
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
                                    <table className="w-full text-left text-xs">
                                        <thead className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400">
                                            <tr>
                                                <th className="px-3 py-2">Item Description</th>
                                                <th className="w-20 px-2 py-2 text-center">Qt</th>
                                                <th className="w-24 px-2 py-2">Price ($)</th>
                                                <th className="w-24 px-2 py-2 text-right">Total ($)</th>
                                                <th className="w-10 px-2 py-2 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/60">
                                            {lineItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-zinc-800/40">
                                                    <td className="p-2">
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) =>
                                                                handleLineItemChange(
                                                                    idx,
                                                                    'description',
                                                                    e.target.value
                                                                )
                                                            }
                                                            placeholder="Item name"
                                                            className="h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-100"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            step="1"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={(e) =>
                                                                handleLineItemChange(
                                                                    idx,
                                                                    'quantity',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="h-8 text-center border-zinc-800 bg-zinc-950 text-xs text-zinc-100"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.unit_price}
                                                            onChange={(e) =>
                                                                handleLineItemChange(
                                                                    idx,
                                                                    'unit_price',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-100"
                                                        />
                                                    </td>
                                                    <td className="p-2 text-right font-medium text-emerald-400">
                                                        ${Number(item.total_price || 0).toFixed(2)}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLineItem(idx)}
                                                            className="p-1 text-zinc-500 hover:text-rose-400"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-t border-zinc-800 bg-zinc-900/80 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 text-xs h-9"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleDeleteDraft}
                            disabled={isSaving || isSubmitting || isDeleting}
                            className="border-rose-900/30 bg-rose-900/10 text-rose-400 hover:bg-rose-900/20 text-xs h-9"
                        >
                            {isDeleting ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            Discard
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={isSaving || isSubmitting || isDeleting}
                            className="border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 text-xs h-9"
                        >
                            {isSaving ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-emerald-400" />
                            ) : (
                                <Save className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                            )}
                            Save Draft
                        </Button>

                        <Button
                            type="button"
                            onClick={handleSubmitToManager}
                            disabled={isSaving || isSubmitting || isDeleting}
                            className="bg-emerald-500 font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.98] text-xs h-9"
                        >
                            {isSubmitting ? (
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-zinc-950" />
                            ) : (
                                <Send className="mr-1.5 h-3.5 w-3.5 text-zinc-950 stroke-[2.5]" />
                            )}
                            Submit to Manager
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
