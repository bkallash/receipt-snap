import { Head, useForm } from '@inertiajs/react';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors } = useForm({
        password: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/user/confirm-password');
    }

    return (
        <>
            <Head title="Confirm password" />
            <AuthLayout
                title="Confirm your password"
                description="Please confirm your password before continuing to this secure area."
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600/15">
                            <Lock className="h-7 w-7 text-emerald-400" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm-password">Password</Label>
                        <Input
                            id="confirm-password"
                            type="password"
                            autoComplete="current-password"
                            autoFocus
                            placeholder="Enter your password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        {errors.password && (
                            <p className="text-xs text-red-400">{errors.password}</p>
                        )}
                    </div>

                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Confirming...' : 'Confirm password'}
                    </Button>
                </form>
            </AuthLayout>
        </>
    );
}
