import React, { useState, FormEvent } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/portal/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Mail,
    RefreshCw,
    Send,
    Trash2,
    UserPlus,
    XCircle,
} from 'lucide-react';

interface Department {
    id: number;
    name: string;
}

interface Role {
    value: string;
    label: string;
}

interface Invitation {
    id: number;
    email: string;
    role: string;
    status: string;
    department_name: string | null;
    invited_by: string | null;
    created_at: string | null;
    expires_at: string | null;
    days_until_expiry: number | null;
}

interface InvitationsProps {
    pending: Invitation[];
    history: Invitation[];
    departments: Department[];
    roles: Role[];
    memberEmails: string[];
    organization: { id: number; name: string; slug: string };
    administeredOrganizations: Array<{ id: number; name: string; slug: string; role: string | null }>;
}

export default function Invitations({
    pending,
    history,
    departments,
    roles,
    organization,
    administeredOrganizations,
}: InvitationsProps) {
    const page = usePage<{ flash?: { success?: string; error?: string }; errors: Record<string, string> }>();
    const flash = page.props.flash;
    const errors = page.props.errors;

    const [emails, setEmails] = useState('');
    const [role, setRole] = useState(roles[0]?.value ?? 'employee');
    const [departmentId, setDepartmentId] = useState<number | null>(null);
    const [expiresInDays, setExpiresInDays] = useState(14);
    const [processing, setProcessing] = useState(false);

    const formatDate = (iso: string | null) =>
        iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    const roleColor = (r: string) => {
        switch (r) {
            case 'admin':
                return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
            case 'manager':
                return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'accountant':
                return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            default:
                return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'accepted':
                return { cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2, label: 'Accepted' };
            case 'rejected':
                return { cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: XCircle, label: 'Rejected' };
            case 'revoked':
                return { cls: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', icon: XCircle, label: 'Revoked' };
            case 'expired':
                return { cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock, label: 'Expired' };
            default:
                return { cls: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', icon: Clock, label: status };
        }
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        router.post(
            '/admin/invitations',
            { emails, role, department_id: departmentId, expires_in_days: expiresInDays },
            {
                preserveScroll: true,
                onSuccess: () => setEmails(''),
                onFinish: () => setProcessing(false),
            }
        );
    };

    const resend = (invitation: Invitation) => {
        setProcessing(true);
        router.post(`/admin/invitations/${invitation.id}/resend`, {}, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const revoke = (invitation: Invitation) => {
        if (!confirm(`Revoke the invitation to ${invitation.email}?`)) return;
        setProcessing(true);
        router.delete(`/admin/invitations/${invitation.id}`, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <AdminLayout title="Invitations">
            <AdminPageHeader
                organization={organization}
                administeredOrganizations={administeredOrganizations}
                title="Invitations"
                subtitle="Invite people to the organization and track pending and past invitations."
            />

            {flash?.success && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{flash.success}</span>
                </div>
            )}
            {flash?.error && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300 animate-in fade-in">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{flash.error}</span>
                </div>
            )}

            {/* Invite form */}
            <Card className="border-zinc-800 bg-zinc-900/60">
                <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <UserPlus className="h-4 w-4 text-indigo-400" />
                        <h2 className="text-sm font-bold text-zinc-200">Invite new members</h2>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div>
                            <label htmlFor="emails" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                Email addresses
                            </label>
                            <textarea
                                id="emails"
                                value={emails}
                                onChange={(e) => setEmails(e.target.value)}
                                disabled={processing}
                                rows={3}
                                placeholder="jane@company.com, john@company.com&#10;Separate with commas, spaces, or new lines"
                                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {errors.emails && <p className="mt-1 text-xs text-rose-400">{errors.emails}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="role" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Role
                                </label>
                                <select
                                    id="role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    disabled={processing}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    {roles.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.role && <p className="mt-1 text-xs text-rose-400">{errors.role}</p>}
                            </div>

                            <div>
                                <label htmlFor="department" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Department <span className="text-zinc-600">(optional)</span>
                                </label>
                                <select
                                    id="department"
                                    value={departmentId ?? ''}
                                    onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : null)}
                                    disabled={processing}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value="">No department</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="expires_in_days" className="block text-xs font-medium text-zinc-400 mb-1.5">
                                    Expires in
                                </label>
                                <select
                                    id="expires_in_days"
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                    disabled={processing}
                                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                >
                                    <option value={7}>7 days</option>
                                    <option value={14}>14 days</option>
                                    <option value={30}>30 days</option>
                                    <option value={60}>60 days</option>
                                    <option value={90}>90 days</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={processing || !emails.trim()}
                                className="h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-zinc-950 text-sm font-semibold gap-1.5"
                            >
                                <Send className="h-3.5 w-3.5" />
                                Send invitations
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Pending invitations */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="border-b border-zinc-800 px-5 py-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-zinc-200">Pending invitations ({pending.length})</h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th className="px-5 py-3">Email</th>
                                <th className="px-5 py-3">Role</th>
                                <th className="px-5 py-3">Department</th>
                                <th className="px-5 py-3">Invited by</th>
                                <th className="px-5 py-3">Expires</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {pending.map((inv) => (
                                <tr key={inv.id} className="hover:bg-zinc-800/40 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                            <span className="font-medium text-zinc-200">{inv.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${roleColor(inv.role)}`}>
                                            {inv.role}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs text-zinc-300">
                                            {inv.department_name || <span className="text-zinc-600">—</span>}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs text-zinc-400">{inv.invited_by || '—'}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs text-zinc-400">
                                            {formatDate(inv.expires_at)}
                                            {inv.days_until_expiry !== null && (
                                                <span className={`ml-1.5 ${inv.days_until_expiry <= 3 ? 'text-amber-400' : 'text-zinc-600'}`}>
                                                    ({inv.days_until_expiry}d left)
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => resend(inv)}
                                                disabled={processing}
                                                title="Resend with a fresh expiry"
                                                className="h-7 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => revoke(inv)}
                                                disabled={processing}
                                                title="Revoke invitation"
                                                className="h-7 rounded-lg border-rose-700/50 bg-rose-900/20 hover:bg-rose-800/30 text-rose-400 text-xs"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pending.length === 0 && (
                    <div className="px-5 py-12 text-center">
                        <Mail className="mx-auto h-12 w-12 text-zinc-700" />
                        <p className="mt-3 text-sm font-medium text-zinc-400">No pending invitations</p>
                        <p className="mt-1 text-xs text-zinc-600">Use the form above to invite people.</p>
                    </div>
                )}
            </div>

            {/* History */}
            {history.length > 0 && (
                <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                    <summary className="cursor-pointer px-5 py-4 flex items-center gap-2 hover:bg-zinc-800/40 transition-colors">
                        <XCircle className="h-4 w-4 text-zinc-600" />
                        <h2 className="text-sm font-bold text-zinc-400">Invitation history ({history.length})</h2>
                    </summary>

                    <div className="border-t border-zinc-800 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs uppercase tracking-wider text-zinc-500">
                                <tr>
                                    <th className="px-5 py-3">Email</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Sent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {history.map((inv) => {
                                    const badge = statusBadge(inv.status);
                                    const Icon = badge.icon;
                                    return (
                                        <tr key={inv.id} className="opacity-75">
                                            <td className="px-5 py-3">
                                                <span className="text-zinc-300">{inv.email}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-xs text-zinc-500 capitalize">{inv.role}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${badge.cls}`}>
                                                    <Icon className="h-3 w-3" />
                                                    {badge.label}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-xs text-zinc-600">{formatDate(inv.created_at)}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </AdminLayout>
    );
}
