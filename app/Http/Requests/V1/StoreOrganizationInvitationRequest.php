<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreOrganizationInvitationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $organization = $this->route('organization');

        return $organization && $this->user()?->can('create', [OrganizationInvitation::class, $organization]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:255'],
            'role' => [
                'required',
                Rule::enum(UserRole::class),
                Rule::notIn([UserRole::Owner->value]), // Cannot invite as Owner
            ],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ];
    }
}
