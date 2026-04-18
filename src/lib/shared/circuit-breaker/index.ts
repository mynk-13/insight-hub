type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number; // ms before attempting half-open
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureAt: number | null;
}

export class CircuitBreaker<T> {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailureAt: number | null = null;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 30_000,
    },
  ) {}

  async execute(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - (this.lastFailureAt ?? 0) >= this.options.timeout) {
        this.state = "half-open";
        this.successes = 0;
      } else {
        throw new Error(`Circuit breaker [${this.name}] is open`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === "half-open") {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.state = "closed";
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureAt = Date.now();
    if (this.failures >= this.options.failureThreshold) {
      this.state = "open";
    }
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureAt: this.lastFailureAt,
    };
  }

  reset() {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    this.lastFailureAt = null;
  }
}
