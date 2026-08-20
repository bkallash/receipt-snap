<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\StoreOrganizationInvitationRequest;
use App\Http\Resources\V1\OrganizationInvitationResource;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Services\OrganizationInvitationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

final class OrganizationInvitationController extends Controller
{
    public function __construct(
        private readonly OrganizationInvitationService $invitationService,
    ) {}

    public function index(Request $request, Organization $organization): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [OrganizationInvitation::class, $organization]);

        $invitations = OrganizationInvitation::where('organization_id', $organization->id)
            ->pending()
            ->with(['invitedBy', 'department'])
            ->get();

        return OrganizationInvitationResource::collection($invitations);
    }

    public function store(StoreOrganizationInvitationRequest $request, Organization $organization): JsonResponse
    {
        $role = UserRole::from($request->validated('role'));

        $invitation = $this->invitationService->createInvitation(
            $organization,
            $request->user(),
            $request->validated('email'),
            $role,
            $request->validated('department_id') ? (int) $request->validated('department_id') : null,
        );

        return (new OrganizationInvitationResource($invitation->load(['invitedBy', 'department'])))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function accept(Request $request, string $token): JsonResponse
    {
        $invitation = OrganizationInvitation::where('token', $token)->firstOrFail();

        $this->authorize('accept', $invitation);

        $this->invitationService->acceptInvitation($invitation, $request->user());

        return response()->json(['message' => 'Invitation accepted successfully.']);
    }

    public function reject(Request $request, string $token): JsonResponse
    {
        $invitation = OrganizationInvitation::where('token', $token)->firstOrFail();

        $this->authorize('reject', $invitation);

        $this->invitationService->rejectInvitation($invitation, $request->user());

        return response()->json(['message' => 'Invitation rejected successfully.']);
    }

    public function destroy(Request $request, Organization $organization, OrganizationInvitation $invitation): JsonResponse
    {
        $this->authorize('revoke', $invitation);

        $this->invitationService->revokeInvitation($invitation);

        return response()->json(['message' => 'Invitation revoked successfully.']);
    }
}
