<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use App\Enums\PaymentMethod;
use App\Rules\ValidFileContent;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        $expense = $this->route('expense');

        return $expense && $this->user()?->can('update', $expense);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'expense_category_id' => ['nullable', 'integer', 'exists:expense_categories,id'],
            'merchant_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0.01', 'max:999999.99'],
            'tax_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999.99'],
            'tip_amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:999999.99'],
            'currency_code' => ['sometimes', 'required', 'string', 'size:3'],
            'expense_date' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'payment_method' => ['sometimes', 'nullable', Rule::enum(PaymentMethod::class)],
            'line_items' => ['sometimes', 'nullable', 'array'],
            'line_items.*.description' => ['required_with:line_items', 'string', 'max:255'],
            'line_items.*.quantity' => ['required_with:line_items', 'numeric', 'min:0.001', 'max:9999.999'],
            'line_items.*.unit_price' => ['required_with:line_items', 'numeric', 'min:0', 'max:999999.99'],
            'receipt_images' => ['sometimes', 'nullable', 'array', 'max:10'],
            'receipt_images.*' => [
                'file',
                'mimes:jpg,jpeg,png,pdf,heic',
                'max:10240',
                new ValidFileContent(['jpeg', 'png', 'pdf', 'heic']),
            ],
        ];
    }
}
