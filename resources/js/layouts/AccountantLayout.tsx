import React from 'react';
import PortalNavbar from '@/components/portal/PortalNavbar';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    CreditCard,
    FileCheck2,
    BookOpenCheck,
    BarChart3,
    ShieldAlert,
    Search,
    ShieldCheck,
    Lock
} from 'lucide-react';

interface AccountantLayoutProps {
    children: React.ReactNode;
    title: string;
}

export default function AccountantLayout({ children, title }: AccountantLayoutProps) {
    const { url } = usePage();

    const tabs = [
        {
            name: 'Cockpit',
            href: '/accountant/dashboard',
            icon: LayoutDashboard,
            active: url === '/accountant/dashboard'
        },
        {
            name: 'Reimbursements & Batches',
            href: '/accountant/reimbursements',
            icon: CreditCard,
            active: url === '/accountant/reimbursements'
        },
        {
            name: 'Tax Ledger',
            href: '/accountant/approved-expenses',
            icon: FileCheck2,
            active: url === '/accountant/approved-expenses'
        },
        {
            name: 'GL Taxonomy',
            href: '/accountant/gl-categories',
            icon: BookOpenCheck,
            active: url === '/accountant/gl-categories'
        },
        {
            name: 'Analytics',
            href: '/accountant/analytics',
            icon: BarChart3,
            active: url === '/accountant/analytics'
        },
        {
            name: 'Audit Logs',
            href: '/accountant/audit-logs',
            icon: ShieldAlert,
            active: url === '/accountant/audit-logs'
        },
        {
            name: 'All Expenses Lookup',
            href: '/accountant/expenses',
            icon: Search,
            active: url === '/accountant/expenses'
        }
    ];

    return (
        <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
            <Head title={`${title} - ReceiptSnap Finance`} />

            {/* Shared Top Portal Navigation */}
            <PortalNavbar />

            {/* Sub-Header Section with Sub-Navigation Tabs & SoD Badge */}
            <div className="border-b border-zinc-800/80 bg-zinc-900/40">
                <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Accountant Financial Control
                        </span>
                        <span className="text-zinc-400 hidden sm:inline text-[11px]">
                            Broad Read • ACH Payouts • GL Auditing • Immutable Compliance
                        </span>
                    </div>

                    {/* Accountant Sub-Navigation Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <Link
                                    key={tab.name}
                                    href={tab.href}
                                    className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                        tab.active
                                            ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                            : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                    }`}
                                >
                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                    <span>{tab.name}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Container matching Employee & Manager Portals */}
            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {children}
            </main>
        </div>
    );
}
