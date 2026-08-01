<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ReceiptProcessingStatus;
use App\Models\Expense;
use App\Models\Receipt;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Receipt>
 */
final class ReceiptFactory extends Factory
{
    protected $model = Receipt::class;

    public function definition(): array
    {
        return [
            'expense_id' => Expense::factory(),
            'merchant_name' => fake()->company(),
            'receipt_date' => fake()->date(),
            'subtotal' => fake()->randomFloat(2, 10, 500),
            'tax' => fake()->randomFloat(2, 1, 50),
            'tip' => fake()->randomFloat(2, 0, 20),
            'total' => fake()->randomFloat(2, 15, 600),
            'currency' => 'USD',
            'card_last_four' => fake()->numerify('####'),
            'card_brand' => fake()->randomElement(['Visa', 'MasterCard', 'Amex']),
            'raw_ocr_text' => fake()->paragraph(),
            'confidence_score' => fake()->randomFloat(2, 70, 99),
            'parser_provider' => 'gemini',
            'processing_status' => ReceiptProcessingStatus::Completed,
            'parser_metadata' => ['latency_ms' => 1200],
            'parsed_at' => now(),
        ];
    }

    public function pending(): static
    {
        return $this->state(fn (array $attributes) => [
            'processing_status' => ReceiptProcessingStatus::Pending,
            'parsed_at' => null,
        ]);
    }

    public function failed(): static
    {
        return $this->state(fn (array $attributes) => [
            'processing_status' => ReceiptProcessingStatus::Failed,
            'confidence_score' => 0.00,
        ]);
    }
}
