<?php

declare(strict_types=1);

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('exports QuickBooks, Xero, NetSuite, and Tax Ledger formatted files', function (): void {
    $accountant = User::factory()->create();
    $org = Organization::factory()->create();
    $org->users()->attach($accountant->id, ['role' => 'accountant', 'is_active' => true, 'joined_at' => now()]);

    TenantContext::set($org->id);
    $category = ExpenseCategory::factory()->create(['organization_id' => $org->id, 'gl_code' => 'GL-6010', 'name' => 'Travel']);
    $expense = Expense::factory()->approved()->create([
        'organization_id' => $org->id,
        'user_id' => $accountant->id,
        'expense_category_id' => $category->id,
        'merchant_name' => 'Delta Air Lines',
        'amount' => 450.00,
        'tax_amount' => 30.00,
    ]);

    $token = $accountant->createToken('test', ["org:{$org->id}"])->plainTextToken;

    // QuickBooks CSV
    $qbResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->get('/api/v1/accountant/export-erp?target=quickbooks_csv');
    $qbResponse->assertOk();
    expect($qbResponse->getContent())->toContain('Delta Air Lines')->toContain('GL-6010');

    // Xero Payables Import
    $xeroResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->get('/api/v1/accountant/export-erp?target=xero');
    $xeroResponse->assertOk();
    expect($xeroResponse->getContent())->toContain('ContactName')->toContain('450.00');

    // NetSuite Journal Entry
    $nsResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->get('/api/v1/accountant/export-erp?target=netsuite');
    $nsResponse->assertOk();
    expect($nsResponse->getContent())->toContain('GL-6010')->toContain('450.00');

    // Tax Ledger
    $taxResponse = $this->withHeader('Authorization', "Bearer {$token}")
        ->get('/api/v1/accountant/export-erp?target=tax_ledger');
    $taxResponse->assertOk();
    expect($taxResponse->getContent())->toContain('Tax/VAT Amount')->toContain('30.00');
});
