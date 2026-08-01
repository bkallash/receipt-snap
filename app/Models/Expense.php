<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\ExpenseStatus;
use App\Enums\PaymentMethod;
use App\Models\Concerns\BelongsToOrganization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

final class Expense extends Model
{
    use BelongsToOrganization, HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'organization_id',
        'user_id',
        'expense_category_id',
        'merchant_name',
        'description',
        'amount',
        'tax_amount',
        'tip_amount',
        'currency_code',
        'expense_date',
        'payment_method',
        'status',
        'submitted_at',
        'approved_at',
        'rejected_at',
        'reimbursed_at',
        'rejection_reason',
        'metadata',
    ];

    protected $casts = [
        'status' => ExpenseStatus::class,
        'payment_method' => PaymentMethod::class,
        'amount' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'tip_amount' => 'decimal:2',
        'expense_date' => 'immutable_date',
        'submitted_at' => 'immutable_datetime',
        'approved_at' => 'immutable_datetime',
        'rejected_at' => 'immutable_datetime',
        'reimbursed_at' => 'immutable_datetime',
        'metadata' => 'array',
    ];

    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id');
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(Receipt::class);
    }

    public function receiptImages(): HasMany
    {
        return $this->hasMany(ReceiptImage::class);
    }

    public function lineItems(): HasMany
    {
        return $this->hasMany(LineItem::class);
    }

    public function approvalSteps(): HasMany
    {
        return $this->hasMany(ApprovalStep::class);
    }

    public function scopeByStatus(Builder $query, ExpenseStatus|string $status): Builder
    {
        return $query->where('status', $status);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->whereIn('status', [ExpenseStatus::Submitted, ExpenseStatus::UnderReview]);
    }

    public function scopePendingScan(Builder $query): Builder
    {
        return $query->where('status', ExpenseStatus::PendingScan);
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeFlagged(Builder $query): Builder
    {
        return $query->whereNotNull('metadata->policy_flags')
            ->where('metadata->policy_flags', '!=', '[]')
            ->where('metadata->policy_flags', '!=', 'null');
    }

    public function hasPolicyViolations(): bool
    {
        $flags = $this->getPolicyFlags();

        return ! empty($flags);
    }

    /**
     * @return array<int, array{code: string, severity: string, message: string}>
     */
    public function getPolicyFlags(): array
    {
        return $this->metadata['policy_flags'] ?? [];
    }
}
