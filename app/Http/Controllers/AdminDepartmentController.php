<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\BudgetPeriod;
use App\Http\Controllers\Concerns\AdministersOrganization;
use App\Models\Department;
use App\Services\BudgetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class AdminDepartmentController extends Controller
{
    use AdministersOrganization;

    public function __construct(private readonly BudgetService $budgetService) {}

    public function index(Request $request): Response
    {
        $org = $this->resolveAdministeredOrganization($request);

        $departments = $org->departments()
            ->orderBy('name')
            ->get();

        // Department membership lives on the organization_user pivot, not a
        // users.department_id column, so member counts are resolved there.
        $memberCounts = DB::table('organization_user')
            ->where('organization_id', $org->id)
            ->whereNotNull('department_id')
            ->selectRaw('department_id, COUNT(*) as aggregate')
            ->groupBy('department_id')
            ->pluck('aggregate', 'department_id');

        $enriched = $departments->map(function (Department $dept) use ($memberCounts): array {
            $budget = $this->budgetService->calculateDepartmentBudgetStatus($dept);

            return [
                'id' => $dept->id,
                'name' => $dept->name,
                'description' => $dept->description,
                'members_count' => (int) ($memberCounts[$dept->id] ?? 0),
                'budget_amount' => $dept->budget_amount,
                'budget_currency' => $dept->budget_currency,
                'budget_period' => $dept->budget_period?->value,
                'spent_amount' => $budget['spent_amount'],
                'pending_amount' => $budget['pending_amount'],
                'remaining_budget' => $budget['remaining_budget'],
                'utilization_percentage' => $budget['utilization_percentage'],
            ];
        })->all();

        return Inertia::render('Admin/Departments', [
            'departments' => $enriched,
            'budgetPeriods' => $this->budgetPeriodOptions(),
            'organization' => ['id' => $org->id, 'name' => $org->name, 'slug' => $org->slug],
            'administeredOrganizations' => $this->administeredOrganizations($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'budget_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'budget_currency' => ['required_with:budget_amount', 'nullable', 'string', 'size:3'],
            'budget_period' => ['required_with:budget_amount', 'nullable', Rule::enum(BudgetPeriod::class)],
        ]);

        // Enforce unique name per organization (soft-deleted excluded).
        $existing = Department::where('organization_id', $org->id)
            ->where('name', $data['name'])
            ->whereNull('deleted_at')
            ->exists();

        if ($existing) {
            return back()->withErrors(['name' => 'A department with this name already exists.'])->withInput();
        }

        Department::create(array_merge(['organization_id' => $org->id], $data));

        return back()->with('success', "Department '{$data['name']}' was created.");
    }

    public function update(Request $request, Department $department): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $this->assertDepartmentBelongsToOrg($org, $department);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'budget_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'budget_currency' => ['required_with:budget_amount', 'nullable', 'string', 'size:3'],
            'budget_period' => ['required_with:budget_amount', 'nullable', Rule::enum(BudgetPeriod::class)],
        ]);

        // Enforce unique name per organization, excluding this department.
        if ($data['name'] !== $department->name) {
            $existing = Department::where('organization_id', $org->id)
                ->where('name', $data['name'])
                ->where('id', '!=', $department->id)
                ->whereNull('deleted_at')
                ->exists();

            if ($existing) {
                return back()->withErrors(['name' => 'A department with this name already exists.'])->withInput();
            }
        }

        $department->update($data);

        return back()->with('success', "Department '{$department->name}' was updated.");
    }

    public function destroy(Request $request, Department $department): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $this->assertDepartmentBelongsToOrg($org, $department);

        $memberCount = DB::table('organization_user')
            ->where('organization_id', $org->id)
            ->where('department_id', $department->id)
            ->count();

        if ($memberCount > 0) {
            return back()->with(
                'error',
                "Cannot delete '{$department->name}': {$memberCount} member"
                    .($memberCount === 1 ? '' : 's').' still assigned. Move them first.'
            );
        }

        $department->delete();

        return back()->with('success', "Department '{$department->name}' was deleted.");
    }

    /**
     * @return array<int, array{value: string, label: string}>
     */
    private function budgetPeriodOptions(): array
    {
        return [
            ['value' => BudgetPeriod::Monthly->value, 'label' => 'Monthly'],
            ['value' => BudgetPeriod::Quarterly->value, 'label' => 'Quarterly'],
            ['value' => BudgetPeriod::Annual->value, 'label' => 'Annual'],
        ];
    }

    private function assertDepartmentBelongsToOrg($org, Department $department): void
    {
        abort_unless(
            $department->organization_id === $org->id,
            404,
            'Department not found for this organization.'
        );
    }
}
