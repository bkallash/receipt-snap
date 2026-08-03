import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Link, router, usePage } from '@inertiajs/react';
import {
    Building2,
    CheckSquare,
    LogOut,
    Plus,
    Receipt,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';

interface PortalNavbarProps {
    onNewReceiptClick?: () => void;
    activeTab?: 'team_approvals' | 'my_expenses';
    onTabChange?: (tab: 'team_approvals' | 'my_expenses') => void;
}

export default function PortalNavbar({
    onNewReceiptClick,
    activeTab,
    onTabChange,
}: PortalNavbarProps) {
    const page = usePage<{
        auth?: { user?: { name: string; email: string } };
        organization?: { name: string; slug: string } | null;
        userRole?: string | null;
    }>();

    const user = page.props.auth?.user;
    const organization = page.props.organization;
    const userRole = page.props.userRole;
    const currentUrl = page.url || '';
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const isManagerOrAdmin =
        userRole === 'manager' ||
        userRole === 'admin' ||
        userRole === 'owner' ||
        currentUrl.startsWith('/portal/manager');

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6 lg:px-8">
                {/* Brand & Organization context */}
                <div className="flex items-center gap-2 sm:gap-6 min-w-0">
                    <Link href="/portal/expenses" className="flex items-center shrink-0">
                        <Logo className="h-7 w-auto sm:h-8 text-emerald-400" />
                    </Link>

                    {organization && (
                        <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300 md:flex shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="font-medium text-zinc-200 truncate max-w-[140px]">
                                {organization.name}
                            </span>
                        </div>
                    )}

                    {/* Nav Links - Scrollable on small screens */}
                    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 min-w-0">
                        {isManagerOrAdmin ? (
                            <>
                                {onTabChange ? (
                                    <button
                                        onClick={() => onTabChange('team_approvals')}
                                        className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                            (activeTab ? activeTab === 'team_approvals' : currentUrl.startsWith('/portal/manager'))
                                                ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                        }`}
                                    >
                                        <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                                        <span>Approvals</span>
                                    </button>
                                ) : (
                                    <Link
                                        href="/portal/manager/expenses"
                                        className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                            currentUrl.startsWith('/portal/manager')
                                                ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                        }`}
                                    >
                                        <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                                        <span>Approvals</span>
                                    </Link>
                                )}

                                {onTabChange ? (
                                    <button
                                        onClick={() => onTabChange('my_expenses')}
                                        className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                            activeTab === 'my_expenses'
                                                ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                        }`}
                                    >
                                        <Receipt className="h-3.5 w-3.5 shrink-0" />
                                        <span>My Expenses</span>
                                    </button>
                                ) : (
                                    <Link
                                        href="/portal/expenses"
                                        className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                            currentUrl === '/portal/expenses'
                                                ? 'bg-zinc-800 text-white'
                                                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                        }`}
                                    >
                                        <Receipt className="h-3.5 w-3.5 shrink-0" />
                                        <span>My Expenses</span>
                                    </Link>
                                )}
                            </>
                        ) : (
                            <Link
                                href="/portal/expenses"
                                className={`flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                    currentUrl === '/portal/expenses'
                                        ? 'bg-zinc-800 text-white'
                                        : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                                }`}
                            >
                                <Receipt className="h-3.5 w-3.5 shrink-0" />
                                <span>My Expenses</span>
                            </Link>
                        )}
                    </nav>
                </div>

                {/* Primary Actions & User Profile */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {(onNewReceiptClick || !isManagerOrAdmin) && (
                        <Button
                            onClick={() => {
                                if (onNewReceiptClick) {
                                    onNewReceiptClick();
                                } else {
                                    router.visit('/portal/expenses');
                                }
                            }}
                            className="bg-emerald-500 h-7 w-7 p-0 sm:h-8.5 sm:w-auto sm:px-3 font-medium text-zinc-950 shadow-sm shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.95] text-xs rounded-full sm:rounded-xl flex items-center justify-center shrink-0"
                            title="Upload Receipt"
                        >
                            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 stroke-[2.5]" />
                            <span className="hidden sm:inline ml-1 font-semibold">Upload Receipt</span>
                        </Button>
                    )}

                    {/* User dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900 p-1 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 font-semibold text-emerald-400">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="hidden pr-2 text-xs font-medium lg:inline">
                                {user?.name || 'User'}
                            </span>
                        </button>

                        {userMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 shadow-2xl shadow-black/80">
                                <div className="border-b border-zinc-800 px-3 py-2">
                                    <p className="text-xs font-medium text-zinc-200">
                                        {user?.name}
                                    </p>
                                    <p className="truncate text-[11px] text-zinc-500">
                                        {user?.email}
                                    </p>
                                </div>
                                <div className="pt-1">
                                    <button
                                        onClick={handleLogout}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                                    >
                                        <LogOut className="h-3.5 w-3.5" />
                                        Sign out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
