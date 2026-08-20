<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Receipt
 */
final class ReceiptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'merchant_name' => $this->merchant_name,
            'receipt_date' => $this->receipt_date?->toDateString(),
            'subtotal' => $this->subtotal,
            'tax' => $this->tax,
            'tip' => $this->tip,
            'total' => $this->total,
            'currency' => $this->currency,
            'card_last_four' => $this->card_last_four,
            'card_brand' => $this->card_brand,
            'confidence_score' => $this->confidence_score,
            'parser_provider' => $this->parser_provider,
            'processing_status' => $this->processing_status?->value,
            'parsed_at' => $this->parsed_at?->toIso8601String(),
        ];
    }
}
