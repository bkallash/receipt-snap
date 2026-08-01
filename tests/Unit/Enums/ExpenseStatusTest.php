<?php

use App\Enums\ExpenseStatus;

it('has all expected expense status values', function (): void {
    expect(ExpenseStatus::Draft->value)->toBe('draft')
        ->and(ExpenseStatus::Submitted->value)->toBe('submitted')
        ->and(ExpenseStatus::UnderReview->value)->toBe('under_review')
        ->and(ExpenseStatus::Approved->value)->toBe('approved')
        ->and(ExpenseStatus::Rejected->value)->toBe('rejected')
        ->and(ExpenseStatus::Processing->value)->toBe('processing')
        ->and(ExpenseStatus::Reimbursed->value)->toBe('reimbursed');
});
