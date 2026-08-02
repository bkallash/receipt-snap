import { Head, useForm } from '@inertiajs/react';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function TwoFactorChallenge() {
    const [useRecovery, setUseRecovery] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        code: '',
        recovery_code: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/two-factor-challenge');
    }

    return (
        <>
            <Head title="Two-factor authentication" />
            <AuthLayout
                title="Two-factor authentication"
                description={
                    useRecovery
                        ? 'Enter one of your emergency recovery codes.'
                        : 'Enter the code from your authenticator app.'
                }
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/15">
                            <ShieldCheck className="h-7 w-7 text-emerald-400" />
                        </div>
                    </div>

                    {useRecovery ? (
                        <div className="space-y-2">
                            <Label htmlFor="tfa-recovery">Recovery code</Label>
                            <Input
                                id="tfa-recovery"
                                type="text"
                                autoFocus
                                autoComplete="one-time-code"
                                placeholder="abcde-12345"
                                value={data.recovery_code}
                                onChange={(e) => setData('recovery_code', e.target.value)}
                                className="font-mono tracking-wider"
                            />
                            {errors.recovery_code && (
                                <p className="text-xs text-red-400">{errors.recovery_code}</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label htmlFor="tfa-code">Authentication code</Label>
                            <Input
                                id="tfa-code"
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                autoComplete="one-time-code"
                                placeholder="000000"
                                maxLength={6}
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                className="text-center font-mono text-lg tracking-[0.3em]"
                            />
                            {errors.code && (
                                <p className="text-xs text-red-400">{errors.code}</p>
                            )}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Verifying...' : 'Verify'}
                    </Button>

                    <button
                        type="button"
                        onClick={() => setUseRecovery(!useRecovery)}
                        className="w-full text-center text-sm text-zinc-400 transition-colors hover:text-zinc-200"
                    >
                        {useRecovery
                            ? 'Use authenticator code instead'
                            : 'Use a recovery code instead'}
                    </button>
                </form>
            </AuthLayout>
        </>
    );
}
