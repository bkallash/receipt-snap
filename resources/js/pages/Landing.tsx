import Logo from '@/components/Logo';
import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    ScanLine,
    Shield,
    BarChart3,
    ArrowRight,
    Upload,
    FileCheck,
    CheckCircle2,
    Receipt,
    Zap,
    Users,
    ChevronRight,
} from 'lucide-react';
import { motion } from 'motion/react';

/* ─── Fade-in helper ──────────────────────────────── */
function FadeIn({
    children,
    delay = 0,
    className = '',
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ─── Navigation ──────────────────────────────────── */
function Nav() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
            <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
                <Link href="/">
                    <Logo size="md" variant="dark" />
                </Link>

                <div className="hidden items-center gap-8 md:flex">
                    <a href="#features" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">
                        Features
                    </a>
                    <a href="#how-it-works" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">
                        How it works
                    </a>
                    <a href="#testimonials" className="text-sm text-zinc-400 transition-colors hover:text-zinc-100">
                        Testimonials
                    </a>
                </div>

                <div className="flex items-center gap-3">
                    <Link href="/login">
                        <Button variant="ghost" size="sm">
                            Sign in
                        </Button>
                    </Link>
                    <Link href="/register">
                        <Button size="sm">
                            Get started
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}

/* ─── Hero ────────────────────────────────────────── */
function Hero() {
    return (
        <section className="relative pt-16">
            {/* Subtle gradient glow */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-600/8 blur-3xl" />
                <div className="absolute -top-20 right-1/3 h-72 w-72 rounded-full bg-emerald-400/5 blur-3xl" />
            </div>

            <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-20 pb-16 lg:grid-cols-2 lg:pt-24 lg:pb-20">
                {/* Left — copy */}
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <Badge className="mb-5">
                        <Zap className="mr-1 h-3 w-3" />
                        AI-powered expense tracking
                    </Badge>

                    <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-zinc-50 md:text-5xl lg:text-6xl">
                        Stop losing receipts.
                        <br />
                        <span className="text-emerald-400">Start tracking expenses.</span>
                    </h1>

                    <p className="mt-5 max-w-lg text-lg leading-relaxed text-zinc-400">
                        Snap a photo, and our AI extracts every detail. Automated policies catch issues before they cost you.
                    </p>

                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link href="/register">
                            <Button size="lg">
                                Get started free
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <a href="#how-it-works">
                            <Button variant="secondary" size="lg">
                                See how it works
                            </Button>
                        </a>
                    </div>
                </motion.div>

                {/* Right — product mockup */}
                <motion.div
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                >
                    <div className="overflow-hidden rounded-xl border border-zinc-800 shadow-2xl shadow-black/40">
                        <img
                            src="/images/hero-dashboard.png"
                            alt="ReceiptSnap dashboard showing expense tracking with real-time status updates"
                            className="w-full"
                            loading="eager"
                        />
                    </div>
                    {/* Floating card accent */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute -bottom-4 -left-4 rounded-lg border border-zinc-700 bg-zinc-900/90 px-4 py-3 shadow-xl backdrop-blur-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/20">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-zinc-100">Expense approved</p>
                                <p className="text-xs text-zinc-500">$142.50 at Whole Foods</p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

/* ─── Trusted By ──────────────────────────────────── */
function TrustedBy() {
    const logos = [
        { name: 'Stripe', slug: 'stripe' },
        { name: 'Shopify', slug: 'shopify' },
        { name: 'Notion', slug: 'notion' },
        { name: 'Linear', slug: 'linear' },
        { name: 'Vercel', slug: 'vercel' },
        { name: 'Figma', slug: 'figma' },
    ];

    return (
        <section className="border-t border-zinc-800/60 py-12">
            <div className="mx-auto max-w-6xl px-6">
                <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Trusted by teams at
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
                    {logos.map((logo) => (
                        <img
                            key={logo.slug}
                            src={`https://cdn.simpleicons.org/${logo.slug}/71717a`}
                            alt={logo.name}
                            className="h-6 opacity-60 transition-opacity hover:opacity-100"
                            loading="lazy"
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── Features (Bento Grid) ───────────────────────── */
function Features() {
    return (
        <section id="features" className="py-20">
            <div className="mx-auto max-w-6xl px-6">
                <FadeIn>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
                        Everything you need to manage expenses
                    </h2>
                    <p className="mt-3 max-w-xl text-zinc-400">
                        From receipt capture to policy enforcement, ReceiptSnap handles the full expense lifecycle.
                    </p>
                </FadeIn>

                <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Feature 1 — large card with image */}
                    <FadeIn delay={0.06} className="md:col-span-2 lg:col-span-2">
                        <div className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-zinc-700">
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                                <div className="flex-1">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15">
                                        <ScanLine className="h-5 w-5 text-emerald-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-zinc-100">
                                        AI receipt scanning
                                    </h3>
                                    <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
                                        Photograph any receipt and our AI extracts merchant, date, line items, tax, and totals in seconds. No manual data entry.
                                    </p>
                                </div>
                                <div className="flex-1 overflow-hidden rounded-lg border border-zinc-800">
                                    <img
                                        src="/images/feature-receipt-scan.png"
                                        alt="AI extracting structured data from a photographed receipt"
                                        className="w-full transition-transform duration-500 group-hover:scale-[1.02]"
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Feature 2 */}
                    <FadeIn delay={0.12}>
                        <div className="group flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-zinc-700">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15">
                                <Shield className="h-5 w-5 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-100">
                                Automated policy engine
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                                Flag missing receipts, weekend transactions, budget overruns, and duplicate submissions automatically before approval.
                            </p>
                            {/* Visual: policy flags */}
                            <div className="mt-auto pt-5">
                                <div className="space-y-2">
                                    {[
                                        { label: 'Missing receipt', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
                                        { label: 'Budget exceeded', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
                                        { label: 'Duplicate detected', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
                                    ].map((flag) => (
                                        <div
                                            key={flag.label}
                                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${flag.color} mr-2`}
                                        >
                                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                            {flag.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </FadeIn>

                    {/* Feature 3 */}
                    <FadeIn delay={0.12}>
                        <div className="group flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-zinc-700">
                            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15">
                                <BarChart3 className="h-5 w-5 text-emerald-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-100">
                                Real-time budgets
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                                Track spending by department and category. Get alerts before budgets are breached, not after.
                            </p>
                            {/* Visual: mini budget bars */}
                            <div className="mt-auto space-y-3 pt-5">
                                {[
                                    { label: 'Engineering', pct: 72, color: 'bg-emerald-500' },
                                    { label: 'Marketing', pct: 89, color: 'bg-amber-500' },
                                    { label: 'Operations', pct: 45, color: 'bg-emerald-500' },
                                ].map((bar) => (
                                    <div key={bar.label}>
                                        <div className="mb-1 flex items-center justify-between text-xs">
                                            <span className="text-zinc-400">{bar.label}</span>
                                            <span className="font-mono text-zinc-500">{bar.pct}%</span>
                                        </div>
                                        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                                            <motion.div
                                                className={`h-full rounded-full ${bar.color}`}
                                                initial={{ width: 0 }}
                                                whileInView={{ width: `${bar.pct}%` }}
                                                viewport={{ once: true }}
                                                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </FadeIn>

                    {/* Feature 4 */}
                    <FadeIn delay={0.18} className="md:col-span-2">
                        <div className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 transition-colors hover:border-zinc-700 md:flex-row md:items-center md:gap-8">
                            <div className="flex-1">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/15">
                                    <Users className="h-5 w-5 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-100">
                                    Team collaboration
                                </h3>
                                <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                                    Multi-tenant organizations with role-based access. Invite team members, assign departments, and set approval workflows.
                                </p>
                            </div>
                            <div className="mt-4 flex items-center gap-3 md:mt-0">
                                {/* Avatar stack */}
                                <div className="flex -space-x-2">
                                    {['A', 'B', 'C', 'D'].map((letter, i) => (
                                        <div
                                            key={letter}
                                            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-900 text-xs font-medium"
                                            style={{
                                                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][i],
                                                zIndex: 4 - i,
                                            }}
                                        >
                                            {letter}
                                        </div>
                                    ))}
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-800 text-xs font-medium text-zinc-400">
                                        +8
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </div>
        </section>
    );
}

/* ─── How It Works ────────────────────────────────── */
function HowItWorks() {
    const steps = [
        {
            icon: Upload,
            title: 'Snap a receipt',
            desc: 'Take a photo or upload an image. Our AI processes it in seconds.',
        },
        {
            icon: FileCheck,
            title: 'Review and submit',
            desc: 'Verify extracted data, assign a category, and submit for approval.',
        },
        {
            icon: CheckCircle2,
            title: 'Approve and track',
            desc: 'Managers review with full context. Budgets update in real time.',
        },
    ];

    return (
        <section id="how-it-works" className="border-t border-zinc-800/60 py-20">
            <div className="mx-auto max-w-6xl px-6">
                <FadeIn>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
                        Three steps to better expense management
                    </h2>
                </FadeIn>

                <div className="relative mt-14 grid gap-8 md:grid-cols-3">
                    {/* Connection line */}
                    <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent md:block" />

                    {steps.map((step, i) => (
                        <FadeIn key={step.title} delay={i * 0.1}>
                            <div className="relative text-center md:text-left">
                                <div className="relative z-10 mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg md:mx-0">
                                    <step.icon className="h-6 w-6 text-emerald-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-zinc-100">
                                    {step.title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                                    {step.desc}
                                </p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── Testimonials ────────────────────────────────── */
function Testimonials() {
    const quotes = [
        {
            body: 'ReceiptSnap cut our expense processing time by 70%. The AI scanning is surprisingly accurate, even with crumpled receipts.',
            name: 'Sarah Chen',
            role: 'VP of Finance, Meridian Labs',
        },
        {
            body: "We used to chase receipts for weeks. Now our team submits expenses in under a minute. The policy engine catches issues we'd miss manually.",
            name: 'James Alvarez',
            role: 'Operations Director, Basecamp Collective',
        },
    ];

    return (
        <section id="testimonials" className="py-20">
            <div className="mx-auto max-w-6xl px-6">
                <FadeIn>
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
                        What teams are saying
                    </h2>
                </FadeIn>

                <div className="mt-12 grid gap-6 md:grid-cols-2">
                    {quotes.map((q, i) => (
                        <FadeIn key={q.name} delay={i * 0.08}>
                            <blockquote className="flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
                                <p className="flex-1 text-base leading-relaxed text-zinc-300">
                                    \u201C{q.body}\u201D
                                </p>
                                <footer className="mt-5 flex items-center gap-3 border-t border-zinc-800 pt-4">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/20 text-sm font-semibold text-emerald-400">
                                        {q.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-200">{q.name}</p>
                                        <p className="text-xs text-zinc-500">{q.role}</p>
                                    </div>
                                </footer>
                            </blockquote>
                        </FadeIn>
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ─── CTA ─────────────────────────────────────────── */
function Cta() {
    return (
        <section className="border-t border-zinc-800/60 py-20">
            <div className="mx-auto max-w-6xl px-6">
                <FadeIn>
                    <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/30 px-8 py-16 text-center">
                        {/* Subtle glow */}
                        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />

                        <h2 className="relative text-3xl font-bold tracking-tight text-zinc-50 md:text-4xl">
                            Ready to simplify expense management?
                        </h2>
                        <p className="relative mx-auto mt-4 max-w-md text-zinc-400">
                            Free for teams up to 5. No credit card required.
                        </p>
                        <div className="relative mt-8">
                            <Link href="/register">
                                <Button size="lg">
                                    Get started free
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                </FadeIn>
            </div>
        </section>
    );
}

/* ─── Footer ──────────────────────────────────────── */
function Footer() {
    return (
        <footer className="border-t border-zinc-800/60 py-10">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
                <Link href="/">
                    <Logo size="sm" variant="dark" />
                </Link>

                <div className="flex gap-8">
                    <a href="#features" className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">Features</a>
                    <a href="#how-it-works" className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">How it works</a>
                    <a href="#testimonials" className="text-xs text-zinc-500 transition-colors hover:text-zinc-300">Testimonials</a>
                </div>

                <p className="text-xs text-zinc-600">
                    &copy; {new Date().getFullYear()} ReceiptSnap. All rights reserved.
                </p>
            </div>
        </footer>
    );
}

/* ─── Page ────────────────────────────────────────── */
export default function Landing() {
    return (
        <>
            <Head title="AI-Powered Expense Tracking" />
            <Nav />
            <main>
                <Hero />
                <TrustedBy />
                <Features />
                <HowItWorks />
                <Testimonials />
                <Cta />
            </main>
            <Footer />
        </>
    );
}
