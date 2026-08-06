<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Organization;
use App\Services\AggregateService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

final class RecalculateAggregates extends Command
{
    protected $signature = 'aggregates:recalculate
                            {--org= : Target Organization ID}
                            {--period= : Budget period (monthly, quarterly, annual)}
                            {--date= : As-of date for period range (YYYY-MM-DD)}';

    protected $description = 'Recalculate pre-computed expense aggregates for organizations';

    public function handle(AggregateService $aggregateService): int
    {
        $this->info('Starting aggregate recalculation...');

        $orgOption = $this->option('org');
        $periodOption = $this->option('period');
        $dateOption = $this->option('date');

        $asOfDate = $dateOption ? CarbonImmutable::parse($dateOption) : CarbonImmutable::now();

        $orgQuery = Organization::query();
        if ($orgOption) {
            $orgQuery->where('id', $orgOption);
        }

        $orgs = $orgQuery->get();

        if ($orgs->isEmpty()) {
            $this->warn('No organizations found matching criteria.');

            return Command::SUCCESS;
        }

        $bar = $this->output->createProgressBar($orgs->count());
        $bar->start();

        foreach ($orgs as $org) {
            $aggregateService->recomputeForOrganization(
                (int) $org->id,
                $periodOption ? (string) $periodOption : null,
                $asOfDate
            );
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Aggregate recalculation completed successfully.');

        return Command::SUCCESS;
    }
}
