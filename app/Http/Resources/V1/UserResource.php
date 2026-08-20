<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use App\Support\TenantContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\User
 */
final class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $orgId = TenantContext::get();
        $user = $this->resource;

        if ($user instanceof \App\Models\User && $orgId) {
            $pivotRow = \Illuminate\Support\Facades\DB::table('organization_user')
                ->where('organization_id', $orgId)
                ->where('user_id', $user->id)
                ->first();

            if ($pivotRow) {
                return [
                    'id' => $this->id,
                    'name' => $this->name,
                    'email' => $this->email,
                    'initials' => $this->initials(),
                    'role' => $pivotRow->role,
                    'is_active' => (bool) $pivotRow->is_active,
                    'joined_at' => $pivotRow->joined_at,
                ];
            }
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'initials' => $this->initials(),
            'role' => null,
            'is_active' => true,
            'joined_at' => null,
        ];
    }
}
