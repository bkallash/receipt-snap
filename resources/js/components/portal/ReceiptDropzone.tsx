import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';
import { FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';

interface ReceiptDropzoneProps {
    onUploadSuccess: (expense: any) => void;
    isScanning?: boolean;
}

export default function ReceiptDropzone({
    onUploadSuccess,
    isScanning = false,
}: ReceiptDropzoneProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        uploadFile(file);
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setErrorMsg(null);

        const formData = new FormData();
        formData.append('receipt_images[]', file);
        formData.append('amount', '0.01'); // Temporary placeholder until AI scan completes
        formData.append('currency_code', 'USD');
        formData.append(
            'expense_date',
            new Date().toISOString().split('T')[0]
        );
        formData.append(
            'description',
            `Receipt scan upload (${file.name})`
        );

        try {
            const response = await apiFetch('/api/v1/expenses', {
                method: 'POST',
                body: formData,
            });

            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await response.json()
                : null;

            if (!response.ok) {
                const errText = data?.message || (data?.errors ? Object.values(data.errors).flat().join(', ') : null);
                throw new Error(
                    errText || `Failed to upload receipt file (Status ${response.status}).`
                );
            }

            if (!data?.data) {
                throw new Error('Unexpected response format from server.');
            }

            onUploadSuccess(data.data);
        } catch (err: any) {
            setErrorMsg(err.message || 'An error occurred during upload.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files);
        }
    };

    return (
        <Card className="overflow-hidden border-dashed border-zinc-800 bg-zinc-900/40 transition-colors hover:border-emerald-500/50">
            <CardContent className="p-0">
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center p-8 text-center transition-all ${
                        isDragging
                            ? 'bg-emerald-500/10 border-emerald-500'
                            : 'hover:bg-zinc-900/80'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        className="hidden"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleFileSelect(e.target.files)}
                    />

                    {isUploading || isScanning ? (
                        <div className="flex flex-col items-center py-2">
                            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                                <Loader2 className="h-7 w-7 animate-spin" />
                                <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-emerald-300 animate-pulse" />
                            </div>
                            <h4 className="mt-4 text-sm font-semibold text-zinc-100">
                                {isUploading
                                    ? 'Uploading Receipt...'
                                    : 'AI Extracting Details...'}
                            </h4>
                            <p className="mt-1 text-xs text-zinc-400">
                                Extracting seller, items, qt, price, tax, tip & totals
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-emerald-400 shadow-inner">
                                <Upload className="h-6 w-6" />
                            </div>

                            <div className="mt-3">
                                <h4 className="text-sm font-semibold text-zinc-200">
                                    Drop your receipt image or PDF here
                                </h4>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Supports PNG, JPG, WebP, or PDF up to 10MB
                                </p>
                            </div>

                            <div className="mt-4 flex items-center gap-2 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                <Sparkles className="h-3 w-3" />
                                Instant AI Scan & Itemization
                            </div>
                        </>
                    )}

                    {errorMsg && (
                        <p className="mt-3 text-xs font-medium text-rose-400">
                            {errorMsg}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
