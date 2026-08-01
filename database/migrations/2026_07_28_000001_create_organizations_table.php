<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->index(); // Non-unique index for performance (Fix D)
            $table->string('plan_tier')->default('pro');
            $table->string('logo_path')->nullable();
            $table->json('settings')->nullable();
            $table->unsignedInteger('ai_scans_used_this_month')->default(0);
            $table->unsignedInteger('ai_scan_monthly_limit')->nullable();
            $table->timestamp('ai_scans_reset_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
