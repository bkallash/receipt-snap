<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Expense;
use App\Models\ReceiptImage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReceiptImage>
 */
final class ReceiptImageFactory extends Factory
{
    protected $model = ReceiptImage::class;

    public function definition(): array
    {
        return [
            'expense_id' => Expense::factory(),
            'disk' => 'local',
            'file_path' => 'receipts/test.jpg',
            'original_filename' => 'receipt.jpg',
            'mime_type' => 'image/jpeg',
            'file_size' => 102400,
            'sort_order' => 0,
        ];
    }
}
