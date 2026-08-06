import React from 'react';
import { router } from '@inertiajs/react';

interface AdministeredOrg {
    id: number;
    name: string;
    slug: string;
    role: string | null;
}

interface AdminPageHeaderProps {
    organization: { id: number; name: string; slug: string };
    administeredOrganizations: AdministeredOrg[];
    title: string;
    subtitle?: string;
    /** Optional right-aligned actions (buttons, etc.). */
    children?: React.ReactNode;
}

/**
 * Shared admin page header: organization identity, an optional workspace
 * switcher for multi-org admins, and a slot for page-level actions.
 */
export default function AdminPageHeader({
    organization,
    administeredOrganizations,
    title,
    subtitle,
    children,
}: AdminPageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-extrabold tracking-tight text-zinc-100 sm:text-3xl">{title}</h1>
                </div>
                {subtitle && <p className="mt-1 text-xs sm:text-sm text-zinc-400">{subtitle}</p>}

                {administeredOrganizations.length > 1 ? (
                    <div className="mt-3 flex items-center gap-2">
                        <label htmlFor="org-switcher" className="text-[11px] text-zinc-500">
                            Workspace
                        </label>
                        <select
                            id="org-switcher"
                            value={organization.id}
                            onChange={(e) =>
                                router.post('/admin/switch-organization', {
                                    organization_id: Number(e.target.value),
                                })
                            }
                            className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        >
                            {administeredOrganizations.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <p className="mt-2 text-[11px] text-zinc-500">
                        {organization.name} · <span className="text-zinc-600">{organization.slug}</span>
                    </p>
                )}
            </div>

            {children && <div className="flex flex-wrap items-center gap-2 shrink-0">{children}</div>}
        </div>
    );
}
