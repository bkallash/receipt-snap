<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('quota:reset-monthly-ai')->monthlyOn(1, '00:00');
Schedule::command('receipts:retry-pending-scans')->everyFiveMinutes();
Schedule::command('aggregates:recalculate')->dailyAt('02:00');
