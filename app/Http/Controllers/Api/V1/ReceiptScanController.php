<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\ExpenseStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ReceiptResource;
use App\Jobs\ProcessReceiptScan;
use App\Models\Expense;
use App\Models\Receipt;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

final class ReceiptScanController extends Controller
{
    public function scan(Expense $expense): JsonResponse
    {
        $this->authorize('update', $expense);

        if ($expense->receiptImages()->doesntExist()) {
            return response()->json([
                'message' => 'No receipt images attached to this expense.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        ProcessReceiptScan::dispatch($expense->id);

        return response()->json([
            'message' => 'Receipt scan job dispatched successfully.',
            'expense_uuid' => $expense->uuid,
        ], Response::HTTP_ACCEPTED);
    }

    public function status(Expense $expense): JsonResponse
    {
        $this->authorize('view', $expense);

        $receipt = Receipt::where('expense_id', $expense->id)->first();

        if (! $receipt) {
            $isFinished = $expense->status !== ExpenseStatus::PendingScan;

            return response()->json([
                'status' => $isFinished ? 'completed' : 'not_started',
                'receipt' => null,
            ]);
        }

        return response()->json([
            'status' => $receipt->processing_status->value,
            'receipt' => new ReceiptResource($receipt),
        ]);
    }

    public function retry(Expense $expense): JsonResponse
    {
        $this->authorize('update', $expense);

        if ($expense->receiptImages()->doesntExist()) {
            return response()->json([
                'message' => 'No receipt images attached to this expense.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        ProcessReceiptScan::dispatch($expense->id);

        return response()->json([
            'message' => 'Receipt scan retry dispatched successfully.',
            'expense_uuid' => $expense->uuid,
        ], Response::HTTP_ACCEPTED);
    }
}
