<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ReimbursementBatchStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

final class ReimbursementBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'organization_id',
        'created_by_user_id',
        'batch_number',
        'status',
        'payment_method',
        'total_amount',
        'currency_code',
        'claim_count',
        'payment_reference',
        'processed_at',
    ];

    protected $casts = [
        'status' => ReimbursementBatchStatus::class,
        'total_amount' => 'decimal:2',
        'claim_count' => 'integer',
        'processed_at' => 'immutable_datetime',
    ];

    protected static function boot(): void
    {
        parent::boot();

        self::creating(function (self $batch): void {
            if (empty($batch->uuid)) {
                $batch->uuid = (string) Str::uuid();
            }
            if (empty($batch->batch_number)) {
                $batch->batch_number = 'BATCH-'.now()->format('Ymd').'-'.strtoupper(Str::random(4));
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
