import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '@/layouts/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight } from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/register');
    }

    return (
        <>
            <Head title="Create account" />
            <AuthLayout
                title="Create your account"
                description="Start managing expenses smarter in minutes."
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="register-name">Full name</Label>
                        <Input
                            id="register-name"
                            type="text"
                            autoComplete="name"
                            autoFocus
                            placeholder="Jane Smith"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                        />
                        {errors.name && (
                            <p className="text-xs text-red-400">{errors.name}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <Label htmlFor="register-email">Email address</Label>
                        <Input
                            id="register-email"
                            type="email"
                            autoComplete="email"
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
                        <Label htmlFor="register-password">Password</Label>
                        <Input
                            id="register-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Create a strong password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                        />
                        {errors.password && (
                            <p className="text-xs text-red-400">{errors.password}</p>
                        )}
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-2">
                        <Label htmlFor="register-password-confirm">Confirm password</Label>
                        <Input
                            id="register-password-confirm"
                            type="password"
                            autoComplete="new-password"
                            placeholder="Confirm your password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                        />
                        {errors.password_confirmation && (
                            <p className="text-xs text-red-400">{errors.password_confirmation}</p>
                        )}
                    </div>

                    {/* Submit */}
                    <Button type="submit" className="w-full" disabled={processing}>
                        {processing ? 'Creating account...' : 'Create account'}
                        {!processing && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>

                    {/* Login link */}
                    <p className="text-center text-sm text-zinc-400">
                        Already have an account?{' '}
                        <Link
                            href="/login"
                            className="font-medium text-emerald-400 hover:text-emerald-300"
                        >
                            Sign in
                        </Link>
                    </p>
                </form>
            </AuthLayout>
        </>
    );
}
