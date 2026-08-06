<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_aggregates', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('aggregate_type', 32);
            $table->unsignedBigInteger('aggregate_id')->nullable();
            $table->string('period', 16);
            $table->date('period_start');
            $table->date('period_end');
            $table->string('currency_code', 3)->default('USD');

            $table->unsignedInteger('total_count')->default(0);
            $table->unsignedInteger('draft_count')->default(0);
            $table->unsignedInteger('submitted_count')->default(0);
            $table->unsignedInteger('approved_count')->default(0);
            $table->unsignedInteger('rejected_count')->default(0);
            $table->unsignedInteger('reimbursed_count')->default(0);

            $table->decimal('total_amount', 14, 2)->default(0.00);
            $table->decimal('approved_amount', 14, 2)->default(0.00);
            $table->decimal('pending_amount', 14, 2)->default(0.00);
            $table->decimal('rejected_amount', 14, 2)->default(0.00);

            $table->unsignedInteger('flagged_count')->default(0);
            $table->decimal('avg_amount', 14, 2)->default(0.00);
            $table->decimal('max_amount', 14, 2)->default(0.00);

            $table->timestamps();

            $table->unique(
                ['organization_id', 'aggregate_type', 'aggregate_id', 'period', 'period_start', 'currency_code'],
                'expense_aggregates_unique'
            );

            $table->index(['organization_id', 'period_start']);
            $table->index(['aggregate_type', 'aggregate_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_aggregates');
    }
};
