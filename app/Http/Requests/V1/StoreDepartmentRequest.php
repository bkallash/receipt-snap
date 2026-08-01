<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use App\Enums\BudgetPeriod;
use App\Rules\UniqueAmongActive;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', new UniqueAmongActive('departments', 'name')],
            'description' => ['nullable', 'string', 'max:1000'],
            'budget_amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'budget_currency' => ['required_with:budget_amount', 'nullable', 'string', 'size:3'],
            'budget_period' => ['required_with:budget_amount', 'nullable', Rule::enum(BudgetPeriod::class)],
        ];
    }
}
