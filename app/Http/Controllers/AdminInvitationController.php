<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\InvitationStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Concerns\AdministersOrganization;
use App\Models\Department;
use App\Models\Organization;
use App\Models\OrganizationInvitation;
use App\Services\OrganizationInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class AdminInvitationController extends Controller
{
    use AdministersOrganization;

    public function __construct(private readonly OrganizationInvitationService $invitationService) {}

    public function index(Request $request): Response
    {
        $org = $this->resolveAdministeredOrganization($request);

        $invitations = $org->invitations()
            ->with(['invitedBy', 'department'])
            ->orderByDesc('created_at')
            ->get();

        $existingEmails = $org->users()->pluck('email')->map(fn ($e): string => strtolower((string) $e))->all();

        $pending = $invitations
            ->filter(function (OrganizationInvitation $i): bool {
                return $i->status === InvitationStatus::Pending && $i->expires_at !== null && $i->expires_at->isFuture();
            })
            ->map(fn (OrganizationInvitation $i): array => $this->present($i))
            ->values()
            ->all();

        $history = $invitations
            ->filter(function (OrganizationInvitation $i): bool {
                return $i->status !== InvitationStatus::Pending || ($i->expires_at !== null && $i->expires_at->isPast());
            })
            ->map(fn (OrganizationInvitation $i): array => $this->present($i))
            ->values()
            ->all();

        return Inertia::render('Admin/Invitations', [
            'pending' => $pending,
            'history' => $history,
            'departments' => $org->departments()->orderBy('name')->get(['id', 'name'])
                ->map(fn (Department $d): array => ['id' => $d->id, 'name' => $d->name])->all(),
            'roles' => $this->invitableRoles(),
            'memberEmails' => $existingEmails,
            'organization' => ['id' => $org->id, 'name' => $org->name, 'slug' => $org->slug],
            'administeredOrganizations' => $this->administeredOrganizations($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $data = $request->validate([
            'emails' => ['required', 'string', 'max:5000'],
            'role' => ['required', Rule::enum(UserRole::class), Rule::notIn([UserRole::Owner->value])],
            'department_id' => [
                'nullable',
                'integer',
                Rule::exists('departments', 'id')->where('organization_id', $org->id)->whereNull('deleted_at'),
            ],
            'expires_in_days' => ['nullable', 'integer', 'min:1', 'max:90'],
        ]);

        $emails = collect(preg_split('/[\s,;]+/', $data['emails']) ?: [])
            ->map(fn (string $e): string => trim($e))
            ->filter()
            ->map(fn (string $e): string => strtolower($e))
            ->unique()
            ->values();

        if ($emails->isEmpty()) {
            throw ValidationException::withMessages(['emails' => 'Enter at least one email address.']);
        }

        $invalid = $emails->reject(fn (string $e): bool => (bool) filter_var($e, FILTER_VALIDATE_EMAIL));
        if ($invalid->isNotEmpty()) {
            throw ValidationException::withMessages([
                'emails' => 'These addresses look invalid: '.$invalid->take(5)->implode(', ').'.',
            ]);
        }

        $alreadyMembers = $org->users()->pluck('email')->map(fn ($e): string => strtolower((string) $e));
        $skipped = $emails->intersect($alreadyMembers);
        $toInvite = $emails->diff($alreadyMembers);

        if ($toInvite->isEmpty()) {
            throw ValidationException::withMessages([
                'emails' => 'Everyone you entered is already a member of this organization.',
            ]);
        }

        $role = UserRole::from($data['role']);
        $departmentId = isset($data['department_id']) ? (int) $data['department_id'] : null;
        $expiresInDays = isset($data['expires_in_days']) ? (int) $data['expires_in_days'] : null;

        foreach ($toInvite as $email) {
            $this->invitationService->createInvitation($org, $request->user(), $email, $role, $departmentId, $expiresInDays);
        }

        $message = $toInvite->count() === 1
            ? "Invitation sent to {$toInvite->first()}."
            : "Sent {$toInvite->count()} invitations.";

        if ($skipped->isNotEmpty()) {
            $message .= " Skipped {$skipped->count()} existing member".($skipped->count() === 1 ? '' : 's').'.';
        }

        return back()->with('success', $message);
    }

    public function resend(Request $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $this->assertInvitationBelongsToOrg($org, $invitation);

        // No dedicated resend endpoint exists yet: revoke-and-recreate refreshes the
        // token and expiry. Preserve the admin's originally-chosen window length.
        $originalDays = $invitation->created_at && $invitation->expires_at
            ? max(1, (int) round($invitation->created_at->diffInDays($invitation->expires_at)))
            : null;

        $this->invitationService->createInvitation(
            $org,
            $request->user(),
            $invitation->email,
            $invitation->role,
            $invitation->department_id,
            $originalDays,
        );

        $window = $originalDays ?? 14;

        return back()->with('success', "Invitation to {$invitation->email} was resent with a fresh {$window}-day expiry.");
    }

    public function destroy(Request $request, OrganizationInvitation $invitation): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $this->assertInvitationBelongsToOrg($org, $invitation);

        $this->invitationService->revokeInvitation($invitation);

        return back()->with('success', "Invitation to {$invitation->email} was revoked.");
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function invitableRoles(): array
    {
        return collect(UserRole::cases())
            ->reject(fn (UserRole $role): bool => $role === UserRole::Owner)
            ->map(fn (UserRole $role): array => ['value' => $role->value, 'label' => ucfirst($role->value)])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function present(OrganizationInvitation $invitation): array
    {
        $expiresAt = $invitation->expires_at;
        $isExpired = $invitation->status === InvitationStatus::Pending && $expiresAt !== null && $expiresAt->isPast();

        return [
            'id' => $invitation->id,
            'email' => $invitation->email,
            'role' => $invitation->role->value,
            'status' => $isExpired ? 'expired' : $invitation->status->value,
            'department_name' => $invitation->department?->name,
            'invited_by' => $invitation->invitedBy?->name,
            'created_at' => $invitation->created_at?->toIso8601String(),
            'expires_at' => $expiresAt?->toIso8601String(),
            'days_until_expiry' => $expiresAt !== null && $expiresAt->isFuture()
                ? (int) Carbon::now()->diffInDays($expiresAt, false)
                : null,
        ];
    }

    private function assertInvitationBelongsToOrg(Organization $org, OrganizationInvitation $invitation): void
    {
        abort_unless($invitation->organization_id === $org->id, 404, 'Invitation not found for this organization.');
    }
}
