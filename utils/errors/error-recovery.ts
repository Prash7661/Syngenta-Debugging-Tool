// Error recovery mechanisms with automatic retry logic

import { ApplicationError, ErrorType, RetryConfig, ErrorRecoveryStrategy } from '../../types/errors'
import { logger } from '../logging/logger'
import { CircuitBreaker } from './circuit-breaker'

export interface RecoveryResult<T> {
  success: boolean
  result?: T
  error?: ApplicationError
  attempts: number
  totalDuration: number
  recoveryStrategy?: string
}

export interface RecoveryOptions {
  maxAttempts?: number
  baseDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  jitter?: boolean
  retryableErrors?: ErrorType[]
  fallbackAction?: () => Promise<any>
  circuitBreaker?: CircuitBreaker
  onRetry?: (attempt: number, error: ApplicationError) => void
  onFallback?: (error: ApplicationError) => void
}

export class ErrorRecoveryManager {
  private static readonly DEFAULT_RETRYABLE_ERRORS: ErrorType[] = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.RATE_LIMIT_ERROR,
    ErrorType.SFMC_API_ERROR,
    ErrorType.AI_SERVICE_ERROR,
    ErrorType.DATABASE_ERROR
  ]

  private static readonly DEFAULT_OPTIONS: Required<Omit<RecoveryOptions, 'fallbackAction' | 'circuitBreaker' | 'onRetry' | 'onFallback'>> = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: ErrorRecoveryManager.DEFAULT_RETRYABLE_ERRORS
  }

  /**
   * Execute an operation with automatic retry and recovery
   */
  static async executeWithRecovery<T>(
    operation: () => Promise<T>,
    options: RecoveryOptions = {}
  ): Promise<RecoveryResult<T>> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    const startTime = Date.now()
    let lastError: ApplicationError | null = null
    let attempts = 0

    logger.debug('Starting operation with error recovery', {
      maxAttempts: config.maxAttempts,
      retryableErrors: config.retryableErrors
    })

    for (attempts = 1; attempts <= config.maxAttempts; attempts++) {
      try {
        logger.debug(`Attempt ${attempts}/${config.maxAttempts}`)
        
        // Use circuit breaker if provided
        if (config.circuitBreaker) {
          const result = await config.circuitBreaker.execute(operation)
          return {
            success: true,
            result,
            attempts,
            totalDuration: Date.now() - startTime
          }
        } else {
          const result = await operation()
          return {
            success: true,
            result,
            attempts,
            totalDuration: Date.now() - startTime
          }
        }
      } catch (error) {
        lastError = this.normalizeError(error)
        
        logger.warn(`Attempt ${attempts} failed`, {
          error: lastError,
          attempt: attempts,
          maxAttempts: config.maxAttempts
        })

        // Check if error is retryable
        if (!this.isRetryableError(lastError, config.retryableErrors)) {
          logger.error('Error is not retryable, stopping attempts', { error: lastError })
          break
        }

        // Don't wait after the last attempt
        if (attempts < config.maxAttempts) {
          const delay = this.calculateDelay(attempts, config)
          logger.debug(`Waiting ${delay}ms before retry`)
          
          // Call retry callback if provided
          if (config.onRetry) {
            config.onRetry(attempts, lastError)
          }
          
          await this.sleep(delay)
        }
      }
    }

    // All attempts failed, try fallback if available
    if (config.fallbackAction && lastError) {
      logger.info('Attempting fallback action', { error: lastError })
      
      try {
        if (config.onFallback) {
          config.onFallback(lastError)
        }
        
        const fallbackResult = await config.fallbackAction()
        return {
          success: true,
          result: fallbackResult,
          attempts,
          totalDuration: Date.now() - startTime,
          recoveryStrategy: 'fallback'
        }
      } catch (fallbackError) {
        logger.error('Fallback action also failed', { 
          originalError: lastError,
          fallbackError: this.normalizeError(fallbackError)
        })
      }
    }

    return {
      success: false,
      error: lastError || this.createUnknownError(),
      attempts,
      totalDuration: Date.now() - startTime
    }
  }

  /**
   * Create a recovery strategy based on error type
   */
  static createRecoveryStrategy(errorType: ErrorType): ErrorRecoveryStrategy {
    switch (errorType) {
      case ErrorType.RATE_LIMIT_ERROR:
        return {
          retryable: true,
          maxRetries: 5,
          backoffStrategy: 'exponential',
          baseDelay: 2000,
          maxDelay: 60000
        }

      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return {
          retryable: true,
          maxRetries: 3,
          backoffStrategy: 'exponential',
          baseDelay: 1000,
          maxDelay: 10000
        }

      case ErrorType.SFMC_API_ERROR:
        return {
          retryable: true,
          maxRetries: 3,
          backoffStrategy: 'linear',
          baseDelay: 1500,
          maxDelay: 15000
        }

      case ErrorType.AI_SERVICE_ERROR:
        return {
          retryable: true,
          maxRetries: 2,
          backoffStrategy: 'fixed',
          baseDelay: 3000,
          maxDelay: 3000
        }

      case ErrorType.DATABASE_ERROR:
        return {
          retryable: true,
          maxRetries: 2,
          backoffStrategy: 'exponential',
          baseDelay: 500,
          maxDelay: 5000
        }

      case ErrorType.VALIDATION_ERROR:
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
        return {
          retryable: false
        }

      default:
        return {
          retryable: false
        }
    }
  }

  /**
   * Retry with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    const result = await this.executeWithRecovery(operation, {
      maxAttempts: config.maxAttempts,
      baseDelay: config.baseDelay,
      maxDelay: config.maxDelay,
      backoffMultiplier: config.backoffMultiplier,
      jitter: config.jitter,
      retryableErrors: config.retryableErrors
    })

    if (result.success && result.result !== undefined) {
      return result.result
    }

    throw result.error || this.createUnknownError()
  }

  /**
   * Retry with custom strategy
   */
  static async retryWithStrategy<T>(
    operation: () => Promise<T>,
    strategy: ErrorRecoveryStrategy
  ): Promise<T> {
    if (!strategy.retryable) {
      return operation()
    }

    const result = await this.executeWithRecovery(operation, {
      maxAttempts: strategy.maxRetries || 3,
      baseDelay: strategy.baseDelay || 1000,
      maxDelay: strategy.maxDelay || 30000,
      backoffMultiplier: strategy.backoffStrategy === 'exponential' ? 2 : 1,
      jitter: true,
      fallbackAction: strategy.fallbackAction
    })

    if (result.success && result.result !== undefined) {
      return result.result
    }

    throw result.error || this.createUnknownError()
  }

  /**
   * Create a resilient wrapper for a function
   */
  static createResilientFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: RecoveryOptions = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.executeWithRecovery(
        () => fn(...args),
        options
      )

      if (result.success && result.result !== undefined) {
        return result.result
      }

      throw result.error || this.createUnknownError()
    }
  }

  private static isRetryableError(error: ApplicationError, retryableErrors: ErrorType[]): boolean {
    return retryableErrors.includes(error.type)
  }

  private static calculateDelay(attempt: number, config: Required<Omit<RecoveryOptions, 'fallbackAction' | 'circuitBreaker' | 'onRetry' | 'onFallback'>>): number {
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay)
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }
    
    return Math.floor(delay)
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private static normalizeError(error: any): ApplicationError {
    if (error && typeof error === 'object' && 'type' in error && 'code' in error) {
      return error as ApplicationError
    }

    // Convert standard errors to ApplicationError
    return {
      type: ErrorType.INTERNAL_SERVER_ERROR,
      message: error?.message || 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
      timestamp: new Date(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  private static createUnknownError(): ApplicationError {
    return {
      type: ErrorType.INTERNAL_SERVER_ERROR,
      message: 'Unknown error occurred during recovery',
      code: 'RECOVERY_FAILED',
      timestamp: new Date(),
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }
}

// Convenience functions for common retry patterns
export const retryNetworkOperation = <T>(operation: () => Promise<T>): Promise<T> =>
  ErrorRecoveryManager.retryWithBackoff(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR]
  })

export const retryApiCall = <T>(operation: () => Promise<T>): Promise<T> =>
  ErrorRecoveryManager.retryWithBackoff(operation, {
    maxAttempts: 3,
    baseDelay: 1500,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [ErrorType.SFMC_API_ERROR, ErrorType.NETWORK_ERROR, ErrorType.RATE_LIMIT_ERROR]
  })

export const retryAIOperation = <T>(operation: () => Promise<T>): Promise<T> =>
  ErrorRecoveryManager.retryWithBackoff(operation, {
    maxAttempts: 2,
    baseDelay: 3000,
    maxDelay: 3000,
    backoffMultiplier: 1,
    jitter: false,
    retryableErrors: [ErrorType.AI_SERVICE_ERROR, ErrorType.RATE_LIMIT_ERROR]
  })