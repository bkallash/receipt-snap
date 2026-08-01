<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

final class EnsureIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $idempotencyKey = $request->header('X-Idempotency-Key');

        if (! $idempotencyKey || ! $request->isMethodIdempotent() && ! $request->isMethod('POST')) {
            return $next($request);
        }

        $user = $request->user();
        $userId = $user ? $user->id : 'guest';
        $orgId = session('current_organization_id', 'no-org');

        $hash = hash('sha256', "idempotency:{$userId}:{$orgId}:{$idempotencyKey}");
        $cacheKey = "idempotency:response:{$hash}";
        $lockKey = "idempotency:lock:{$hash}";

        // Check if response is cached
        if ($cachedResponse = Cache::get($cacheKey)) {
            return response()->json(
                $cachedResponse['body'],
                $cachedResponse['status'],
                array_merge($cachedResponse['headers'], ['X-Cache' => 'Idempotent-Hit'])
            );
        }

        // Acquire atomic lock to prevent concurrent duplicates
        $lock = Cache::lock($lockKey, 10);

        if (! $lock->get()) {
            return response()->json([
                'message' => 'A request with this X-Idempotency-Key is currently being processed.',
            ], Response::HTTP_CONFLICT);
        }

        try {
            $response = $next($request);

            // Cache successful or client-error JSON responses for 24 hours (86400 seconds)
            if ($response->getStatusCode() < 500 && str_contains((string) $response->headers->get('Content-Type'), 'json')) {
                $content = json_decode($response->getContent() ?: '{}', true);
                Cache::put($cacheKey, [
                    'status' => $response->getStatusCode(),
                    'body' => $content,
                    'headers' => [
                        'Content-Type' => 'application/json',
                    ],
                ], 86400);
            }

            return $response;
        } finally {
            $lock->release();
        }
    }
}
