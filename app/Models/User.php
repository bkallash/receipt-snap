<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use App\Support\TenantContext;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isSuperAdmin(): bool
    {
        return $this->email === 'admin@receiptsnap.test' || $this->email === 'qwe@qwe.qwe';
    }

    /**
     * Get the user's initials
     */
    public function initials(): string
    {
        $initials = Str::initials($this->name, true);

        return Str::length($initials) > 1
            ? Str::substr($initials, 0, 1).Str::substr($initials, -1)
            : $initials;
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class, 'organization_user')
            ->withPivot(['role', 'department_id', 'is_active', 'joined_at'])
            ->withTimestamps();
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function approvalSteps(): HasMany
    {
        return $this->hasMany(ApprovalStep::class, 'approver_id');
    }

    /**
     * Read role fresh from pivot table on every check (Fix E).
     */
    public function roleIn(Organization $organization): ?UserRole
    {
        $role = DB::table('organization_user')
            ->where('organization_id', $organization->id)
            ->where('user_id', $this->id)
            ->where('is_active', true)
            ->value('role');

        return $role ? UserRole::tryFrom((string) $role) : null;
    }

    public function currentOrganization(): ?Organization
    {
        if ($orgId = TenantContext::get()) {
            return Organization::where('id', $orgId)
                ->whereHas('users', fn ($q) => $q->where('users.id', $this->id)->where('organization_user.is_active', true))
                ->first();
        }

        return Organization::whereHas('users', fn ($q) => $q->where('users.id', $this->id)->where('organization_user.is_active', true))->first();
    }

    public function isOwnerOf(Organization $organization): bool
    {
        return $this->roleIn($organization) === UserRole::Owner;
    }

    public function isManagerOf(Organization $organization): bool
    {
        $role = $this->roleIn($organization);

        return $role === UserRole::Manager || $role === UserRole::Admin || $role === UserRole::Owner;
    }

    public function isEmployeeOf(Organization $organization): bool
    {
        return $this->roleIn($organization) === UserRole::Employee;
    }
}
