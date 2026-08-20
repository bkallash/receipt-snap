<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * @property-read string $url
 * @property-read string|null $thumbnail_url
 * @property-read string|null $preview_url
 */
final class ReceiptImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'expense_id',
        'disk',
        'file_path',
        'thumbnail_path',
        'preview_path',
        'perceptual_hash',
        'width',
        'height',
        'original_filename',
        'mime_type',
        'file_size',
        'sort_order',
    ];

    protected function url(): Attribute
    {
        return Attribute::make(
            get: fn (): string => route('portal.receipt-image', ['receiptImage' => $this->id]),
        );
    }

    protected function thumbnailUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->thumbnail_path
                ? Storage::disk($this->disk ?: 'local')->url($this->thumbnail_path)
                : null,
        );
    }

    protected function previewUrl(): Attribute
    {
        return Attribute::make(
            get: fn (): ?string => $this->preview_path
                ? Storage::disk($this->disk ?: 'local')->url($this->preview_path)
                : null,
        );
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }
}
