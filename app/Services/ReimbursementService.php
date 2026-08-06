<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\ExpenseStatus;
use App\Enums\ReimbursementBatchStatus;
use App\Models\Expense;
use App\Models\Organization;
use App\Models\ReimbursementBatch;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

final class ReimbursementService
{
    public function __construct(
        private readonly AuditLogService $auditLogService
    ) {}

    /**
     * Create a reimbursement batch from a list of approved expense UUIDs.
     *
     * @param  array<int, string>  $expenseUuids
     */
    public function createBatch(Organization $org, User $user, array $expenseUuids, string $paymentMethod): ReimbursementBatch
    {
        return DB::transaction(function () use ($org, $user, $expenseUuids, $paymentMethod): ReimbursementBatch {
            $expenses = Expense::where('organization_id', $org->id)
                ->whereIn('uuid', $expenseUuids)
                ->where('status', ExpenseStatus::Approved)
                ->get();

            if ($expenses->isEmpty()) {
                throw new \InvalidArgumentException('No valid approved expenses selected for batch creation.');
            }

            $totalAmount = (float) $expenses->sum('amount');

            $batch = ReimbursementBatch::create([
                'organization_id' => $org->id,
                'created_by_user_id' => $user->id,
                'payment_method' => $paymentMethod,
                'total_amount' => $totalAmount,
                'currency_code' => $expenses->first()->currency_code ?? 'USD',
                'claim_count' => $expenses->count(),
                'status' => ReimbursementBatchStatus::Pending,
            ]);

            Expense::whereIn('id', $expenses->pluck('id'))
                ->update([
                    'reimbursement_batch_id' => $batch->id,
                    'status' => ExpenseStatus::Processing,
                ]);

            $this->auditLogService->record(
                action: AuditAction::ReimbursementBatchCreated,
                auditable: $batch,
                afterState: [
                    'batch_number' => $batch->batch_number,
                    'total_amount' => $totalAmount,
                    'claim_count' => $expenses->count(),
                    'payment_method' => $paymentMethod,
                ],
                actor: $user
            );

            return $batch;
        });
    }

    /**
     * Execute direct payout for a batch.
     */
    public function executeBatchPayout(ReimbursementBatch $batch, User $actor): bool
    {
        return DB::transaction(function () use ($batch, $actor): bool {
            if ($batch->status === ReimbursementBatchStatus::Completed) {
                return true;
            }

            $txHash = 'TX-ACH-'.strtoupper(Str::random(12));
            $paymentRef = 'REF-'.$batch->batch_number;

            $batch->update([
                'status' => ReimbursementBatchStatus::Completed,
                'payment_reference' => $paymentRef,
                'processed_at' => now(),
            ]);

            Expense::where('reimbursement_batch_id', $batch->id)
                ->update([
                    'status' => ExpenseStatus::Reimbursed,
                    'reimbursed_at' => now(),
                    'payment_reference' => $paymentRef,
                    'transaction_hash' => $txHash,
                ]);

            $this->auditLogService->record(
                action: AuditAction::ReimbursementExecuted,
                auditable: $batch,
                afterState: [
                    'status' => ReimbursementBatchStatus::Completed->value,
                    'payment_reference' => $paymentRef,
                    'transaction_hash' => $txHash,
                    'processed_at' => now()->toIso8601String(),
                ],
                actor: $actor
            );

            return true;
        });
    }

    /**
     * Mark selected expenses as reimbursed directly.
     *
     * @param  array<int, string>  $expenseUuids
     */
    public function markAsReimbursed(Organization $org, User $actor, array $expenseUuids, string $paymentRef, ?string $txHash = null): int
    {
        return DB::transaction(function () use ($org, $actor, $expenseUuids, $paymentRef, $txHash): int {
            $expenses = Expense::where('organization_id', $org->id)
                ->whereIn('uuid', $expenseUuids)
                ->whereIn('status', [ExpenseStatus::Approved, ExpenseStatus::Processing])
                ->get();

            $updatedCount = 0;
            foreach ($expenses as $expense) {
                $oldStatus = $expense->status->value;

                $expense->update([
                    'status' => ExpenseStatus::Reimbursed,
                    'reimbursed_at' => now(),
                    'payment_reference' => $paymentRef,
                    'transaction_hash' => $txHash ?? 'TX-MANUAL-'.strtoupper(Str::random(10)),
                ]);

                $this->auditLogService->record(
                    action: AuditAction::ExpenseReimbursed,
                    auditable: $expense,
                    beforeState: ['status' => $oldStatus],
                    afterState: [
                        'status' => ExpenseStatus::Reimbursed->value,
                        'payment_reference' => $paymentRef,
                        'reimbursed_at' => now()->toIso8601String(),
                    ],
                    actor: $actor
                );

                $updatedCount++;
            }

            return $updatedCount;
        });
    }
}
