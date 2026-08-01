<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('expense_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('merchant_name')->nullable();
            $table->date('receipt_date')->nullable();
            $table->decimal('subtotal', 12, 2)->nullable();
            $table->decimal('tax', 12, 2)->nullable();
            $table->decimal('tip', 12, 2)->nullable();
            $table->decimal('total', 12, 2)->nullable();
            $table->string('currency', 3)->nullable();
            $table->string('card_last_four', 4)->nullable();
            $table->string('card_brand')->nullable();
            $table->text('raw_ocr_text')->nullable();
            $table->decimal('confidence_score', 5, 2)->nullable();
            $table->string('parser_provider')->default('gemini');
            $table->string('processing_status')->default('pending');
            $table->json('parser_metadata')->nullable();
            $table->timestamp('parsed_at')->nullable();
            $table->timestamps();

            $table->index('processing_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};
