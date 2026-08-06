import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CheckCircle2,
    Clock,
    Inbox,
    LogOut,
    MailX,
    RefreshCw,
    Shield,
    Sparkles,
    User,
    UserCheck,
    XCircle,
} from 'lucide-react';
import { useState } from 'react';

interface Invitation {
    id: number;
    token: string;
    organization: {
        id: number;
        name: string;
        slug: string;
    };
    invited_by: {
        name: string;
        email: string;
    } | null;
    role: string;
    department: {
        id: number;
        name: string;
    } | null;
    created_at?: string;
    expires_at?: string;
}

interface InvitationsProps {
    invitations: Invitation[];
    has_organization: boolean;
    user: {
        name: string;
        email: string;
    };
}

export default function Invitations({
    invitations = [],
    has_organization = false,
    user,
}: InvitationsProps) {
    const page = usePage<{
        auth?: { user?: { name: string; email: string } };
        flash?: { success?: string; info?: string; error?: string; status?: string };
    }>();
    const flash = page.props.flash;
    const currentUser = user || page.props.auth?.user || { name: 'Employee', email: '' };

    const [processingId, setProcessingId] = useState<number | null>(null);
    const [actionType, setActionType] = useState<'accept' | 'reject' | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleAccept = (invitationId: number) => {
        setProcessingId(invitationId);
        setActionType('accept');
        router.post(
            `/portal/invitations/${invitationId}/accept`,
            {},
            {
                onFinish: () => {
                    setProcessingId(null);
                    setActionType(null);
                },
            }
        );
    };

    const handleReject = (invitationId: number) => {
        if (!confirm('Are you sure you want to decline this organization invitation?')) {
            return;
        }

        setProcessingId(invitationId);
        setActionType('reject');
        router.post(
            `/portal/invitations/${invitationId}/reject`,
            {},
            {
                onFinish: () => {
                    setProcessingId(null);
                    setActionType(null);
                },
            }
        );
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        router.reload({
            onFinish: () => setIsRefreshing(false),
        });
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role.toLowerCase()) {
            case 'owner':
            case 'admin':
                return 'border-purple-500/30 bg-purple-500/10 text-purple-300';
            case 'manager':
                return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
            default:
                return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
        }
    };

    return (
        <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950 flex flex-col justify-between">
            <Head title="Organization Invitations - ReceiptSnap" />

            {/* Navigation Header */}
            <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <Logo className="h-8 w-auto text-emerald-400" />
                        <span className="hidden text-xs font-semibold uppercase tracking-wider text-zinc-500 sm:inline">
                            | Portal Access
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {has_organization && (
                            <a
                                href="/dashboard"
                                className="hidden items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white sm:flex"
                            >
                                Back to Portal
                                <ArrowRight className="h-3.5 w-3.5" />
                            </a>
                        )}

                        <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 py-1 pl-2 pr-3 text-xs text-zinc-300">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 font-semibold text-emerald-400 text-[11px]">
                                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span className="font-medium text-zinc-200">{currentUser?.name}</span>
                        </div>

                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition-colors hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Body */}
            <main className="mx-auto my-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Flash Messages */}
                {flash?.success && (
                    <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 shadow-lg shadow-emerald-950/30 animate-in fade-in">
                        <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                {flash?.info && (
                    <div className="mb-6 flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-300 shadow-lg shadow-blue-950/30 animate-in fade-in">
                        <Inbox className="h-4 w-4 text-blue-400 shrink-0" />
                        <span>{flash.info}</span>
                    </div>
                )}

                {/* Return Banner if user already has an org */}
                {has_organization && (
                    <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-zinc-900/60 p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-100">
                                    You already belong to an active organization
                                </p>
                                <p className="text-xs text-zinc-400">
                                    You can return to your main expense dashboard or accept additional invitations below.
                                </p>
                            </div>
                        </div>
                        <a
                            href="/dashboard"
                            className="inline-flex items-center gap-2 shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 active:scale-[0.98]"
                        >
                            Open Dashboard
                            <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                    </div>
                )}

                {/* Invites Container */}
                {invitations.length > 0 ? (
                    <div className="space-y-6">
                        {/* Title Section */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 mb-2">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>{invitations.length} Pending {invitations.length === 1 ? 'Invitation' : 'Invitations'}</span>
                                </div>
                                <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">
                                    Organization Invitations
                                </h1>
                                <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                                    Your email address <span className="font-semibold text-emerald-300">{currentUser?.email}</span> has received access requests to join the following workspace(s).
                                </p>
                            </div>

                            <Button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                variant="outline"
                                className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white shrink-0 self-start sm:self-auto text-xs"
                            >
                                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        {/* List of Invitation Cards */}
                        <div className="grid gap-5">
                            {invitations.map((inv) => {
                                const isBusy = processingId === inv.id;
                                return (
                                    <div
                                        key={inv.id}
                                        className="relative group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-zinc-700/80 hover:shadow-2xl hover:shadow-emerald-950/20"
                                    >
                                        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                                            {/* Organization Details */}
                                            <div className="flex items-start gap-4">
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 via-zinc-900 to-zinc-950 font-bold text-emerald-400 text-xl shadow-inner">
                                                    {inv.organization.name.charAt(0).toUpperCase()}
                                                </div>

                                                <div className="space-y-1.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-lg font-bold text-zinc-100">
                                                            {inv.organization.name}
                                                        </h3>

                                                        <span
                                                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${getRoleBadgeColor(inv.role)}`}
                                                        >
                                                            <Shield className="h-3 w-3" />
                                                            {inv.role}
                                                        </span>

                                                        {inv.department && (
                                                            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                                                                <Building2 className="h-3 w-3 text-zinc-400" />
                                                                {inv.department.name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                                                        <UserCheck className="h-3.5 w-3.5 text-zinc-500" />
                                                        Invited by{' '}
                                                        <span className="text-zinc-200 font-medium">
                                                            {inv.invited_by?.name || 'Organization Admin'}
                                                        </span>
                                                        {inv.invited_by?.email && (
                                                            <span className="text-zinc-500">
                                                                ({inv.invited_by.email})
                                                            </span>
                                                        )}
                                                    </p>

                                                    {inv.expires_at && (
                                                        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                                                            <Clock className="h-3 w-3 text-amber-400/80" />
                                                            Expires {inv.expires_at}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center gap-3 pt-2 sm:pt-0 shrink-0">
                                                <Button
                                                    onClick={() => handleReject(inv.id)}
                                                    disabled={isBusy}
                                                    variant="outline"
                                                    className="border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-xs font-semibold px-4 py-2"
                                                >
                                                    {isBusy && actionType === 'reject' ? (
                                                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <XCircle className="mr-1.5 h-4 w-4 text-rose-400" />
                                                    )}
                                                    Decline
                                                </Button>

                                                <Button
                                                    onClick={() => handleAccept(inv.id)}
                                                    disabled={isBusy}
                                                    className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs px-5 py-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                                                >
                                                    {isBusy && actionType === 'accept' ? (
                                                        <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="mr-1.5 h-4 w-4 stroke-[2.5]" />
                                                    )}
                                                    Accept Invite
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    /* Zero Invitations Empty State */
                    <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 via-zinc-900/50 to-zinc-950 p-8 sm:p-12 text-center shadow-2xl backdrop-blur-2xl">
                        {/* Radial ambient glow */}
                        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

                        {/* Centered Icon Badge */}
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-900/80 shadow-inner">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                <MailX className="h-7 w-7" />
                            </div>
                        </div>

                        {/* Main Title & Message */}
                        <h2 className="text-2xl font-black tracking-tight text-zinc-100 sm:text-3xl">
                            No Organization Invitations Found
                        </h2>

                        <p className="mx-auto mt-3 max-w-lg text-sm text-zinc-400 leading-relaxed">
                            Your account <span className="font-semibold text-emerald-300">{currentUser?.email}</span> is logged in, but you haven't received an active invitation to join any organization workspace yet.
                        </p>

                        {/* Guidance Box */}
                        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 text-left space-y-2.5">
                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                                What should I do next?
                            </p>

                            <ul className="text-xs text-zinc-400 space-y-2 leading-relaxed">
                                <li className="flex items-start gap-2">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-[10px] text-emerald-400">1</span>
                                    <span>Contact your organization administrator or manager.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-[10px] text-emerald-400">2</span>
                                    <span>Ask them to send an invitation to <strong className="text-zinc-300">{currentUser?.email}</strong>.</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold text-[10px] text-emerald-400">3</span>
                                    <span>Once sent, click the <strong>Refresh</strong> button below to check again.</span>
                                </li>
                            </ul>
                        </div>

                        {/* Interactive Buttons */}
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <Button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs px-5 py-2.5 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all"
                            >
                                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Check for Invitations
                            </Button>

                            <Button
                                onClick={handleLogout}
                                variant="outline"
                                className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white text-xs px-4 py-2.5"
                            >
                                <LogOut className="mr-2 h-3.5 w-3.5 text-zinc-400" />
                                Sign Out / Switch Account
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
                <div className="mx-auto max-w-6xl px-4">
                    <p>© {new Date().getFullYear()} ReceiptSnap Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
