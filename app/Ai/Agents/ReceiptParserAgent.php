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
#[Timeout(60)]
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
        return config('receipt-snap.ai.model') ?: env('RECEIPT_AI_MODEL', 'gemini-3.5-flash-lite');
    }

    public function instructions(): string
    {
        return <<<'PROMPT'
        You are an expert receipt OCR data extraction specialist.
        Thoroughly examine the receipt image from top to bottom and extract ALL structured fields:
        - merchant_name: name of the seller or store
        - receipt_date: transaction date in YYYY-MM-DD format
        - subtotal, tax, tip, total: exact numerical amounts
        - currency: 3-letter ISO code (e.g. USD, EUR)
        - card_last_four, card_brand: payment card info if visible

        LINE ITEMS EXTRACTION INSTRUCTIONS:
        Scan the entire itemized body of the receipt line by line. Extract EVERY single purchased item, product, fee, or service listed before subtotal/tax.
        Do NOT stop after the first 1 or 2 items — include ALL items on the receipt!
        For each line item:
        - description: exact product or item description text
        - quantity: number of units (default to 1 if not explicitly listed)
        - unit_price: price per unit (if not listed separately, set equal to total_price)
        - total_price: final extended line item price shown on receipt
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
                    'quantity' => $s->number()->nullable(),
                    'unit_price' => $s->number()->nullable(),
                    'total_price' => $s->number()->nullable(),
                ])
            )->nullable(),
        ];
    }
}
