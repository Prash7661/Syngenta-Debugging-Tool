// Comprehensive monitoring middleware that integrates metrics collection, error tracking, and performance monitoring

import { NextRequest, NextResponse } from 'next/server'
import { metricsCollector } from '../utils/monitoring/metrics-collector'
import { errorRateTracker } from '../utils/monitoring/error-rate-tracker'
import { logger, createRequestLogger } from '../utils/logging/logger'
import { ApplicationError } from '../types/errors'

export interface MonitoringConfig {
  enableMetrics: boolean
  enableErrorTracking: boolean
  enablePerformanceMonitoring: boolean
  enableRequestTracing: boolean
  slowRequestThreshold: number // milliseconds
  excludePaths: string[]
}

export class MonitoringMiddleware {
  private config: MonitoringConfig

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enableMetrics: true,
      enableErrorTracking: true,
      enablePerformanceMonitoring: true,
      enableRequestTracing: true,
      slowRequestThreshold: 2000, // 2 seconds
      excludePaths: ['/api/health', '/favicon.ico', '/_next'],
      ...config
    }
  }

  /**
   * Wrap an API route handler with comprehensive monitoring
   */
  wrapHandler<T = any>(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
  ) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const startTime = Date.now()
      const requestId = this.generateRequestId()
      const requestLogger = createRequestLogger(requestId)
      
      // Check if this path should be excluded from monitoring
      if (this.shouldExcludePath(request.url)) {
        return handler(request, context)
      }

      let response: NextResponse
      let error: Error | null = null

      try {
        // Start request monitoring
        if (this.config.enableRequestTracing) {
          this.startRequestMonitoring(request, requestId, requestLogger)
        }

        // Record request start
        if (this.config.enableMetrics) {
          errorRateTracker.recordRequest()
        }

        // Execute the handler
        response = await handler(request, context)

        // Record successful request metrics
        if (this.config.enableMetrics) {
          this.recordRequestMetrics(request, response, startTime, requestId)
        }

      } catch (err) {
        error = err as Error
        
        // Create error response
        response = this.createErrorResponse(error, requestId)
        
        // Record error metrics
        if (this.config.enableErrorTracking && this.isApplicationError(error)) {
          this.recordErrorMetrics(error as ApplicationError, request, requestId)
        }
      } finally {
        // Complete request monitoring
        if (this.config.enableRequestTracing) {
          this.completeRequestMonitoring(
            request, 
            response, 
            startTime, 
            requestId, 
            requestLogger, 
            error
          )
        }

        // Check for slow requests
        if (this.config.enablePerformanceMonitoring) {
          this.checkSlowRequest(request, startTime, requestId)
        }
      }

      return response
    }
  }

  /**
   * Monitor a specific operation with performance tracking
   */
  async monitorOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now()
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    logger.debug(`Starting monitored operation: ${operationName}`, {
      operationId,
      context
    })

    try {
      const result = await operation()
      const duration = Date.now() - startTime

      // Record successful operation metrics
      if (this.config.enableMetrics) {
        metricsCollector.recordMetric({
          name: 'operation_duration',
          value: duration,
          unit: 'ms',
          timestamp: new Date(),
          tags: {
            operation: operationName,
            status: 'success',
            ...context
          }
        })
      }

      logger.debug(`Operation completed successfully: ${operationName}`, {
        operationId,
        duration,
        context
      })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      // Record failed operation metrics
      if (this.config.enableMetrics) {
        metricsCollector.recordMetric({
          name: 'operation_duration',
          value: duration,
          unit: 'ms',
          timestamp: new Date(),
          tags: {
            operation: operationName,
            status: 'error',
            error_type: (error as Error).name,
            ...context
          }
        })
      }

      logger.error(`Operation failed: ${operationName}`, error, {
        operationId,
        duration,
        context
      })

      throw error
    }
  }

  /**
   * Record custom business metrics
   */
  recordBusinessMetric(
    name: string,
    value: number,
    unit: string = 'count',
    tags?: Record<string, string>
  ): void {
    if (!this.config.enableMetrics) return

    metricsCollector.recordMetric({
      name: `business_${name}`,
      value,
      unit,
      timestamp: new Date(),
      tags: {
        type: 'business',
        ...tags
      }
    })

    logger.info('Business metric recorded', { name, value, unit, tags })
  }

  /**
   * Record user action metrics
   */
  recordUserAction(
    action: string,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enableMetrics) return

    metricsCollector.recordMetric({
      name: 'user_action',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      tags: {
        action,
        user_id: userId || 'anonymous',
        session_id: sessionId || 'unknown'
      },
      context: metadata
    })

    logger.info('User action recorded', { action, userId, sessionId, metadata })
  }

  private startRequestMonitoring(
    request: NextRequest,
    requestId: string,
    requestLogger: typeof logger
  ): void {
    const url = new URL(request.url)
    
    requestLogger.startRequest(
      requestId,
      request.method,
      url.pathname,
      this.extractUserId(request)
    )

    // Add request breadcrumb
    requestLogger.addBreadcrumb({
      timestamp: new Date(),
      message: `Request started: ${request.method} ${url.pathname}`,
      category: 'request',
      level: 'info',
      data: {
        method: request.method,
        url: url.pathname,
        userAgent: request.headers.get('user-agent'),
        ip: this.getClientIP(request)
      }
    })
  }

  private completeRequestMonitoring(
    request: NextRequest,
    response: NextResponse,
    startTime: number,
    requestId: string,
    requestLogger: typeof logger,
    error: Error | null
  ): void {
    const duration = Date.now() - startTime
    
    requestLogger.endRequest(requestId, response.status, duration, error)

    // Log performance information
    requestLogger.logPerformance('request_processing', duration, {
      method: request.method,
      url: new URL(request.url).pathname,
      status: response.status,
      error: error?.message
    })
  }

  private recordRequestMetrics(
    request: NextRequest,
    response: NextResponse,
    startTime: number,
    requestId: string
  ): void {
    const duration = Date.now() - startTime
    const url = new URL(request.url)

    // Record request duration
    metricsCollector.recordMetric({
      name: 'request_duration',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        method: request.method,
        endpoint: url.pathname,
        status: response.status.toString(),
        status_class: this.getStatusClass(response.status)
      }
    })

    // Record request count
    metricsCollector.recordMetric({
      name: 'request_count',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      tags: {
        method: request.method,
        endpoint: url.pathname,
        status: response.status.toString()
      }
    })

    // Record the request for metrics collector
    metricsCollector.recordRequest({
      timestamp: new Date(),
      method: request.method,
      endpoint: url.pathname,
      statusCode: response.status,
      duration,
      service: this.inferServiceFromPath(url.pathname)
    })
  }

  private recordErrorMetrics(
    error: ApplicationError,
    request: NextRequest,
    requestId: string
  ): void {
    // Record error in metrics collector
    metricsCollector.recordError(error)

    // Record error in error rate tracker
    errorRateTracker.recordError(error)

    // Record error metric
    metricsCollector.recordMetric({
      name: 'error_count',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      tags: {
        error_type: error.type,
        error_code: error.code,
        method: request.method,
        endpoint: new URL(request.url).pathname
      }
    })
  }

  private checkSlowRequest(
    request: NextRequest,
    startTime: number,
    requestId: string
  ): void {
    const duration = Date.now() - startTime
    
    if (duration > this.config.slowRequestThreshold) {
      const url = new URL(request.url)
      
      logger.warn('Slow request detected', {
        requestId,
        method: request.method,
        url: url.pathname,
        duration,
        threshold: this.config.slowRequestThreshold
      })

      // Record slow request metric
      metricsCollector.recordMetric({
        name: 'slow_request',
        value: 1,
        unit: 'count',
        timestamp: new Date(),
        tags: {
          method: request.method,
          endpoint: url.pathname,
          duration: duration.toString()
        }
      })
    }
  }

  private createErrorResponse(error: Error, requestId: string): NextResponse {
    return NextResponse.json({
      error: {
        message: 'Internal server error',
        requestId,
        timestamp: new Date().toISOString()
      }
    }, { 
      status: 500,
      headers: {
        'X-Request-ID': requestId
      }
    })
  }

  private shouldExcludePath(url: string): boolean {
    const pathname = new URL(url).pathname
    return this.config.excludePaths.some(path => pathname.startsWith(path))
  }

  private getStatusClass(status: number): string {
    if (status >= 200 && status < 300) return '2xx'
    if (status >= 300 && status < 400) return '3xx'
    if (status >= 400 && status < 500) return '4xx'
    if (status >= 500) return '5xx'
    return 'unknown'
  }

  private inferServiceFromPath(pathname: string): string {
    if (pathname.startsWith('/api/sfmc')) return 'sfmc'
    if (pathname.startsWith('/api/generate-code') || pathname.startsWith('/api/debug-code')) return 'ai'
    if (pathname.startsWith('/api/generate-pages')) return 'cloud-pages'
    return 'api'
  }

  private isApplicationError(error: any): error is ApplicationError {
    return error && typeof error === 'object' && 'type' in error && 'code' in error
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private extractUserId(request: NextRequest): string | undefined {
    // Try to extract user ID from various sources
    return request.cookies.get('userId')?.value
  }

  private getClientIP(request: NextRequest): string | undefined {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           undefined
  }
}

// Global monitoring middleware instance
export const monitoringMiddleware = new MonitoringMiddleware()

// Convenience wrapper function
export function withMonitoring<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return monitoringMiddleware.wrapHandler(handler)
}

// Combined error handling and monitoring wrapper
export function withErrorHandlingAndMonitoring<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  // First apply monitoring, then error handling
  return monitoringMiddleware.wrapHandler(handler)
}