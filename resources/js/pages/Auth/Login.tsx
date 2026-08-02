import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/login');
    }

    return (
        <>
            <Head title="Sign in" />
            <AuthLayout
                title="Welcome back"
                description="Sign in to your ReceiptSnap account to continue."
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="login-email">Email address</Label>
                        <Input
                            id="login-email"
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

                    {/* Password */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="login-password">Password</Label>
                            <Link
                                href="/forgot-password"
                                className="text-xs text-emerald-400 hover:text-emerald-300"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <Input
                            id="login-password"
                            type="password"
                            autoComplete="current-password"
                            placeholder="Enter your password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        {errors.password && (
                            <p className="text-xs text-red-400">{errors.password}</p>
                        )}
                    </div>

                    {/* Remember */}
                    <div className="flex items-center gap-2">
                        <input
                            id="login-remember"
                            type="checkbox"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-zinc-950"
                        />
                        <label htmlFor="login-remember" className="text-sm text-zinc-400">
                            Remember me
                        </label>
                    </div>

                    {/* Submit */}
                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Signing in...' : 'Sign in'}
                        {!processing && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>

                    {/* Register link */}
                    <p className="text-center text-sm text-zinc-400">
                        Don't have an account?{' '}
                        <Link
                            href="/register"
                            className="font-medium text-emerald-400 hover:text-emerald-300"
                        >
                            Create one
                        </Link>
                    </p>
                </form>
            </AuthLayout>
        </>
    );
}
