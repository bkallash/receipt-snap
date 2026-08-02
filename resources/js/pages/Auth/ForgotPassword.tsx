import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send } from 'lucide-react';

export default function ForgotPassword() {
    const { flash } = usePage<{ flash: { status?: string } }>().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/forgot-password');
    }

    return (
        <>
            <Head title="Forgot password" />
            <AuthLayout
                title="Reset your password"
                description="Enter your email and we'll send you a reset link."
            >
                {flash?.status && (
                    <div className="mb-6 rounded-lg border border-emerald-800/50 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-400">
                        {flash.status}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="forgot-email">Email address</Label>
                        <Input
                            id="forgot-email"
                            type="email"
                            autoComplete="email"
                            autoFocus
                            placeholder="you@company.com"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        {errors.email && (
                            <p className="text-xs text-red-400">{errors.email}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Sending...' : 'Send reset link'}
                        {!processing && <Send className="ml-2 h-4 w-4" />}
                    </Button>

                    <Link
                        href="/login"
                        className="flex items-center justify-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to sign in
                    </Link>
                </form>
            </AuthLayout>
        </>
    );
}
