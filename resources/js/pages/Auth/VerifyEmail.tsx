import { Head, useForm, usePage } from '@inertiajs/react';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw } from 'lucide-react';

export default function VerifyEmail() {
    const { flash } = usePage<{ flash: { status?: string } }>().props;
    const { post, processing } = useForm({});

    function handleResend(e: React.FormEvent) {
        e.preventDefault();
        post('/email/verification-notification');
    }

    return (
        <>
            <Head title="Verify email" />
            <AuthLayout
                title="Check your email"
                description="We sent a verification link to your email address."
            >
                {flash?.status && (
                    <div className="mb-6 rounded-lg border border-emerald-800/50 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-400">
                        {flash.status}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Illustration */}
                    <div className="flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600/15">
                            <Mail className="h-8 w-8 text-emerald-400" />
                        </div>
                    </div>

                    <p className="text-center text-sm leading-relaxed text-zinc-400">
                        Click the verification link in the email we sent you. If you don't see it, check your spam folder or request a new one.
                    </p>

                    <form onSubmit={handleResend}>
                        <Button
                            type="submit"
                            variant="secondary"
                            className="w-full"
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Resend verification email
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </AuthLayout>
        </>
    );
}
