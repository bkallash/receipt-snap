import Logo from '@/components/Logo';
import { Link } from '@inertiajs/react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
}

export default function AuthLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="flex min-h-[100dvh]">
            {/* Left panel — branding */}
            <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-zinc-900 p-10 lg:flex">
                {/* Background decoration */}
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-emerald-600/8 blur-3xl" />
                    <div className="absolute -top-20 right-0 h-72 w-72 rounded-full bg-emerald-400/5 blur-3xl" />
                    {/* Grid pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage:
                                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                            backgroundSize: '64px 64px',
                        }}
                    />
                </div>

                {/* Logo */}
                <Link href="/" className="relative">
                    <Logo size="md" variant="dark" />
                </Link>

                {/* Tagline */}
                <div className="relative">
                    <blockquote className="max-w-md">
                        <p className="text-2xl font-semibold leading-snug text-zinc-200">
                            Expense management that works as fast as your team does.
                        </p>
                        <footer className="mt-4 text-sm text-zinc-500">
                            AI-powered receipt scanning, automated policy enforcement, and real-time budget tracking.
                        </footer>
                    </blockquote>
                </div>

                {/* Footer line */}
                <p className="relative text-xs text-zinc-600">
                    &copy; {new Date().getFullYear()} ReceiptSnap
                </p>
            </div>

            {/* Right panel — form */}
            <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
                {/* Mobile logo */}
                <div className="mb-8 lg:hidden">
                    <Link href="/">
                        <Logo size="md" variant="dark" />
                    </Link>
                </div>

                <div className="mx-auto w-full max-w-md">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-2 text-sm text-zinc-400">{description}</p>
                    )}

                    <div className="mt-8">{children}</div>
                </div>
            </div>
        </div>
    );
}
