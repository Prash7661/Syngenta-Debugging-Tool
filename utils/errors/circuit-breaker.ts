// Circuit breaker implementation for resilient service calls

import { 
  CircuitBreakerState, 
  CircuitBreakerConfig, 
  CircuitBreakerMetrics, 
  ErrorType 
} from '../../types'
import { ErrorFactory } from './error-factory'

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED
  private failureCount = 0
  private successCount = 0
  private lastFailureTime?: Date
  private lastSuccessTime?: Date
  private nextAttemptTime?: Date

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN
      } else {
        throw ErrorFactory.createApplicationError(
          ErrorType.INTERNAL_SERVER_ERROR,
          'Circuit breaker is open',
          'CIRCUIT_BREAKER_OPEN',
          { 
            nextAttemptTime: this.nextAttemptTime,
            failureCount: this.failureCount 
          }
        )
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime
    }
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = undefined
    this.nextAttemptTime = undefined
  }

  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN
    this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout)
  }

  forceClose(): void {
    this.state = CircuitBreakerState.CLOSED
    this.failureCount = 0
  }

  private onSuccess(): void {
    this.successCount++
    this.lastSuccessTime = new Date()
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED
      this.failureCount = 0
    }
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = new Date()

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout)
    }
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime ? new Date() >= this.nextAttemptTime : false
  }
}

// Circuit breaker registry for managing multiple circuit breakers
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>()

  getOrCreate(key: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(key)) {
      this.breakers.set(key, new CircuitBreaker(config))
    }
    return this.breakers.get(key)!
  }

  get(key: string): CircuitBreaker | undefined {
    return this.breakers.get(key)
  }

  reset(key: string): boolean {
    const breaker = this.breakers.get(key)
    if (breaker) {
      breaker.reset()
      return true
    }
    return false
  }

  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset())
  }

  getMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {}
    this.breakers.forEach((breaker, key) => {
      metrics[key] = breaker.getMetrics()
    })
    return metrics
  }

  remove(key: string): boolean {
    return this.breakers.delete(key)
  }

  clear(): void {
    this.breakers.clear()
  }
}

// Default circuit breaker configurations
export const defaultCircuitBreakerConfigs = {
  ai_service: {
    failureThreshold: 5,
    recoveryTimeout: 30000, // 30 seconds
    monitoringPeriod: 60000, // 1 minute
    expectedErrors: [ErrorType.AI_SERVICE_ERROR, ErrorType.RATE_LIMIT_ERROR]
  },
  sfmc_api: {
    failureThreshold: 3,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    expectedErrors: [ErrorType.SFMC_API_ERROR, ErrorType.NETWORK_ERROR]
  },
  database: {
    failureThreshold: 2,
    recoveryTimeout: 10000, // 10 seconds
    monitoringPeriod: 30000, // 30 seconds
    expectedErrors: [ErrorType.DATABASE_ERROR]
  }
}

// Global circuit breaker registry
export const globalCircuitBreakerRegistry = new CircuitBreakerRegistry()