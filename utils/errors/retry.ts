// Retry mechanism with exponential backoff

import { RetryConfig, ErrorType } from '../../types'
import { ErrorFactory } from './error-factory'

export class RetryManager {
  private static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.RATE_LIMIT_ERROR,
      ErrorType.SFMC_API_ERROR,
      ErrorType.AI_SERVICE_ERROR
    ]
  }

  static async execute<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    let lastError: Error
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry if this is the last attempt
        if (attempt === finalConfig.maxAttempts) {
          break
        }
        
        // Don't retry if error is not retryable
        if (!this.isRetryableError(error, finalConfig.retryableErrors)) {
          break
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, finalConfig)
        await this.sleep(delay)
      }
    }
    
    throw lastError!
  }

  static async executeWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    return this.execute(operation, {
      maxAttempts,
      baseDelay,
      backoffMultiplier: 2,
      jitter: true
    })
  }

  private static isRetryableError(error: any, retryableErrors: ErrorType[]): boolean {
    // Check if it's an ApplicationError with retryable type
    if (error && typeof error === 'object' && 'type' in error) {
      return retryableErrors.includes(error.type)
    }
    
    // Check common error patterns
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      
      // Network-related errors
      if (message.includes('network') || 
          message.includes('timeout') || 
          message.includes('connection') ||
          message.includes('econnreset') ||
          message.includes('enotfound')) {
        return true
      }
      
      // Rate limiting
      if (message.includes('rate limit') || 
          message.includes('too many requests')) {
        return true
      }
      
      // Temporary server errors
      if (message.includes('502') || 
          message.includes('503') || 
          message.includes('504')) {
        return true
      }
    }
    
    return false
  }

  private static calculateDelay(attempt: number, config: RetryConfig): number {
    // Calculate exponential backoff delay
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
}

// Decorator for automatic retry
export function Retryable(config?: Partial<RetryConfig>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      return RetryManager.execute(() => method.apply(this, args), config)
    }

    return descriptor
  }
}

// Utility functions for common retry scenarios
export const retryUtils = {
  // Retry with exponential backoff for API calls
  async apiCall<T>(operation: () => Promise<T>): Promise<T> {
    return RetryManager.execute(operation, {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableErrors: [
        ErrorType.NETWORK_ERROR,
        ErrorType.TIMEOUT_ERROR,
        ErrorType.SFMC_API_ERROR
      ]
    })
  },

  // Retry with shorter delays for database operations
  async databaseOperation<T>(operation: () => Promise<T>): Promise<T> {
    return RetryManager.execute(operation, {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 2000,
      retryableErrors: [ErrorType.DATABASE_ERROR]
    })
  },

  // Retry with longer delays for AI service calls
  async aiServiceCall<T>(operation: () => Promise<T>): Promise<T> {
    return RetryManager.execute(operation, {
      maxAttempts: 4,
      baseDelay: 2000,
      maxDelay: 30000,
      retryableErrors: [
        ErrorType.AI_SERVICE_ERROR,
        ErrorType.RATE_LIMIT_ERROR,
        ErrorType.NETWORK_ERROR
      ]
    })
  },

  // Custom retry for rate-limited operations
  async rateLimitedOperation<T>(operation: () => Promise<T>): Promise<T> {
    return RetryManager.execute(operation, {
      maxAttempts: 5,
      baseDelay: 5000,
      maxDelay: 60000,
      backoffMultiplier: 1.5,
      retryableErrors: [ErrorType.RATE_LIMIT_ERROR]
    })
  }
}