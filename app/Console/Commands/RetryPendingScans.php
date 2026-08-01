<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ExpenseStatus;
use App\Jobs\ProcessReceiptScan;
use App\Models\Expense;
use App\Services\CircuitBreakerService;
use Illuminate\Console\Command;

final class RetryPendingScans extends Command
{
    protected $signature = 'receipts:retry-pending-scans';

    protected $description = 'Re-dispatch receipt scans for expenses that were paused due to circuit breaker outage';

    public function handle(CircuitBreakerService $circuitBreaker): int
    {
        if (! $circuitBreaker->isAvailable()) {
            $this->warn('Circuit breaker is currently OPEN. Skipping retry.');

            return self::SUCCESS;
        }

        $pendingExpenses = Expense::withoutGlobalScope('organization')
            ->where('status', ExpenseStatus::PendingScan)
            ->get();

        if ($pendingExpenses->isEmpty()) {
            $this->info('No pending scans to retry.');

            return self::SUCCESS;
        }

        $count = 0;
        foreach ($pendingExpenses as $expense) {
            ProcessReceiptScan::dispatch($expense->id);
            $count++;
        }

        $this->info("Successfully re-dispatched {$count} pending receipt scan(s).");

        return self::SUCCESS;
    }
}
