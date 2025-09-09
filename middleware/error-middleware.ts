// Centralized error handling middleware for API routes

import { NextRequest, NextResponse } from 'next/server'
import { ApplicationError, ErrorType } from '../types/errors'
import { ErrorFactory } from '../utils/errors/error-factory'
import { globalErrorHandler } from '../utils/errors/error-handler'
import { logger, createRequestLogger } from '../utils/logging/logger'

export interface ErrorMiddlewareOptions {
  enableErrorReporting: boolean
  enableRequestTracing: boolean
  sanitizeErrors: boolean
  includeStackTrace: boolean
}

export class ErrorMiddleware {
  private options: ErrorMiddlewareOptions

  constructor(options: Partial<ErrorMiddlewareOptions> = {}) {
    this.options = {
      enableErrorReporting: process.env.NODE_ENV === 'production',
      enableRequestTracing: true,
      sanitizeErrors: process.env.NODE_ENV === 'production',
      includeStackTrace: process.env.NODE_ENV !== 'production',
      ...options
    }
  }

  /**
   * Wrap an API route handler with error handling
   */
  wrapHandler<T = any>(
    handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
  ) {
    return async (request: NextRequest, context?: any): Promise<NextResponse> => {
      const requestId = this.generateRequestId()
      const startTime = Date.now()
      const requestLogger = createRequestLogger(requestId)

      try {
        // Start request tracing
        if (this.options.enableRequestTracing) {
          requestLogger.startRequest(
            requestId,
            request.method,
            request.url,
            this.extractUserId(request)
          )
        }

        // Execute the handler
        const response = await handler(request, context)
        
        // End request tracing
        if (this.options.enableRequestTracing) {
          const duration = Date.now() - startTime
          requestLogger.endRequest(requestId, response.status, duration)
        }

        return response
      } catch (error) {
        return this.handleError(error, request, requestId, startTime)
      }
    }
  }

  /**
   * Handle errors in API routes
   */
  private async handleError(
    error: any,
    request: NextRequest,
    requestId: string,
    startTime: number
  ): Promise<NextResponse> {
    const duration = Date.now() - startTime
    const appError = this.normalizeError(error, request, requestId)
    
    // Process error through global handler
    const processedError = globalErrorHandler.handleError(appError, {
      requestId,
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: this.getClientIP(request),
      timestamp: new Date()
    })

    // Log the error
    const requestLogger = createRequestLogger(requestId, processedError.userId)
    requestLogger.logError(processedError, {
      requestId,
      url: request.url,
      method: request.method,
      timestamp: new Date()
    })

    // End request tracing with error
    if (this.options.enableRequestTracing) {
      requestLogger.endRequest(requestId, this.getStatusCodeForError(processedError), duration, error)
    }

    // Create error response
    return this.createErrorResponse(processedError)
  }

  /**
   * Normalize various error types to ApplicationError
   */
  private normalizeError(error: any, request: NextRequest, requestId: string): ApplicationError {
    // Already an ApplicationError
    if (this.isApplicationError(error)) {
      return { ...error, requestId }
    }

    // Handle specific error types
    if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
      return ErrorFactory.createValidationError(
        error.message || 'Validation failed',
        error.field,
        error.value,
        error.constraints
      )
    }

    if (error.name === 'UnauthorizedError' || error.status === 401) {
      return ErrorFactory.createAuthenticationError(
        error.message || 'Authentication failed'
      )
    }

    if (error.name === 'ForbiddenError' || error.status === 403) {
      return ErrorFactory.createAuthorizationError(
        error.message || 'Access denied'
      )
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return ErrorFactory.createNetworkError(
        error.message || 'Network error',
        request.url,
        request.method
      )
    }

    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return {
        type: ErrorType.TIMEOUT_ERROR,
        message: error.message || 'Request timeout',
        code: 'REQUEST_TIMEOUT',
        timestamp: new Date(),
        requestId,
        details: {
          url: request.url,
          method: request.method,
          timeout: error.timeout
        }
      }
    }

    // Rate limiting errors
    if (error.status === 429 || error.code === 'RATE_LIMIT_EXCEEDED') {
      return ErrorFactory.createRateLimitError(
        error.message || 'Rate limit exceeded',
        error.limit || 100,
        error.remaining || 0,
        error.resetTime || new Date(Date.now() + 60000),
        error.retryAfter || 60
      )
    }

    // SFMC API errors
    if (error.name === 'SFMCError' || error.provider === 'sfmc') {
      return ErrorFactory.createSFMCApiError(
        error.message || 'SFMC API error',
        error.sfmcErrorCode,
        error.sfmcMessage,
        error.endpoint,
        error.httpStatus
      )
    }

    // AI Service errors
    if (error.name === 'AIServiceError' || error.provider === 'openai') {
      return ErrorFactory.createAIServiceError(
        error.message || 'AI service error',
        error.provider,
        error.model,
        error.tokensUsed,
        error.rateLimitInfo
      )
    }

    // Default to internal server error
    return ErrorFactory.fromError(error, ErrorType.INTERNAL_SERVER_ERROR)
  }

  /**
   * Create HTTP response for error
   */
  private createErrorResponse(error: ApplicationError): NextResponse {
    const statusCode = this.getStatusCodeForError(error)
    const userMessage = globalErrorHandler.getUserFriendlyMessage(error)
    
    const responseBody: any = {
      error: {
        type: error.type,
        code: error.code,
        message: this.options.sanitizeErrors ? userMessage.message : error.message,
        requestId: error.requestId,
        timestamp: error.timestamp
      },
      userMessage
    }

    // Include additional details in development
    if (!this.options.sanitizeErrors) {
      responseBody.error.details = error.details
      
      if (this.options.includeStackTrace && error.stack) {
        responseBody.error.stack = error.stack
      }
    }

    return NextResponse.json(responseBody, { 
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': error.requestId
      }
    })
  }

  /**
   * Map error types to HTTP status codes
   */
  private getStatusCodeForError(error: ApplicationError): number {
    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        return 400
      case ErrorType.AUTHENTICATION_ERROR:
        return 401
      case ErrorType.AUTHORIZATION_ERROR:
        return 403
      case ErrorType.NOT_FOUND_ERROR:
        return 404
      case ErrorType.CONFLICT_ERROR:
        return 409
      case ErrorType.RATE_LIMIT_ERROR:
        return 429
      case ErrorType.INTERNAL_SERVER_ERROR:
      case ErrorType.DATABASE_ERROR:
      case ErrorType.FILE_SYSTEM_ERROR:
        return 500
      case ErrorType.SFMC_API_ERROR:
        return error.details?.httpStatus || 502
      case ErrorType.AI_SERVICE_ERROR:
        return 503
      case ErrorType.NETWORK_ERROR:
        return 502
      case ErrorType.TIMEOUT_ERROR:
        return 504
      default:
        return 500
    }
  }

  private isApplicationError(error: any): error is ApplicationError {
    return error && typeof error === 'object' && 'type' in error && 'code' in error
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private extractUserId(request: NextRequest): string | undefined {
    // Try to extract user ID from various sources
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      // In a real implementation, you would decode the JWT token
      // For now, we'll just return undefined
      return undefined
    }

    // Check for user ID in cookies or other headers
    return request.cookies.get('userId')?.value
  }

  private getClientIP(request: NextRequest): string | undefined {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           undefined
  }
}

// Global error middleware instance
export const errorMiddleware = new ErrorMiddleware()

// Convenience wrapper function
export function withErrorHandling<T = any>(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse<T>>
) {
  return errorMiddleware.wrapHandler(handler)
}

// Error boundary for API routes
export function createErrorBoundary(options?: Partial<ErrorMiddlewareOptions>) {
  const middleware = new ErrorMiddleware(options)
  return middleware.wrapHandler.bind(middleware)
}