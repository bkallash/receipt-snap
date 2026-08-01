<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Organization;
use Illuminate\Console\Command;

final class ResetMonthlyAiQuotas extends Command
{
    protected $signature = 'quota:reset-monthly-ai';

    protected $description = 'Reset monthly AI scan counts for all organizations';

    public function handle(): int
    {
        $count = Organization::query()->update([
            'ai_scans_used_this_month' => 0,
            'ai_scans_reset_at' => now(),
        ]);

        $this->info("Successfully reset AI scan counts for {$count} organization(s).");

        return self::SUCCESS;
    }
}
