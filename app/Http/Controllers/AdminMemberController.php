<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\ExpenseStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Concerns\AdministersOrganization;
use App\Models\Department;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\User;
use App\Services\OrganizationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

final class AdminMemberController extends Controller
{
    use AdministersOrganization;

    public function __construct(private readonly OrganizationService $organizationService) {}

    public function index(Request $request): Response
    {
        $org = $this->resolveAdministeredOrganization($request);

        $members = DB::table('organization_user')
            ->join('users', 'organization_user.user_id', '=', 'users.id')
            ->leftJoin('departments', function ($join): void {
                $join->on('organization_user.department_id', '=', 'departments.id')
                    ->whereNull('departments.deleted_at');
            })
            ->where('organization_user.organization_id', $org->id)
            ->select(
                'users.id',
                'users.name',
                'users.email',
                'organization_user.role',
                'organization_user.is_active',
                'organization_user.joined_at',
                'organization_user.department_id',
                'departments.name as department_name',
            )
            ->orderByDesc('organization_user.is_active')
            ->orderBy('users.name')
            ->get();

        $memberIds = $members->pluck('id')->all();
        $stats = $this->memberExpenseStats($org, $memberIds);

        $roleBreakdown = $members
            ->where('is_active', true)
            ->groupBy('role')
            ->map(fn ($group): int => $group->count());

        return Inertia::render('Admin/Members', [
            'members' => $members->map(fn ($m): array => [
                'id' => (int) $m->id,
                'name' => (string) $m->name,
                'email' => (string) $m->email,
                'role' => (string) $m->role,
                'is_active' => (bool) $m->is_active,
                'joined_at' => $m->joined_at,
                'department_id' => $m->department_id ? (int) $m->department_id : null,
                'department_name' => $m->department_name,
                'is_self' => (int) $m->id === $request->user()->id,
                'stats' => $stats[$m->id] ?? [
                    'total_count' => 0,
                    'total_amount' => 0.0,
                    'pending_count' => 0,
                    'approved_amount' => 0.0,
                    'reimbursed_amount' => 0.0,
                ],
            ])->all(),
            'departments' => Department::where('organization_id', $org->id)->orderBy('name')->get(['id', 'name'])
                ->map(fn (Department $d): array => ['id' => $d->id, 'name' => $d->name])->all(),
            'roles' => $this->assignableRoles($request, $org),
            'roleDescriptions' => $this->roleDescriptions(),
            'roleBreakdown' => $roleBreakdown,
            'ownerCount' => $members->where('role', UserRole::Owner->value)->where('is_active', true)->count(),
            'organization' => ['id' => $org->id, 'name' => $org->name, 'slug' => $org->slug],
            'administeredOrganizations' => $this->administeredOrganizations($request),
        ]);
    }

    public function update(Request $request, User $member): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $this->assertMemberBelongsToOrg($org, $member);

        $data = $request->validate([
            'role' => ['required', Rule::enum(UserRole::class)],
            'department_id' => [
                'nullable',
                'integer',
                Rule::exists('departments', 'id')->where('organization_id', $org->id)->whereNull('deleted_at'),
            ],
        ]);

        $newRole = UserRole::from($data['role']);
        $currentRole = $member->roleIn($org);
        $actorRole = $request->user()->roleIn($org);

        // Only owners may create or promote to Owner (guards admin privilege escalation).
        if ($newRole === UserRole::Owner && $actorRole !== UserRole::Owner) {
            throw ValidationException::withMessages([
                'role' => 'Only an owner can grant the owner role.',
            ]);
        }

        // Protect the last owner from being demoted.
        if ($currentRole === UserRole::Owner && $newRole !== UserRole::Owner && $this->activeOwnerCount($org) <= 1) {
            throw ValidationException::withMessages([
                'role' => 'You cannot demote the last owner. Assign another owner first.',
            ]);
        }

        $this->organizationService->updateMemberRole(
            $org,
            $member,
            $newRole,
            $request->has('department_id') ? ($data['department_id'] ?? null) : null,
        );

        // updateMemberRole ignores a null department unless the key is explicitly present,
        // so clear it directly when the admin chose "no department".
        if ($request->has('department_id') && ($data['department_id'] ?? null) === null) {
            DB::table('organization_user')
                ->where('organization_id', $org->id)
                ->where('user_id', $member->id)
                ->update(['department_id' => null]);
        }

        return back()->with('success', "{$member->name}'s membership was updated.");
    }

    public function destroy(Request $request, User $member): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $this->assertMemberBelongsToOrg($org, $member);

        if ($member->id === $request->user()->id) {
            return back()->with('error', 'You cannot remove yourself from the organization.');
        }

        try {
            $this->organizationService->removeMember($org, $member);
        } catch (\RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "{$member->name} was removed from the organization.");
    }

    /**
     * Fold per-member expense aggregates from a single grouped query.
     *
     * @param  array<int, int>  $memberIds
     * @return array<int, array{total_count: int, total_amount: float, pending_count: int, approved_amount: float, reimbursed_amount: float}>
     */
    private function memberExpenseStats(Organization $org, array $memberIds): array
    {
        if ($memberIds === []) {
            return [];
        }

        $rows = DB::table('expenses')
            ->where('organization_id', $org->id)
            ->whereNull('deleted_at')
            ->whereIn('user_id', $memberIds)
            ->where('status', '!=', ExpenseStatus::Draft->value)
            ->selectRaw('user_id, status, COUNT(*) as claim_count, COALESCE(SUM(amount), 0) as total_amount')
            ->groupBy('user_id', 'status')
            ->get();

        $stats = [];
        foreach ($rows as $row) {
            $uid = (int) $row->user_id;
            $stats[$uid] ??= [
                'total_count' => 0,
                'total_amount' => 0.0,
                'pending_count' => 0,
                'approved_amount' => 0.0,
                'reimbursed_amount' => 0.0,
            ];

            $count = (int) $row->claim_count;
            $amount = (float) $row->total_amount;
            $status = ExpenseStatus::tryFrom((string) $row->status);

            $stats[$uid]['total_count'] += $count;
            $stats[$uid]['total_amount'] += $amount;

            if (in_array($status, [ExpenseStatus::Submitted, ExpenseStatus::UnderReview], true)) {
                $stats[$uid]['pending_count'] += $count;
            }
            if ($status === ExpenseStatus::Approved || $status === ExpenseStatus::Processing) {
                $stats[$uid]['approved_amount'] += $amount;
            }
            if ($status === ExpenseStatus::Reimbursed) {
                $stats[$uid]['reimbursed_amount'] += $amount;
            }
        }

        return array_map(fn (array $s): array => [
            'total_count' => $s['total_count'],
            'total_amount' => round($s['total_amount'], 2),
            'pending_count' => $s['pending_count'],
            'approved_amount' => round($s['approved_amount'], 2),
            'reimbursed_amount' => round($s['reimbursed_amount'], 2),
        ], $stats);
    }

    /**
     * Roles the current admin may assign. Only owners can hand out ownership.
     *
     * @return array<int, array{value: string, label: string}>
     */
    private function assignableRoles(Request $request, Organization $org): array
    {
        $canGrantOwner = $request->user()->roleIn($org) === UserRole::Owner;

        return collect(UserRole::cases())
            ->filter(fn (UserRole $role): bool => $canGrantOwner || $role !== UserRole::Owner)
            ->map(fn (UserRole $role): array => [
                'value' => $role->value,
                'label' => ucfirst($role->value),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, string>
     */
    private function roleDescriptions(): array
    {
        return [
            UserRole::Owner->value => 'Full control, including billing and deleting the organization.',
            UserRole::Admin->value => 'Manages members, departments, categories, budgets, and approvals org-wide.',
            UserRole::Manager->value => 'Reviews and approves expenses for their department.',
            UserRole::Accountant->value => 'Handles reimbursements, exports, and accounting for the organization.',
            UserRole::Employee->value => 'Submits and tracks their own expenses.',
        ];
    }

    private function activeOwnerCount(Organization $org): int
    {
        return DB::table('organization_user')
            ->where('organization_id', $org->id)
            ->where('role', UserRole::Owner->value)
            ->where('is_active', true)
            ->count();
    }

    private function assertMemberBelongsToOrg(Organization $org, User $member): void
    {
        $isMember = DB::table('organization_user')
            ->where('organization_id', $org->id)
            ->where('user_id', $member->id)
            ->exists();

        abort_unless($isMember, 404, 'That person is not a member of this organization.');
    }
}
