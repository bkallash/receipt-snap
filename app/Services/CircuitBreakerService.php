<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\CircuitState;
use Illuminate\Support\Facades\Cache;

final class CircuitBreakerService
{
    private string $cachePrefix;

    private int $failureThreshold;

    private int $recoveryTimeout;

    public function __construct()
    {
        $this->cachePrefix = (string) config('receipt-snap.circuit_breaker.cache_prefix', 'circuit:ai_receipt');
        $this->failureThreshold = (int) config('receipt-snap.circuit_breaker.failure_threshold', 5);
        $this->recoveryTimeout = (int) config('receipt-snap.circuit_breaker.recovery_timeout', 300);
    }

    public function getState(): CircuitState
    {
        $state = Cache::get("{$this->cachePrefix}:state", CircuitState::Closed->value);

        if ($state === CircuitState::Open->value) {
            $lastFailure = (int) Cache::get("{$this->cachePrefix}:last_failure", 0);
            if (time() - $lastFailure >= $this->recoveryTimeout) {
                $this->setState(CircuitState::HalfOpen);

                return CircuitState::HalfOpen;
            }

            return CircuitState::Open;
        }

        return CircuitState::from($state);
    }

    public function isAvailable(): bool
    {
        return $this->getState() !== CircuitState::Open;
    }

    public function recordSuccess(): void
    {
        Cache::forget("{$this->cachePrefix}:failure_count");
        Cache::forget("{$this->cachePrefix}:last_failure");
        $this->setState(CircuitState::Closed);
    }

    public function recordFailure(): void
    {
        $count = (int) Cache::get("{$this->cachePrefix}:failure_count", 0) + 1;
        Cache::put("{$this->cachePrefix}:failure_count", $count, $this->recoveryTimeout);
        Cache::put("{$this->cachePrefix}:last_failure", time(), $this->recoveryTimeout);

        if ($count >= $this->failureThreshold) {
            $this->setState(CircuitState::Open);
        }
    }

    public function setState(CircuitState $state): void
    {
        Cache::put("{$this->cachePrefix}:state", $state->value, $this->recoveryTimeout);
    }

    public function reset(): void
    {
        Cache::forget("{$this->cachePrefix}:state");
        Cache::forget("{$this->cachePrefix}:failure_count");
        Cache::forget("{$this->cachePrefix}:last_failure");
    }
}
