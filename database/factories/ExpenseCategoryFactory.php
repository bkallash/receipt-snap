<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\ExpenseCategory;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExpenseCategory>
 */
final class ExpenseCategoryFactory extends Factory
{
    protected $model = ExpenseCategory::class;

    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => fake()->word().' '.fake()->unique()->randomNumber(3),
            'description' => fake()->sentence(),
            'icon' => 'tag',
            'color' => '#3B82F6',
            'is_active' => true,
            'max_amount' => 1000.00,
            'sort_order' => 0,
        ];
    }
}
