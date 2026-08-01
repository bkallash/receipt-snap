<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\ReceiptImage;
use Illuminate\Support\Facades\Storage;

final class ReceiptStorageService
{
    /**
     * Store an uploaded receipt image to the configured disk and return metadata.
     *
     * @return array{
     *     disk: string,
     *     file_path: string,
     *     thumbnail_path: ?string,
     *     preview_path: ?string,
     *     perceptual_hash: ?string,
     *     width: ?int,
     *     height: ?int,
     *     original_filename: string,
     *     mime_type: string,
     *     file_size: int
     * }
     */
    public function storeReceiptImage(mixed $file, int $organizationId): array
    {
        $disk = (string) config('receipt-snap.storage.disk', 'local');
        $pathPrefix = (string) config('receipt-snap.storage.path_prefix', 'receipts');

        // Safely determine file size without triggering Flysystem UnableToRetrieveMetadata
        $fileSize = 0;
        $realPath = method_exists($file, 'getRealPath') ? $file->getRealPath() : null;

        if ($realPath && file_exists($realPath)) {
            $fileSize = @filesize($realPath) ?: 0;
        } else {
            try {
                $fileSize = method_exists($file, 'getSize') ? ($file->getSize() ?: 0) : 0;
            } catch (\Throwable) {
                $fileSize = 0;
            }
        }

        $mimeType = 'image/jpeg';
        try {
            $mimeType = method_exists($file, 'getClientMimeType') ? $file->getClientMimeType() : 'image/jpeg';
        } catch (\Throwable) {
            $mimeType = 'image/jpeg';
        }

        $originalName = 'receipt.jpg';
        try {
            $originalName = method_exists($file, 'getClientOriginalName') ? $file->getClientOriginalName() : 'receipt.jpg';
        } catch (\Throwable) {
            $originalName = 'receipt.jpg';
        }

        $perceptualHash = null;
        $width = null;
        $height = null;

        if ($realPath && file_exists($realPath)) {
            $fileContent = @file_get_contents($realPath);
            $perceptualHash = $fileContent ? hash('sha256', $fileContent) : null;

            $imageSize = @getimagesize($realPath);
            if ($imageSize !== false) {
                $width = $imageSize[0];
                $height = $imageSize[1];
            }
        }

        $storedPath = $file->store("{$pathPrefix}/{$organizationId}", $disk);

        return [
            'disk' => $disk,
            'file_path' => $storedPath,
            'thumbnail_path' => null,
            'preview_path' => null,
            'perceptual_hash' => $perceptualHash,
            'width' => $width,
            'height' => $height,
            'original_filename' => $originalName,
            'mime_type' => $mimeType,
            'file_size' => $fileSize,
        ];
    }

    public function generateSignedUrl(string $path, ?string $disk = null, int $expiryMinutes = 15): string
    {
        $targetDisk = $disk ?: (string) config('receipt-snap.storage.disk', 'local');
        $storage = Storage::disk($targetDisk);

        if (method_exists($storage, 'temporaryUrl')) {
            try {
                return $storage->temporaryUrl($path, now()->addMinutes($expiryMinutes));
            } catch (\Throwable) {
                return $storage->url($path);
            }
        }

        return $storage->url($path);
    }

    public function deleteReceiptImage(ReceiptImage $image): void
    {
        $storage = Storage::disk($image->disk ?: 'local');

        if ($image->file_path && $storage->exists($image->file_path)) {
            $storage->delete($image->file_path);
        }

        if ($image->thumbnail_path && $storage->exists($image->thumbnail_path)) {
            $storage->delete($image->thumbnail_path);
        }

        if ($image->preview_path && $storage->exists($image->preview_path)) {
            $storage->delete($image->preview_path);
        }

        $image->delete();
    }
}
