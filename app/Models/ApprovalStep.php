<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ApprovalStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ApprovalStep extends Model
{
    use HasFactory;

    protected $fillable = [
        'expense_id',
        'approver_id',
        'step_order',
        'status',
        'comment',
        'acted_at',
    ];

    protected $casts = [
        'status' => ApprovalStatus::class,
        'step_order' => 'integer',
        'acted_at' => 'immutable_datetime',
    ];

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }
}
