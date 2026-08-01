<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table): void {
            $table->index(['organization_id', 'user_id', 'expense_date', 'status'], 'idx_budget_org_user_date_status');
            $table->index(['organization_id', 'expense_category_id', 'expense_date', 'status'], 'idx_budget_org_cat_date_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table): void {
            $table->dropIndex('idx_budget_org_user_date_status');
            $table->dropIndex('idx_budget_org_cat_date_status');
        });
    }
};
