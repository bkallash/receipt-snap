<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\BudgetPeriod;
use App\Http\Controllers\Concerns\AdministersOrganization;
use App\Models\ExpenseCategory;
use App\Services\BudgetService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

final class AdminCategoryController extends Controller
{
    use AdministersOrganization;

    public function __construct(private readonly BudgetService $budgetService) {}

    public function index(Request $request): Response
    {
        $org = $this->resolveAdministeredOrganization($request);

        $categories = $org->expenseCategories()
            ->withCount('expenses')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $enriched = $categories->map(function (ExpenseCategory $cat): array {
            $budget = $this->budgetService->calculateCategoryBudgetStatus($cat);

            return [
                'id' => $cat->id,
                'name' => $cat->name,
                'description' => $cat->description,
                'icon' => $cat->icon,
                'color' => $cat->color,
                'gl_code' => $cat->gl_code,
                'is_active' => $cat->is_active,
                'max_amount' => $cat->max_amount,
                'default_tax_rate' => $cat->default_tax_rate,
                'requires_itemized_tax' => $cat->requires_itemized_tax,
                'budget_amount' => $cat->budget_amount,
                'budget_currency' => $cat->budget_currency,
                'budget_period' => $cat->budget_period?->value,
                'sort_order' => $cat->sort_order,
                'expenses_count' => $cat->expenses_count,
                'spent_amount' => $budget['spent_amount'],
                'pending_amount' => $budget['pending_amount'],
                'remaining_budget' => $budget['remaining_budget'],
                'utilization_percentage' => $budget['utilization_percentage'],
            ];
        })->all();

        return Inertia::render('Admin/Categories', [
            'categories' => $enriched,
            'budgetPeriods' => $this->budgetPeriodOptions(),
            'organization' => ['id' => $org->id, 'name' => $org->name, 'slug' => $org->slug],
            'administeredOrganizations' => $this->administeredOrganizations($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $data = $this->validatePayload($request);

        $existing = ExpenseCategory::where('organization_id', $org->id)
            ->where('name', $data['name'])
            ->whereNull('deleted_at')
            ->exists();

        if ($existing) {
            return back()->withErrors(['name' => 'A category with this name already exists.'])->withInput();
        }

        // Default the sort order to the end of the list when unspecified.
        if (! isset($data['sort_order'])) {
            $data['sort_order'] = (int) ExpenseCategory::where('organization_id', $org->id)->max('sort_order') + 1;
        }

        ExpenseCategory::create(array_merge(['organization_id' => $org->id], $data));

        return back()->with('success', "Category '{$data['name']}' was created.");
    }

    public function update(Request $request, ExpenseCategory $category): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $this->assertCategoryBelongsToOrg($org, $category);

        $data = $this->validatePayload($request);

        if ($data['name'] !== $category->name) {
            $existing = ExpenseCategory::where('organization_id', $org->id)
                ->where('name', $data['name'])
                ->where('id', '!=', $category->id)
                ->whereNull('deleted_at')
                ->exists();

            if ($existing) {
                return back()->withErrors(['name' => 'A category with this name already exists.'])->withInput();
            }
        }

        $category->update($data);

        return back()->with('success', "Category '{$category->name}' was updated.");
    }

    public function destroy(Request $request, ExpenseCategory $category): RedirectResponse
    {
        $org = $this->resolveAdministeredOrganization($request);

        $this->assertCategoryBelongsToOrg($org, $category);

        // Deletion is blocked when expenses reference the category; disabling keeps history intact.
        if ($category->expenses()->exists()) {
            return back()->with(
                'error',
                "'{$category->name}' is used by existing expenses and cannot be deleted. Disable it instead."
            );
        }

        $category->delete();

        return back()->with('success', "Category '{$category->name}' was deleted.");
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePayload(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'icon' => ['nullable', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'regex:/^#([a-fA-F0-9]{6})$/'],
            'gl_code' => ['nullable', 'string', 'max:50'],
            'is_active' => ['boolean'],
            'max_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'default_tax_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'requires_itemized_tax' => ['boolean'],
            'budget_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'budget_currency' => ['required_with:budget_amount', 'nullable', 'string', 'size:3'],
            'budget_period' => ['required_with:budget_amount', 'nullable', Rule::enum(BudgetPeriod::class)],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);
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

    private function assertCategoryBelongsToOrg($org, ExpenseCategory $category): void
    {
        abort_unless(
            $category->organization_id === $org->id,
            404,
            'Category not found for this organization.'
        );
    }
}
