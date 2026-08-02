import { Head, useForm } from '@inertiajs/react';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';

interface ResetPasswordProps {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors } = useForm({
        token,
        email: email || '',
        password: '',
        password_confirmation: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/reset-password');
    }

    return (
        <>
            <Head title="Reset password" />
            <AuthLayout
                title="Set a new password"
                description="Choose a strong password for your account."
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email (pre-filled, read-only) */}
                    <div className="space-y-2">
                        <Label htmlFor="reset-email">Email address</Label>
                        <Input
                            id="reset-email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            readOnly
                            className="opacity-60"
                        />
                        {errors.email && (
                            <p className="text-xs text-red-400">{errors.email}</p>
                        )}
                    </div>

                    {/* New password */}
                    <div className="space-y-2">
                        <Label htmlFor="reset-password">New password</Label>
                        <Input
                            id="reset-password"
                            type="password"
                            autoComplete="new-password"
                            autoFocus
                            placeholder="Enter new password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        {errors.password && (
                            <p className="text-xs text-red-400">{errors.password}</p>
                        )}
                    </div>

                    {/* Confirm */}
                    <div className="space-y-2">
                        <Label htmlFor="reset-password-confirm">Confirm password</Label>
                        <Input
                            id="reset-password-confirm"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Confirm new password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                        />
                        {errors.password_confirmation && (
                            <p className="text-xs text-red-400">{errors.password_confirmation}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Resetting...' : 'Reset password'}
                        {!processing && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                </form>
            </AuthLayout>
        </>
    );
}
