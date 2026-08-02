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
            ->map(fn (OrganizationInvitation $invitation) => [
                'id' => $invitation->id,
                'token' => $invitation->token,
                'organization' => [
                    'id' => $invitation->organization->id,
                    'name' => $invitation->organization->name,
                    'slug' => $invitation->organization->slug,
                ],
                'invited_by' => $invitation->invitedBy ? [
                    'name' => $invitation->invitedBy->name,
                    'email' => $invitation->invitedBy->email,
                ] : null,
                'role' => $invitation->role->value,
                'department' => $invitation->department ? [
                    'id' => $invitation->department->id,
                    'name' => $invitation->department->name,
                ] : null,
                'created_at' => $invitation->created_at?->diffForHumans(),
                'expires_at' => $invitation->expires_at?->diffForHumans(),
            ]);

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

        return redirect()->route('portal.expenses')
            ->with('success', "You have successfully joined {$invitation->organization->name}!");
    }

    public function reject(Request $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $this->authorize('reject', $invitation);

        $user = $request->user();
        $this->invitationService->rejectInvitation($invitation, $user);

        return redirect()->route('portal.invitations')
            ->with('info', "Invitation to {$invitation->organization->name} was declined.");
    }
}
