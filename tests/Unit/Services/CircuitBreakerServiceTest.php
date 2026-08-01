<?php

use App\Enums\CircuitState;
use App\Services\CircuitBreakerService;

beforeEach(function (): void {
    $this->circuitBreaker = new CircuitBreakerService;
    $this->circuitBreaker->reset();
});

it('defaults to closed state', function (): void {
    expect($this->circuitBreaker->getState())->toBe(CircuitState::Closed)
        ->and($this->circuitBreaker->isAvailable())->toBeTrue();
});

it('trips to open state after threshold failures', function (): void {
    for ($i = 0; $i < 5; $i++) {
        $this->circuitBreaker->recordFailure();
    }

    expect($this->circuitBreaker->getState())->toBe(CircuitState::Open)
        ->and($this->circuitBreaker->isAvailable())->toBeFalse();
});

it('resets to closed state on success', function (): void {
    for ($i = 0; $i < 5; $i++) {
        $this->circuitBreaker->recordFailure();
    }

    expect($this->circuitBreaker->getState())->toBe(CircuitState::Open);

    $this->circuitBreaker->recordSuccess();

    expect($this->circuitBreaker->getState())->toBe(CircuitState::Closed)
        ->and($this->circuitBreaker->isAvailable())->toBeTrue();
});
