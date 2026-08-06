<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table): void {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action', 64);
            $table->string('auditable_type');
            $table->unsignedBigInteger('auditable_id');
            $table->jsonb('before_state')->nullable();
            $table->jsonb('after_state')->nullable();
            $table->jsonb('metadata')->nullable();
            $table->string('checksum', 64);
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['organization_id', 'created_at']);
            $table->index(['auditable_type', 'auditable_id']);
            $table->index('actor_id');
            $table->index('action');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('
                CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS TRIGGER AS $$
                BEGIN
                    RAISE EXCEPTION \'Audit log records are immutable. UPDATE and DELETE operations are prohibited.\';
                    RETURN NULL;
                END;
                $$ LANGUAGE plpgsql;
            ');

            DB::statement('
                CREATE TRIGGER audit_logs_immutable_trigger
                    BEFORE UPDATE OR DELETE ON audit_logs
                    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
            ');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP TRIGGER IF EXISTS audit_logs_immutable_trigger ON audit_logs;');
            DB::statement('DROP FUNCTION IF EXISTS prevent_audit_log_mutation();');
        }

        Schema::dropIfExists('audit_logs');
    }
};
