<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Department;
use App\Models\Expense;
use Illuminate\Support\Facades\DB;

final class PolicyEnforcementService
{
    public function __construct(
        private readonly BudgetService $budgetService,
        private readonly DuplicateDetectionService $duplicateDetectionService
    ) {}

    /**
     * Evaluate compliance policy rules against an expense item.
     *
     * @return array<int, array{code: string, severity: string, message: string}>
     */
    public function evaluate(Expense $expense): array
    {
        $expense->loadMissing(['user', 'category', 'receiptImages', 'receipt']);
        $flags = [];

        // Rule 1: Department Budget Breach
        $department = $this->resolveUserDepartment($expense);
        if ($department) {
            $deptFlag = $this->budgetService->checkDepartmentOverrun($department, (float) $expense->amount, $expense->expense_date);
            if ($deptFlag) {
                $flags[] = $deptFlag;
            }
        }

        // Rule 2: Category Overrun (Single-item limit & Period budget limit)
        $cat = $expense->category;
        if ($cat instanceof \App\Models\ExpenseCategory) {
            $catFlags = $this->budgetService->checkCategoryOverrun($cat, (float) $expense->amount, $expense->expense_date);
            foreach ($catFlags as $catFlag) {
                $flags[] = $catFlag;
            }
        }

        // Rule 3: Missing Receipt Check
        $org = $expense->organization;
        $orgSettings = $org instanceof \App\Models\Organization && is_array($org->settings) ? $org->settings : [];
        $threshold = isset($orgSettings['require_receipt_threshold'])
            ? (float) $orgSettings['require_receipt_threshold']
            : (float) config('receipt-snap.policies.require_receipt_threshold_amount', 25.00);

        $hasImages = $expense->receiptImages->isNotEmpty();
        $hasReceipt = $expense->receipt !== null;

        if ((float) $expense->amount > $threshold && ! $hasImages && ! $hasReceipt) {
            $flags[] = [
                'code' => 'MISSING_RECEIPT',
                'severity' => 'warning',
                'message' => sprintf(
                    'Expense amount %.2f exceeds threshold of %.2f but has no receipt image attached.',
                    (float) $expense->amount,
                    $threshold
                ),
            ];
        }

        // Rule 4: Weekend / Non-Business Day Check
        $flagWeekends = isset($orgSettings['flag_weekend_transactions'])
            ? (bool) $orgSettings['flag_weekend_transactions']
            : (bool) config('receipt-snap.policies.flag_weekend_transactions', true);

        if ($flagWeekends && $expense->expense_date && $expense->expense_date->isWeekend()) {
            $flags[] = [
                'code' => 'WEEKEND_TRANSACTION',
                'severity' => 'warning',
                'message' => sprintf(
                    'Expense occurred on a weekend (%s, %s).',
                    $expense->expense_date->format('l'),
                    $expense->expense_date->toDateString()
                ),
            ];
        }

        // Rule 5: Duplicate Submission Check
        foreach ($expense->receiptImages as $image) {
            if ($image instanceof \App\Models\ReceiptImage && $image->perceptual_hash) {
                $dupImage = $this->duplicateDetectionService->checkImageDuplicate($image->perceptual_hash);
                if ($dupImage && $dupImage->expense_id !== $expense->id) {
                    $dupExp = $dupImage->expense;
                    $flags[] = [
                        'code' => 'DUPLICATE_RECEIPT_IMAGE',
                        'severity' => 'critical',
                        'message' => sprintf(
                            'Attached receipt image matches an existing receipt (Expense UUID: %s).',
                            $dupExp instanceof \App\Models\Expense ? $dupExp->uuid : 'unknown'
                        ),
                    ];

                    break;
                }
            }
        }

        $dupExpense = $this->duplicateDetectionService->checkDataDuplicate(
            (float) $expense->amount,
            $expense->merchant_name,
            $expense->expense_date?->toDateString(),
            $expense->id
        );

        if ($dupExpense) {
            $flags[] = [
                'code' => 'DUPLICATE_EXPENSE_DATA',
                'severity' => 'warning',
                'message' => sprintf(
                    "Possible duplicate expense matching merchant '%s' and amount %.2f (Expense UUID: %s).",
                    $expense->merchant_name ?? 'unknown',
                    (float) $expense->amount,
                    $dupExpense->uuid
                ),
            ];
        }

        return $flags;
    }

    private function resolveUserDepartment(Expense $expense): ?Department
    {
        if (! $expense->user_id || ! $expense->organization_id) {
            return null;
        }

        $deptId = DB::table('organization_user')
            ->where('organization_id', $expense->organization_id)
            ->where('user_id', $expense->user_id)
            ->whereIn('is_active', [true, 1])
            ->value('department_id');

        return $deptId ? Department::find($deptId) : null;
    }
}
