<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Expense;
use App\Models\LineItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LineItem>
 */
final class LineItemFactory extends Factory
{
    protected $model = LineItem::class;

    public function definition(): array
    {
        $qty = fake()->numberBetween(1, 5);
        $price = fake()->randomFloat(2, 5, 50);

        return [
            'expense_id' => Expense::factory(),
            'description' => fake()->words(3, true),
            'quantity' => $qty,
            'unit_price' => $price,
            'total_price' => $qty * $price,
            'sort_order' => 0,
        ];
    }
}
