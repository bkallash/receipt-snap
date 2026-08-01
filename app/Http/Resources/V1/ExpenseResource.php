<?php

declare(strict_types=1);

namespace App\Http\Resources\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

final class ExpenseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->uuid,
            'merchant_name' => $this->merchant_name,
            'description' => $this->description,
            'amount' => $this->amount,
            'tax_amount' => $this->tax_amount,
            'tip_amount' => $this->tip_amount,
            'currency_code' => $this->currency_code,
            'expense_date' => $this->expense_date?->toDateString(),
            'payment_method' => $this->payment_method?->value,
            'status' => $this->status->value,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'rejected_at' => $this->rejected_at?->toIso8601String(),
            'reimbursed_at' => $this->reimbursed_at?->toIso8601String(),
            'rejection_reason' => $this->rejection_reason,
            'submitter' => new UserResource($this->whenLoaded('user')),
            'category' => new ExpenseCategoryResource($this->whenLoaded('category')),
            'receipt_images' => ReceiptImageResource::collection($this->whenLoaded('receiptImages')),
            'receipt' => new ReceiptResource($this->whenLoaded('receipt')),
            'line_items' => LineItemResource::collection($this->whenLoaded('lineItems')),
            'approval_steps' => ApprovalStepResource::collection($this->whenLoaded('approvalSteps')),
            'policy_flags' => $this->getPolicyFlags(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
