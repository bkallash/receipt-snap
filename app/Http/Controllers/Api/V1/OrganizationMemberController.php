<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\UserResource;
use App\Models\Organization;
use App\Models\User;
use App\Services\OrganizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

final class OrganizationMemberController extends Controller
{
    public function __construct(
        private readonly OrganizationService $organizationService,
    ) {}

    public function index(Request $request, Organization $organization): AnonymousResourceCollection
    {
        $this->authorize('manageMembers', $organization);

        $members = $organization->users()->wherePivot('is_active', true)->get();

        return UserResource::collection($members);
    }

    public function update(Request $request, Organization $organization, User $member): JsonResponse
    {
        $this->authorize('manageMembers', $organization);

        $data = $request->validate([
            'role' => ['required', Rule::enum(UserRole::class)],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        $this->organizationService->updateMemberRole(
            $organization,
            $member,
            UserRole::from($data['role']),
            isset($data['department_id']) ? (int) $data['department_id'] : null,
        );

        return response()->json(['message' => 'Member role updated successfully.']);
    }

    public function destroy(Request $request, Organization $organization, User $member): JsonResponse
    {
        $this->authorize('manageMembers', $organization);

        $this->organizationService->removeMember($organization, $member);

        return response()->json(['message' => 'Member removed successfully.']);
    }
}
