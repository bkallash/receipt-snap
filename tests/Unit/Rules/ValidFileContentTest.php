<?php

use App\Rules\ValidFileContent;
use Illuminate\Http\UploadedFile;

it('accepts genuine jpeg header bytes', function (): void {
    $file = UploadedFile::fake()->createWithContent('test.jpg', "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00");
    $rule = new ValidFileContent(['jpeg']);
    $failed = false;

    $rule->validate('receipt', $file, function () use (&$failed): void {
        $failed = true;
    });

    expect($failed)->toBeFalse();
});

it('rejects spoofed extension with invalid magic bytes', function (): void {
    $file = UploadedFile::fake()->createWithContent('test.jpg', 'invalid header text');
    $rule = new ValidFileContent(['jpeg']);
    $failed = false;

    $rule->validate('receipt', $file, function () use (&$failed): void {
        $failed = true;
    });

    expect($failed)->toBeTrue();
});
