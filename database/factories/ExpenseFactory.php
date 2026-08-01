<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ExpenseStatus;
use App\Enums\PaymentMethod;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Expense>
 */
final class ExpenseFactory extends Factory
{
    protected $model = Expense::class;

    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'organization_id' => Organization::factory(),
            'user_id' => User::factory(),
            'expense_category_id' => ExpenseCategory::factory(),
            'merchant_name' => fake()->company(),
            'description' => fake()->sentence(),
            'amount' => fake()->randomFloat(2, 10, 500),
            'tax_amount' => fake()->randomFloat(2, 1, 50),
            'tip_amount' => fake()->randomFloat(2, 0, 20),
            'currency_code' => 'USD',
            'expense_date' => fake()->date(),
            'payment_method' => PaymentMethod::CreditCard,
            'status' => ExpenseStatus::Draft,
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['status' => ExpenseStatus::Draft]);
    }

    public function submitted(): static
    {
        return $this->state(fn () => [
            'status' => ExpenseStatus::Submitted,
            'submitted_at' => now(),
        ]);
    }

    public function approved(): static
    {
        return $this->state(fn () => [
            'status' => ExpenseStatus::Approved,
            'submitted_at' => now()->subDay(),
            'approved_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn () => [
            'status' => ExpenseStatus::Rejected,
            'submitted_at' => now()->subDay(),
            'rejected_at' => now(),
            'rejection_reason' => 'Missing itemized receipt',
        ]);
    }

    public function reimbursed(): static
    {
        return $this->state(fn () => [
            'status' => ExpenseStatus::Reimbursed,
            'submitted_at' => now()->subDays(3),
            'approved_at' => now()->subDays(2),
            'reimbursed_at' => now(),
        ]);
    }
}
