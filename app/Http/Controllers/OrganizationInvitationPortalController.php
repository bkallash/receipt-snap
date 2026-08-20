<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\OrganizationInvitation;
use App\Services\OrganizationInvitationService;
use App\Support\TenantContext;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

final class OrganizationInvitationPortalController extends Controller
{
    public function __construct(
        private readonly OrganizationInvitationService $invitationService,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $invitations = OrganizationInvitation::query()
            ->where('email', strtolower($user->email))
            ->pending()
            ->with(['organization', 'invitedBy', 'department'])
            ->latest()
            ->get()
            ->map(function ($invitation): array {
                /** @var OrganizationInvitation $invitation */
                $org = $invitation->organization;
                $invitedBy = $invitation->invitedBy;
                $dept = $invitation->department;

                return [
                    'id' => $invitation->id,
                    'token' => $invitation->token,
                    'organization' => [
                        'id' => $org instanceof \App\Models\Organization ? $org->id : null,
                        'name' => $org instanceof \App\Models\Organization ? $org->name : null,
                        'slug' => $org instanceof \App\Models\Organization ? $org->slug : null,
                    ],
                    'invited_by' => $invitedBy instanceof \App\Models\User ? [
                        'name' => $invitedBy->name,
                        'email' => $invitedBy->email,
                    ] : null,
                    'role' => $invitation->role->value,
                    'department' => $dept instanceof \App\Models\Department ? [
                        'id' => $dept->id,
                        'name' => $dept->name,
                    ] : null,
                    'created_at' => $invitation->created_at ? $invitation->created_at->diffForHumans() : null,
                    'expires_at' => $invitation->expires_at ? $invitation->expires_at->diffForHumans() : null,
                ];
            });

        $hasOrganization = $user->organizations()->wherePivot('is_active', true)->exists();

        return Inertia::render('Portal/Invitations', [
            'invitations' => $invitations,
            'has_organization' => $hasOrganization,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    public function accept(Request $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $this->authorize('accept', $invitation);

        $user = $request->user();
        $this->invitationService->acceptInvitation($invitation, $user);

        // Set active tenant context to newly joined organization
        TenantContext::set($invitation->organization_id);

        $org = $invitation->organization;
        $orgName = $org instanceof \App\Models\Organization ? $org->name : 'Organization';

        return redirect()->route('portal.expenses')
            ->with('success', "You have successfully joined {$orgName}!");
    }

    public function reject(Request $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $this->authorize('reject', $invitation);

        $user = $request->user();
        $this->invitationService->rejectInvitation($invitation, $user);

        $org = $invitation->organization;
        $orgName = $org instanceof \App\Models\Organization ? $org->name : 'Organization';

        return redirect()->route('portal.invitations')
            ->with('info', "Invitation to {$orgName} was declined.");
    }
}
