// Rate limiting middleware for API calls

import { ErrorFactory } from '../errors/error-factory'
import { ErrorType } from '../../types/errors'

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (context: any) => string // Function to generate rate limit key
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  onLimitReached?: (key: string, limit: RateLimitInfo) => void
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  resetTime: Date
  retryAfter?: number
}

export interface RateLimitEntry {
  count: number
  resetTime: Date
  firstRequest: Date
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private cleanupInterval?: NodeJS.Timeout

  constructor(private config: RateLimitConfig) {
    // Start cleanup interval to remove expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, Math.min(this.config.windowMs, 60000)) // Cleanup every minute or window, whichever is smaller
  }

  /**
   * Check if request is allowed and update counters
   */
  async checkLimit(key?: string, context?: any): Promise<RateLimitInfo> {
    const limitKey = key || this.generateKey(context)
    const now = new Date()
    
    let entry = this.store.get(limitKey)
    
    // Create new entry if doesn't exist or window has expired
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: new Date(now.getTime() + this.config.windowMs),
        firstRequest: now
      }
      this.store.set(limitKey, entry)
    }

    // Check if limit exceeded
    if (entry.count >= this.config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime.getTime() - now.getTime()) / 1000)
      
      const limitInfo: RateLimitInfo = {
        limit: this.config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter
      }

      if (this.config.onLimitReached) {
        this.config.onLimitReached(limitKey, limitInfo)
      }

      throw ErrorFactory.createApplicationError(
        ErrorType.RATE_LIMIT_ERROR,
        'Rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        {
          limit: this.config.maxRequests,
          retryAfter,
          resetTime: entry.resetTime
        }
      )
    }

    // Increment counter
    entry.count++
    
    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  getStatus(key?: string, context?: any): RateLimitInfo {
    const limitKey = key || this.generateKey(context)
    const entry = this.store.get(limitKey)
    const now = new Date()

    if (!entry || now >= entry.resetTime) {
      return {
        limit: this.config.maxRequests,
        remaining: this.config.maxRequests,
        resetTime: new Date(now.getTime() + this.config.windowMs)
      }
    }

    return {
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      retryAfter: entry.count >= this.config.maxRequests 
        ? Math.ceil((entry.resetTime.getTime() - now.getTime()) / 1000)
        : undefined
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key?: string, context?: any): void {
    const limitKey = key || this.generateKey(context)
    this.store.delete(limitKey)
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.store.clear()
  }

  /**
   * Get all current rate limit statuses
   */
  getAllStatuses(): Record<string, RateLimitInfo> {
    const statuses: Record<string, RateLimitInfo> = {}
    const now = new Date()

    this.store.forEach((entry, key) => {
      if (now < entry.resetTime) {
        statuses[key] = {
          limit: this.config.maxRequests,
          remaining: Math.max(0, this.config.maxRequests - entry.count),
          resetTime: entry.resetTime
        }
      }
    })

    return statuses
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = new Date()
    const keysToDelete: string[] = []

    this.store.forEach((entry, key) => {
      if (now >= entry.resetTime) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach(key => this.store.delete(key))
  }

  /**
   * Generate rate limit key
   */
  private generateKey(context?: any): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(context)
    }
    
    // Default key generation
    if (context?.userId) {
      return `user:${context.userId}`
    }
    
    if (context?.ip) {
      return `ip:${context.ip}`
    }
    
    return 'global'
  }

  /**
   * Destroy rate limiter and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    this.store.clear()
  }
}

// Rate limiter registry for managing multiple rate limiters
export class RateLimiterRegistry {
  private limiters = new Map<string, RateLimiter>()

  /**
   * Get or create rate limiter
   */
  getOrCreate(name: string, config: RateLimitConfig): RateLimiter {
    if (!this.limiters.has(name)) {
      this.limiters.set(name, new RateLimiter(config))
    }
    return this.limiters.get(name)!
  }

  /**
   * Get existing rate limiter
   */
  get(name: string): RateLimiter | undefined {
    return this.limiters.get(name)
  }

  /**
   * Remove rate limiter
   */
  remove(name: string): boolean {
    const limiter = this.limiters.get(name)
    if (limiter) {
      limiter.destroy()
      return this.limiters.delete(name)
    }
    return false
  }

  /**
   * Get all rate limiter statuses
   */
  getAllStatuses(): Record<string, Record<string, RateLimitInfo>> {
    const allStatuses: Record<string, Record<string, RateLimitInfo>> = {}
    
    this.limiters.forEach((limiter, name) => {
      allStatuses[name] = limiter.getAllStatuses()
    })
    
    return allStatuses
  }

  /**
   * Reset all rate limiters
   */
  resetAll(): void {
    this.limiters.forEach(limiter => limiter.resetAll())
  }

  /**
   * Destroy all rate limiters
   */
  destroyAll(): void {
    this.limiters.forEach(limiter => limiter.destroy())
    this.limiters.clear()
  }
}

// Predefined rate limiter configurations
export const rateLimitConfigs = {
  // SFMC API rate limiting (2500 requests per hour)
  sfmcApi: {
    windowMs: 3600000, // 1 hour
    maxRequests: 2500,
    keyGenerator: (context: any) => `sfmc:${context?.subdomain || 'default'}`
  },

  // AI service rate limiting (more generous for internal use)
  aiService: {
    windowMs: 60000, // 1 minute
    maxRequests: 60,
    keyGenerator: (context: any) => `ai:${context?.userId || context?.ip || 'anonymous'}`
  },

  // General API rate limiting per user
  userApi: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    keyGenerator: (context: any) => `user:${context?.userId || context?.ip || 'anonymous'}`
  },

  // Strict rate limiting for authentication attempts
  auth: {
    windowMs: 900000, // 15 minutes
    maxRequests: 5,
    keyGenerator: (context: any) => `auth:${context?.ip || 'unknown'}`
  }
}

// Global rate limiter registry
export const globalRateLimiterRegistry = new RateLimiterRegistry()

// Utility functions
export const rateLimitUtils = {
  /**
   * Create middleware function for Express-like frameworks
   */
  createMiddleware(limiterName: string, config: RateLimitConfig) {
    const limiter = globalRateLimiterRegistry.getOrCreate(limiterName, config)
    
    return async (req: any, res: any, next: any) => {
      try {
        const context = {
          userId: req.user?.id,
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers?.['user-agent']
        }
        
        const limitInfo = await limiter.checkLimit(undefined, context)
        
        // Add rate limit headers to response
        if (res.setHeader) {
          res.setHeader('X-RateLimit-Limit', limitInfo.limit)
          res.setHeader('X-RateLimit-Remaining', limitInfo.remaining)
          res.setHeader('X-RateLimit-Reset', Math.ceil(limitInfo.resetTime.getTime() / 1000))
        }
        
        next()
      } catch (error) {
        if (res.status && res.json) {
          res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: (error as any).details?.retryAfter
          })
        } else {
          next(error)
        }
      }
    }
  },

  /**
   * Check rate limit for a specific service
   */
  async checkServiceLimit(serviceName: string, context?: any): Promise<RateLimitInfo> {
    const config = rateLimitConfigs[serviceName as keyof typeof rateLimitConfigs]
    if (!config) {
      throw new Error(`Unknown service for rate limiting: ${serviceName}`)
    }
    
    const limiter = globalRateLimiterRegistry.getOrCreate(serviceName, config)
    return limiter.checkLimit(undefined, context)
  }
}