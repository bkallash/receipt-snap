import React from 'react';
import PortalNavbar from '@/components/portal/PortalNavbar';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    CheckSquare,
    Users,
    Building2,
    Tags,
    Mail,
    Settings as SettingsIcon,
    ShieldCheck,
} from 'lucide-react';

interface AdminLayoutProps {
    children: React.ReactNode;
    title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
    const { url } = usePage();

    const tabs = [
        { name: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard, ready: true },
        { name: 'Approvals', href: '/admin/approvals', icon: CheckSquare, ready: true },
        { name: 'Members', href: '/admin/members', icon: Users, ready: true },
        { name: 'Invitations', href: '/admin/invitations', icon: Mail, ready: true },
        { name: 'Departments', href: '/admin/departments', icon: Building2, ready: true },
        { name: 'Categories', href: '/admin/categories', icon: Tags, ready: true },
        { name: 'Settings', href: '/admin/settings', icon: SettingsIcon, ready: true },
    ];

    return (
        <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500 selection:text-zinc-950">
            <Head title={`${title} - ReceiptSnap Admin`} />

            <PortalNavbar />

            {/* Sub-header: role context + admin section navigation */}
            <div className="border-b border-zinc-800/80 bg-zinc-900/40">
                <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center space-x-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Organization Administration
                        </span>
                        <span className="text-zinc-400 hidden sm:inline text-[11px]">
                            Members • Departments • Budgets • Policies
                        </span>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const active = url.split('?')[0] === tab.href;

                            if (!tab.ready) {
                                return (
                                    <span
                                        key={tab.name}
                                        title="Coming soon"
                                        aria-disabled="true"
                                        className="flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-600 cursor-not-allowed"
                                    >
                                        <Icon className="w-3.5 h-3.5 shrink-0" />
                                        <span>{tab.name}</span>
                                    </span>
                                );
                            }

                            return (
                                <Link
                                    key={tab.name}
                                    href={tab.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                                        active
                                            ? 'bg-zinc-800 text-indigo-300 border border-indigo-500/20 shadow-sm'
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

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
                {children}
            </main>
        </div>
    );
}
