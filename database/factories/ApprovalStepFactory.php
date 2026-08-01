<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\ApprovalStatus;
use App\Models\ApprovalStep;
use App\Models\Expense;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApprovalStep>
 */
final class ApprovalStepFactory extends Factory
{
    protected $model = ApprovalStep::class;

    public function definition(): array
    {
        return [
            'expense_id' => Expense::factory(),
            'approver_id' => User::factory(),
            'step_order' => 1,
            'status' => ApprovalStatus::Approved,
            'comment' => 'Looks good',
            'acted_at' => now(),
        ];
    }
}
