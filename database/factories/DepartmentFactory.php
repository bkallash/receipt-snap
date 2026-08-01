<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BudgetPeriod;
use App\Models\Department;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Department>
 */
final class DepartmentFactory extends Factory
{
    protected $model = Department::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->jobTitle().' Department',
            'description' => fake()->sentence(),
            'budget_amount' => fake()->randomFloat(2, 5000, 50000),
            'budget_currency' => 'USD',
            'budget_period' => BudgetPeriod::Monthly,
        ];
    }
}
