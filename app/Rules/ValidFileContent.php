<?php

declare(strict_types=1);

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

final class ValidFileContent implements ValidationRule
{
    /**
     * @param  array<string>  $allowedTypes  e.g. ['jpeg', 'png', 'pdf', 'heic']
     */
    public function __construct(
        private readonly array $allowedTypes = ['jpeg', 'png', 'pdf', 'heic'],
    ) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            $fail("The {$attribute} must be a valid uploaded file.");

            return;
        }

        $path = $value->getRealPath();
        if (! $path || ! file_exists($path)) {
            $fail("The {$attribute} file is inaccessible.");

            return;
        }

        $handle = fopen($path, 'rb');
        if (! $handle) {
            $fail("Unable to read {$attribute} file.");

            return;
        }

        $bytes = fread($handle, 32);
        fclose($handle);

        if ($bytes === false) {
            $fail("Failed reading header bytes for {$attribute}.");

            return;
        }

        if (! $this->isValidHeader($bytes)) {
            $fail("The file content of {$attribute} does not match allowed format (JPEG, PNG, PDF, HEIC).");
        }
    }

    private function isValidHeader(string $bytes): bool
    {
        // JPEG magic bytes: \xFF\xD8\xFF
        if (in_array('jpeg', $this->allowedTypes, true) && str_starts_with($bytes, "\xFF\xD8\xFF")) {
            return true;
        }

        // PNG magic bytes: \x89PNG\r\n\x1a\n
        if (in_array('png', $this->allowedTypes, true) && str_starts_with($bytes, "\x89PNG\r\n\x1a\n")) {
            return true;
        }

        // PDF magic bytes: %PDF-
        if (in_array('pdf', $this->allowedTypes, true) && str_starts_with($bytes, '%PDF-')) {
            return true;
        }

        // HEIC signature: contains ftyp starting at index 4
        if (in_array('heic', $this->allowedTypes, true) && strlen($bytes) >= 12) {
            $ftyp = substr($bytes, 4, 4);
            $brand = substr($bytes, 8, 4);
            if ($ftyp === 'ftyp' && in_array($brand, ['heic', 'heix', 'mif1', 'msf1', 'hevc', 'hevx'], true)) {
                return true;
            }
        }

        return false;
    }
}
