import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import React from 'react';

interface ReceiptAnalyzingModalProps {
    isOpen: boolean;
}

export default function ReceiptAnalyzingModal({ isOpen }: ReceiptAnalyzingModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl shadow-emerald-950/30">
                <CardContent className="flex flex-col items-center justify-center p-4 space-y-4">
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-emerald-300 animate-pulse" />
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-zinc-100">
                            Analyzing Receipt...
                        </h3>
                        <p className="text-xs text-zinc-400">
                            Please wait while AI extracts merchant details, line items, and totals.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
