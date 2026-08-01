<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReceiptProcessingStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Receipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'expense_id',
        'merchant_name',
        'receipt_date',
        'subtotal',
        'tax',
        'tip',
        'total',
        'currency',
        'card_last_four',
        'card_brand',
        'raw_ocr_text',
        'confidence_score',
        'parser_provider',
        'processing_status',
        'parser_metadata',
        'parsed_at',
    ];

    protected $casts = [
        'receipt_date' => 'immutable_date',
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'tip' => 'decimal:2',
        'total' => 'decimal:2',
        'confidence_score' => 'decimal:2',
        'processing_status' => ReceiptProcessingStatus::class,
        'parser_metadata' => 'array',
        'parsed_at' => 'immutable_datetime',
    ];

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }
}
