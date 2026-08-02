<?php

return [
    'storage' => [
        'disk' => env('RECEIPT_STORAGE_DISK', 'local'),
        'path_prefix' => 'receipts',
        'signed_url_ttl' => 15,
        'max_file_size' => 10 * 1024 * 1024, // 10MB
    ],

    'default_currency' => env('RECEIPT_DEFAULT_CURRENCY', 'USD'),

    'ai' => [
        'provider' => env('RECEIPT_AI_PROVIDER', 'gemini'),
        'model' => env('RECEIPT_AI_MODEL', 'gemini-3.5-flash-lite'),
        'confidence_threshold' => 70.0,
        'max_retries' => 3,
        'retry_backoff' => [10, 20, 40],
    ],

    'circuit_breaker' => [
        'failure_threshold' => 5,
        'recovery_timeout' => 300, // 5 minutes
        'cache_prefix' => 'circuit:ai_receipt',
    ],

    'quota' => [
        'free_monthly_limit' => 50,
        'cache_prefix' => 'ai_quota',
    ],

    'duplicate_detection' => [
        'hamming_threshold' => 10,
        'data_match_window_days' => 30,
    ],

    'policies' => [
        'require_receipt_threshold_amount' => (float) env('RECEIPT_REQUIRE_THRESHOLD', 25.00),
        'flag_weekend_transactions' => (bool) env('RECEIPT_FLAG_WEEKENDS', true),
        'strict_budget_enforcement' => (bool) env('RECEIPT_STRICT_BUDGET', false),
    ],
];
