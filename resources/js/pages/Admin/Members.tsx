import React, { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import AdminPageHeader from '@/components/portal/AdminPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Mail,
    Shield,
    Trash2,
    UserCog,
    Users as UsersIcon,
    XCircle,
} from 'lucide-react';

interface Member {
    id: number;
    name: string;
    email: string;
    role: string;
    is_active: boolean;
    joined_at: string | null;
    department_id: number | null;
    department_name: string | null;
    is_self: boolean;
    stats: {
        total_count: number;
        total_amount: number;
        pending_count: number;
        approved_amount: number;
        reimbursed_amount: number;
    };
}

interface Department {
    id: number;
    name: string;
}

interface Role {
    value: string;
    label: string;
}

interface MembersProps {
    members: Member[];
    departments: Department[];
    roles: Role[];
    roleDescriptions: Record<string, string>;
    roleBreakdown: Record<string, number>;
    ownerCount: number;
    organization: { id: number; name: string; slug: string };
    administeredOrganizations: Array<{ id: number; name: string; slug: string; role: string | null }>;
}

export default function Members({
    members,
    departments,
    roles,
    roleDescriptions,
    roleBreakdown,
    ownerCount,
    organization,
    administeredOrganizations,
}: MembersProps) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = page.props.flash;

    const [editingMember, setEditingMember] = useState<number | null>(null);
    const [editRole, setEditRole] = useState<string>('');
    const [editDepartment, setEditDepartment] = useState<number | null>(null);
    const [removingMember, setRemovingMember] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

    const formatDate = (iso: string | null) =>
        iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    const roleColor = (role: string) => {
        switch (role) {
            case 'owner':
                return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
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

    const startEdit = (member: Member) => {
        setEditingMember(member.id);
        setEditRole(member.role);
        setEditDepartment(member.department_id);
    };

    const saveEdit = (member: Member) => {
        setProcessing(true);
        router.put(
            `/admin/members/${member.id}`,
            { role: editRole, department_id: editDepartment },
            {
                onFinish: () => {
                    setProcessing(false);
                    setEditingMember(null);
                },
            }
        );
    };

    const confirmRemove = (member: Member) => {
        if (!confirm(`Remove ${member.name} from the organization? This cannot be undone.`)) return;

        setProcessing(true);
        router.delete(`/admin/members/${member.id}`, {
            onFinish: () => {
                setProcessing(false);
                setRemovingMember(null);
            },
        });
    };

    const activeMembers = members.filter((m) => m.is_active);
    const inactiveMembers = members.filter((m) => !m.is_active);

    return (
        <AdminLayout title="Members">
            <AdminPageHeader
                organization={organization}
                administeredOrganizations={administeredOrganizations}
                title="Members"
                subtitle="Manage roles, departments, and access for everyone in the organization."
            />

            {/* Flash Messages */}
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

            {/* Role breakdown KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {['owner', 'admin', 'manager', 'accountant', 'employee'].map((role) => (
                    <Card key={role} className="border-zinc-800 bg-zinc-900/60">
                        <CardContent className="p-3.5">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 truncate">
                                    {role}
                                </span>
                                <Shield className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            </div>
                            <h3 className="mt-1.5 text-2xl font-bold text-zinc-100">
                                {roleBreakdown[role] || 0}
                            </h3>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Active members table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="border-b border-zinc-800 px-5 py-4 flex items-center gap-2">
                    <UsersIcon className="h-4 w-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-zinc-200">
                        Active members ({activeMembers.length})
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th className="px-5 py-3">Member</th>
                                <th className="px-5 py-3">Role</th>
                                <th className="px-5 py-3">Department</th>
                                <th className="px-5 py-3">Expenses</th>
                                <th className="px-5 py-3">Joined</th>
                                <th className="px-5 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {activeMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-zinc-800/40 transition-colors">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300 shrink-0">
                                                {member.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-zinc-200 truncate">
                                                    {member.name}
                                                    {member.is_self && (
                                                        <span className="ml-1.5 text-[10px] text-zinc-500">(You)</span>
                                                    )}
                                                </p>
                                                <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        {editingMember === member.id ? (
                                            <select
                                                value={editRole}
                                                onChange={(e) => setEditRole(e.target.value)}
                                                disabled={processing}
                                                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            >
                                                {roles.map((r) => (
                                                    <option key={r.value} value={r.value}>
                                                        {r.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span
                                                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${roleColor(member.role)}`}
                                                title={roleDescriptions[member.role]}
                                            >
                                                {member.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        {editingMember === member.id ? (
                                            <select
                                                value={editDepartment ?? ''}
                                                onChange={(e) => setEditDepartment(e.target.value ? Number(e.target.value) : null)}
                                                disabled={processing}
                                                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            >
                                                <option value="">No department</option>
                                                {departments.map((d) => (
                                                    <option key={d.id} value={d.id}>
                                                        {d.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-xs text-zinc-300">
                                                {member.department_name || (
                                                    <span className="text-zinc-600">Unassigned</span>
                                                )}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="text-xs">
                                            <p className="font-medium text-zinc-200">
                                                {member.stats.total_count} claims
                                            </p>
                                            <p className="text-zinc-500">{formatCurrency(member.stats.total_amount)}</p>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs text-zinc-400">{formatDate(member.joined_at)}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {editingMember === member.id ? (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => saveEdit(member)}
                                                        disabled={processing}
                                                        className="h-7 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold"
                                                    >
                                                        Save
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setEditingMember(null)}
                                                        disabled={processing}
                                                        className="h-7 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => startEdit(member)}
                                                        disabled={processing || member.is_self}
                                                        title={member.is_self ? "You can't edit your own role" : 'Edit role and department'}
                                                        className="h-7 rounded-lg border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
                                                    >
                                                        <UserCog className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => confirmRemove(member)}
                                                        disabled={processing || member.is_self || (member.role === 'owner' && ownerCount <= 1)}
                                                        title={
                                                            member.is_self
                                                                ? "You can't remove yourself"
                                                                : member.role === 'owner' && ownerCount <= 1
                                                                  ? 'Cannot remove the last owner'
                                                                  : 'Remove from organization'
                                                        }
                                                        className="h-7 rounded-lg border-rose-700/50 bg-rose-900/20 hover:bg-rose-800/30 text-rose-400 text-xs"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {activeMembers.length === 0 && (
                    <div className="px-5 py-12 text-center">
                        <UsersIcon className="mx-auto h-12 w-12 text-zinc-700" />
                        <p className="mt-3 text-sm font-medium text-zinc-400">No active members</p>
                        <p className="mt-1 text-xs text-zinc-600">
                            Invite people via the <a href="/admin/invitations" className="text-indigo-400 hover:underline">Invitations</a> page.
                        </p>
                    </div>
                )}
            </div>

            {/* Inactive members (if any) */}
            {inactiveMembers.length > 0 && (
                <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                    <summary className="cursor-pointer px-5 py-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors">
                        <div className="flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-zinc-600" />
                            <h2 className="text-sm font-bold text-zinc-400">
                                Inactive members ({inactiveMembers.length})
                            </h2>
                        </div>
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                    </summary>

                    <div className="border-t border-zinc-800 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-zinc-800 bg-zinc-950/40 text-xs uppercase tracking-wider text-zinc-500">
                                <tr>
                                    <th className="px-5 py-3">Member</th>
                                    <th className="px-5 py-3">Role</th>
                                    <th className="px-5 py-3">Department</th>
                                    <th className="px-5 py-3">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {inactiveMembers.map((member) => (
                                    <tr key={member.id} className="opacity-60">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-semibold text-zinc-500 shrink-0">
                                                    {member.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-zinc-400">{member.name}</p>
                                                    <p className="text-xs text-zinc-600">{member.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs text-zinc-500 capitalize">{member.role}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs text-zinc-600">
                                                {member.department_name || '—'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-xs text-zinc-600">{formatDate(member.joined_at)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </details>
            )}
        </AdminLayout>
    );
}
