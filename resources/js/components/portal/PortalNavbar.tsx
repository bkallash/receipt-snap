import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';
import {
    Building2,
    FileText,
    LogOut,
    Plus,
    Receipt,
    User as UserIcon,
} from 'lucide-react';
import { useState } from 'react';

interface PortalNavbarProps {
    onNewReceiptClick: () => void;
}

export default function PortalNavbar({ onNewReceiptClick }: PortalNavbarProps) {
    const page = usePage<{
        auth?: { user?: { name: string; email: string } };
        organization?: { name: string; slug: string } | null;
    }>();

    const user = page.props.auth?.user;
    const organization = page.props.organization;
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
                {/* Brand & Organization context */}
                <div className="flex items-center gap-6">
                    <a href="/portal/expenses" className="flex items-center">
                        <Logo className="h-8 w-auto text-emerald-400" />
                    </a>

                    {organization && (
                        <div className="hidden items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-300 sm:flex">
                            <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span className="font-medium text-zinc-200">
                                {organization.name}
                            </span>
                        </div>
                    )}
                </div>

                {/* Primary Actions & User Profile */}
                <div className="flex items-center gap-3">
                    <Button
                        onClick={onNewReceiptClick}
                        className="bg-emerald-500 font-medium text-zinc-950 shadow-sm shadow-emerald-500/20 hover:bg-emerald-400 active:scale-[0.98]"
                    >
                        <Plus className="mr-1.5 h-4 w-4 stroke-[2.5]" />
                        Upload Receipt
                    </Button>

                    {/* User dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 p-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white"
                        >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 font-semibold text-emerald-400">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="hidden pr-2 text-xs font-medium sm:inline">
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
                                    <a
                                        href="/settings/profile"
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                                    >
                                        <UserIcon className="h-3.5 w-3.5 text-zinc-400" />
                                        Profile Settings
                                    </a>
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
