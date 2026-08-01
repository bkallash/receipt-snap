<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\UserResource;
use App\Models\Organization;
use App\Models\User;
use App\Services\OrganizationService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

final class AuthController extends Controller
{
    public function __construct(
        private readonly OrganizationService $organizationService,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'organization_name' => ['required', 'string', 'max:255'],
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => Hash::make($data['password']),
        ]);

        $organization = $this->organizationService->createOrganization($user, [
            'name' => $data['organization_name'],
        ]);

        $token = $user->createToken('api', ["org:{$organization->id}"])->plainTextToken;

        TenantContext::set($organization->id);

        return response()->json([
            'user' => new UserResource($user->load(['organizations'])),
            'organization_id' => $organization->id,
            'token' => $token,
        ], Response::HTTP_CREATED);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'organization_id' => ['nullable', 'integer'],
        ]);

        $user = User::where('email', strtolower($credentials['email']))->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password.'],
            ]);
        }

        $organizationId = $credentials['organization_id'] ?? null;

        if ($organizationId) {
            $isMember = $user->organizations()
                ->where('organizations.id', $organizationId)
                ->wherePivot('is_active', true)
                ->exists();

            if (! $isMember) {
                return response()->json(['message' => 'User is not an active member of this organization.'], Response::HTTP_FORBIDDEN);
            }
        } else {
            $organization = $user->organizations()->wherePivot('is_active', true)->first();
            if (! $organization) {
                return response()->json(['message' => 'User belongs to no active organization.'], Response::HTTP_FORBIDDEN);
            }
            $organizationId = $organization->id;
        }

        $token = $user->createToken('api', ["org:{$organizationId}"])->plainTextToken;
        TenantContext::set($organizationId);

        return response()->json([
            'user' => new UserResource($user->load(['organizations'])),
            'organization_id' => $organizationId,
            'token' => $token,
        ]);
    }

    public function switchOrganization(Request $request, Organization $organization): JsonResponse
    {
        $user = $request->user();

        $isMember = $user->organizations()
            ->where('organizations.id', $organization->id)
            ->wherePivot('is_active', true)
            ->exists();

        if (! $isMember) {
            return response()->json(['message' => 'User is not an active member of target organization.'], Response::HTTP_FORBIDDEN);
        }

        $token = $user->createToken('api', ["org:{$organization->id}"])->plainTextToken;
        TenantContext::set($organization->id);

        return response()->json([
            'message' => 'Switched organization successfully.',
            'organization_id' => $organization->id,
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        TenantContext::clear();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()->load(['organizations'])),
            'current_organization_id' => TenantContext::get(),
        ]);
    }
}
