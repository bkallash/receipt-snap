<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\PlanTier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

final class Organization extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'plan_tier',
        'logo_path',
        'settings',
        'ai_scans_used_this_month',
        'ai_scan_monthly_limit',
        'ai_scans_reset_at',
    ];

    protected $casts = [
        'plan_tier' => PlanTier::class,
        'settings' => 'array',
        'ai_scans_used_this_month' => 'integer',
        'ai_scan_monthly_limit' => 'integer',
        'ai_scans_reset_at' => 'immutable_datetime',
    ];

    protected static function booted(): void
    {
        self::creating(function (Organization $organization): void {
            if (empty($organization->slug) && ! empty($organization->name)) {
                $organization->slug = static::generateUniqueSlug($organization->name, $organization->id);
            }
        });

        self::updating(function (Organization $organization): void {
            if ($organization->isDirty('name') && ! $organization->isDirty('slug')) {
                $organization->slug = static::generateUniqueSlug($organization->name, $organization->id);
            }
        });
    }

    public static function generateUniqueSlug(string $name, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($name);
        if ($baseSlug === '') {
            $baseSlug = 'org';
        }

        $slug = $baseSlug;
        $count = 1;

        while (self::where('slug', $slug)
            ->whereNull('deleted_at')
            ->when($ignoreId !== null, fn (Builder $query) => $query->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$baseSlug}-{$count}";
            $count++;
        }

        return $slug;
    }

    public function hasQuotaRemaining(): bool
    {
        $limit = $this->ai_scan_monthly_limit ?? $this->plan_tier?->aiScanLimit();

        if ($limit === null) {
            return true;
        }

        return $this->ai_scans_used_this_month < $limit;
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'organization_user')
            ->withPivot(['role', 'department_id', 'is_active', 'joined_at'])
            ->withTimestamps();
    }

    public function members(): BelongsToMany
    {
        return $this->users();
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function expenseCategories(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function invitations(): HasMany
    {
        return $this->hasMany(OrganizationInvitation::class);
    }

    public function scopeBySlug(Builder $query, string $slug): Builder
    {
        return $query->where('slug', $slug)->whereNull('deleted_at');
    }
}
