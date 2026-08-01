<?php

use App\Models\Expense;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('uses uuid as route key name', function (): void {
    $expense = new Expense;

    expect($expense->getRouteKeyName())->toBe('uuid');
});
