<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('expense_categories', function (Blueprint $table): void {
            $table->string('gl_code')->nullable()->after('name');
            $table->decimal('default_tax_rate', 5, 2)->nullable()->after('gl_code');
            $table->boolean('requires_itemized_tax')->default(false)->after('default_tax_rate');
        });

        Schema::table('expenses', function (Blueprint $table): void {
            $table->foreignId('reimbursement_batch_id')->nullable()->after('expense_category_id')
                ->constrained('reimbursement_batches')->nullOnDelete();
            $table->string('payment_reference')->nullable()->after('reimimbursed_at' ?? 'reimbursed_at');
            $table->string('transaction_hash')->nullable()->after('payment_reference');
            $table->string('payment_voucher_path')->nullable()->after('transaction_hash');
            $table->boolean('tax_verified')->default(false)->after('payment_voucher_path');
            $table->string('merchant_vat_id')->nullable()->after('tax_verified');
        });
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table): void {
            $table->dropForeign(['reimbursement_batch_id']);
            $table->dropColumn([
                'reimbursement_batch_id',
                'payment_reference',
                'transaction_hash',
                'payment_voucher_path',
                'tax_verified',
                'merchant_vat_id',
            ]);
        });

        Schema::table('expense_categories', function (Blueprint $table): void {
            $table->dropColumn(['gl_code', 'default_tax_rate', 'requires_itemized_tax']);
        });
    }
};
