// Circuit Breaker Pattern Implementation
// Prevents cascade failures by temporarily stopping calls to failing services
import { logCircuitBreakerExecution, logCircuitBreakerStateChange } from './logger'

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Service failing, block requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening circuit
  recoveryTimeout: number;     // Time in ms before trying half-open
  monitoringPeriod: number;    // Time window in ms for failure counting
  successThreshold: number;    // Number of successes needed to close circuit
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests = 0;
  private totalFailures = 0;
  private totalSuccesses = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        logCircuitBreakerStateChange(this.name, CircuitState.OPEN, CircuitState.HALF_OPEN, 'recovery_timeout_elapsed');
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
      } else {
        logCircuitBreakerExecution(this.name, 'blocked', this.state);
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    logCircuitBreakerExecution(this.name, 'executing', this.state);
    try {
      const result = await operation();
      this.onSuccess();
      logCircuitBreakerExecution(this.name, 'success', this.state);
      return result;
    } catch (error) {
      this.onFailure();
      logCircuitBreakerExecution(this.name, 'failure', this.state);
      throw error;
    }
  }

  private onSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        logCircuitBreakerStateChange(this.name, CircuitState.HALF_OPEN, CircuitState.CLOSED, 'success_threshold_reached');
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      // Go back to open state on failure in half-open
      logCircuitBreakerStateChange(this.name, CircuitState.HALF_OPEN, CircuitState.OPEN, 'failure_in_half_open');
      this.state = CircuitState.OPEN;
      this.successes = 0;
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        logCircuitBreakerStateChange(this.name, CircuitState.CLOSED, CircuitState.OPEN, 'failure_threshold_reached');
        this.state = CircuitState.OPEN;
      }
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.config.recoveryTimeout;
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  // Force state changes for testing/admin purposes
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = Date.now();
  }

  forceClose(): void {
    this.reset();
  }

  forceHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.successes = 0;
  }
}

// Circuit Breaker Registry for managing multiple circuit breakers
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  createOrGet(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, config));
    }
    return this.breakers.get(name)!;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = breaker.getStats();
    }
    return stats;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceClose();
    }
  }
}

// Global registry instance
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

// Default circuit breaker configurations
export const DEFAULT_API_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,      // Open after 5 failures
  recoveryTimeout: 60000,   // Try again after 1 minute
  monitoringPeriod: 60000,  // 1 minute window
  successThreshold: 3,      // Need 3 successes to close
};

export const DEFAULT_DB_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,      // Open after 3 failures
  recoveryTimeout: 30000,   // Try again after 30 seconds
  monitoringPeriod: 30000,  // 30 second window
  successThreshold: 2,      // Need 2 successes to close
};