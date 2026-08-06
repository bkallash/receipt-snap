<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reimbursement_batches', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('batch_number')->unique();
            $table->string('status')->default('pending'); // ReimbursementBatchStatus
            $table->string('payment_method')->default('standard_csv');
            $table->decimal('total_amount', 12, 2)->default(0.00);
            $table->string('currency_code', 3)->default('USD');
            $table->integer('claim_count')->default(0);
            $table->string('payment_reference')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reimbursement_batches');
    }
};
