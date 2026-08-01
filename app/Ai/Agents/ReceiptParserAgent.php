<?php

declare(strict_types=1);

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Attributes\Temperature;
use Laravel\Ai\Attributes\Timeout;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;

#[Provider(Lab::Gemini)]
#[Temperature(0.1)]
#[Timeout(30)]
class ReceiptParserAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    public function provider(): Lab|string
    {
        $providerName = (string) config('receipt-snap.ai.provider', 'gemini');

        return Lab::tryFrom($providerName) ?? $providerName;
    }

    public function model(): ?string
    {
        return config('receipt-snap.ai.model');
    }

    public function instructions(): string
    {
        return <<<'PROMPT'
        You are a receipt data extraction specialist. Analyze the provided receipt
        image and extract all structured data. Be precise with amounts — use the
        exact numbers shown on the receipt. If a field is not visible or unclear,
        return null for that field. Extract every visible line item.
        PROMPT;
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'merchant_name' => $schema->string()->nullable(),
            'receipt_date' => $schema->string()->description('YYYY-MM-DD format')->nullable(),
            'subtotal' => $schema->number()->nullable(),
            'tax' => $schema->number()->nullable(),
            'tip' => $schema->number()->nullable(),
            'total' => $schema->number()->nullable(),
            'currency' => $schema->string()->description('ISO 4217 code')->nullable(),
            'card_last_four' => $schema->string()->nullable(),
            'card_brand' => $schema->string()->nullable(),
            'confidence' => $schema->number()->min(0)->max(100)->required(),
            'line_items' => $schema->array()->items(
                $schema->object(fn ($s) => [
                    'description' => $s->string()->required(),
                    'quantity' => $s->number()->required(),
                    'unit_price' => $s->number()->required(),
                    'total_price' => $s->number()->required(),
                ])
            )->nullable(),
        ];
    }
}
