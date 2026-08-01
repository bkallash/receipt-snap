<?php

use App\Enums\UserRole;
use App\Models\ExpenseCategory;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->organization = Organization::factory()->create();
    $this->organization->users()->attach($this->user->id, ['role' => UserRole::Owner->value, 'is_active' => true]);

    $token = $this->user->createToken('test-token', ["org:{$this->organization->id}"])->plainTextToken;
    $this->withHeader('Authorization', "Bearer {$token}");

    $this->category = ExpenseCategory::factory()->create(['organization_id' => $this->organization->id]);
});

it('returns cached response when identical X-Idempotency-Key is submitted', function (): void {
    $idempotencyKey = 'unique-key-123456';

    $payload = [
        'amount' => 150.00,
        'currency_code' => 'USD',
        'expense_date' => '2026-07-29',
        'merchant_name' => 'Acme Supplies',
        'expense_category_id' => $this->category->id,
    ];

    $response1 = $this->withHeader('X-Idempotency-Key', $idempotencyKey)
        ->postJson('/api/v1/expenses', $payload);

    $response1->assertCreated();

    $response2 = $this->withHeader('X-Idempotency-Key', $idempotencyKey)
        ->postJson('/api/v1/expenses', $payload);

    $response2->assertCreated()
        ->assertHeader('X-Cache', 'Idempotent-Hit')
        ->assertJsonPath('data.id', $response1->json('data.id'));
});

it('processes normally without X-Idempotency-Key', function (): void {
    $payload = [
        'amount' => 50.00,
        'currency_code' => 'USD',
        'expense_date' => '2026-07-29',
        'expense_category_id' => $this->category->id,
    ];

    $response = $this->postJson('/api/v1/expenses', $payload);

    $response->assertCreated()
        ->assertHeaderMissing('X-Cache');
});
