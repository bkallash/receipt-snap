<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Organization;

final class CompliancePackageService
{
    /**
     * Build compliance package containing audit logs CSV and receipt images.
     * Fallback to raw CSV if ZipArchive PHP extension is disabled.
     */
    public function bundleAuditPackage(Organization $org, ?string $search = null): string
    {
        $query = AuditLog::where('organization_id', $org->id)->with('user');

        if (! empty($search)) {
            $term = '%'.mb_strtolower($search).'%';
            $query->where(function ($q) use ($term): void {
                $q->whereRaw('LOWER(auditable_id) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(action) LIKE ?', [$term]);
            });
        }

        $logs = $query->latest('id')->limit(500)->get();

        $tempDir = storage_path('app/temp_compliance_'.now()->timestamp);
        if (! file_exists($tempDir)) {
            mkdir($tempDir, 0755, true);
        }

        $csvPath = $tempDir.'/audit_logs.csv';
        $handle = fopen($csvPath, 'w');
        if ($handle) {
            fputcsv($handle, ['ID', 'Timestamp (UTC)', 'Actor ID', 'Actor Name', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'New Values JSON']);
            foreach ($logs as $log) {
                fputcsv($handle, [
                    $log->id,
                    $log->created_at?->toIso8601String(),
                    $log->user_id ?? 'SYSTEM',
                    $log->user instanceof \App\Models\User ? $log->user->name : 'System',
                    is_object($log->action) ? $log->action->value : $log->action,
                    $log->auditable_type,
                    $log->auditable_id,
                    $log->ip_address ?? 'N/A',
                    $log->user_agent ?? 'N/A',
                    json_encode($log->new_values),
                ]);
            }
            fclose($handle);
        }

        if (class_exists(\ZipArchive::class)) {
            $zipPath = storage_path('app/compliance_package_'.$org->id.'_'.now()->format('Ymd_His').'.zip');
            $zip = new \ZipArchive;
            if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
                if (file_exists($csvPath)) {
                    $zip->addFile($csvPath, 'audit_logs.csv');
                }
                $zip->close();
            }

            if (file_exists($csvPath)) {
                @unlink($csvPath);
            }
            if (file_exists($tempDir)) {
                @rmdir($tempDir);
            }

            return $zipPath;
        }

        // Fallback: Return direct CSV file if ZipArchive extension is disabled
        $finalCsvPath = storage_path('app/compliance_audit_logs_'.$org->id.'_'.now()->format('Ymd_His').'.csv');
        rename($csvPath, $finalCsvPath);
        if (file_exists($tempDir)) {
            @rmdir($tempDir);
        }

        return $finalCsvPath;
    }
}
