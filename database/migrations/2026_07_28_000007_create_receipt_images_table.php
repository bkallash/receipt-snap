<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_images', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('expense_id')->constrained('expenses')->cascadeOnDelete();
            $table->string('disk')->default('local');
            $table->string('file_path');
            $table->string('thumbnail_path')->nullable();
            $table->string('preview_path')->nullable();
            $table->string('perceptual_hash', 64)->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('original_filename');
            $table->string('mime_type');
            $table->integer('file_size');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('expense_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_images');
    }
};
