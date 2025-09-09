// HTTP response utilities

import { NextResponse } from 'next/server'
import { ApiResponse, PaginatedResponse } from '../../types'

export class ResponseUtils {
  // Create success response
  static success<T>(data: T, status: number = 200): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    }
    
    return NextResponse.json(response, { status })
  }

  // Create error response
  static error(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    status: number = 500,
    details?: Record<string, any>
  ): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: {
        code,
        message,
        details
      },
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    }
    
    return NextResponse.json(response, { status })
  }

  // Create paginated response
  static paginated<T>(
    items: T[],
    totalCount: number,
    page: number = 1,
    limit: number = 10
  ): NextResponse {
    const totalPages = Math.ceil(totalCount / limit)
    const hasNext = page < totalPages
    const hasPrevious = page > 1

    const paginatedData: PaginatedResponse<T> = {
      items,
      totalCount,
      page,
      limit,
      totalPages,
      hasNext,
      hasPrevious
    }

    return this.success(paginatedData)
  }

  // Create no content response
  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 })
  }

  // Create created response
  static created<T>(data: T, location?: string): NextResponse {
    const headers: Record<string, string> = {}
    if (location) {
      headers['Location'] = location
    }

    return NextResponse.json(
      {
        success: true,
        data,
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      },
      { status: 201, headers }
    )
  }

  // Create accepted response (for async operations)
  static accepted(message: string = 'Request accepted for processing'): NextResponse {
    return NextResponse.json(
      {
        success: true,
        message,
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      },
      { status: 202 }
    )
  }

  // Create bad request response
  static badRequest(message: string, details?: Record<string, any>): NextResponse {
    return this.error(message, 'BAD_REQUEST', 400, details)
  }

  // Create unauthorized response
  static unauthorized(message: string = 'Unauthorized'): NextResponse {
    return this.error(message, 'UNAUTHORIZED', 401)
  }

  // Create forbidden response
  static forbidden(message: string = 'Forbidden'): NextResponse {
    return this.error(message, 'FORBIDDEN', 403)
  }

  // Create not found response
  static notFound(message: string = 'Resource not found'): NextResponse {
    return this.error(message, 'NOT_FOUND', 404)
  }

  // Create method not allowed response
  static methodNotAllowed(allowedMethods: string[]): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Method not allowed'
        },
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      },
      { 
        status: 405,
        headers: {
          'Allow': allowedMethods.join(', ')
        }
      }
    )
  }

  // Create conflict response
  static conflict(message: string, details?: Record<string, any>): NextResponse {
    return this.error(message, 'CONFLICT', 409, details)
  }

  // Create unprocessable entity response
  static unprocessableEntity(message: string, validationErrors?: any[]): NextResponse {
    return this.error(message, 'UNPROCESSABLE_ENTITY', 422, { validationErrors })
  }

  // Create rate limit exceeded response
  static rateLimitExceeded(
    retryAfter: number,
    limit: number,
    remaining: number = 0
  ): NextResponse {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Rate limit exceeded'
        },
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString()
        }
      }
    )
  }

  // Create internal server error response
  static internalServerError(message: string = 'Internal server error'): NextResponse {
    return this.error(message, 'INTERNAL_SERVER_ERROR', 500)
  }

  // Create service unavailable response
  static serviceUnavailable(message: string = 'Service temporarily unavailable'): NextResponse {
    return this.error(message, 'SERVICE_UNAVAILABLE', 503)
  }

  // Create response with custom headers
  static withHeaders<T>(
    data: T,
    headers: Record<string, string>,
    status: number = 200
  ): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      timestamp: Date.now(),
      requestId: this.generateRequestId()
    }
    
    return NextResponse.json(response, { status, headers })
  }

  // Create streaming response
  static stream(
    generator: AsyncGenerator<string, void, unknown>,
    contentType: string = 'text/plain'
  ): NextResponse {
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of generator) {
            controller.enqueue(encoder.encode(chunk))
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      }
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': contentType,
        'Transfer-Encoding': 'chunked'
      }
    })
  }

  // Create file download response
  static download(
    buffer: Buffer,
    filename: string,
    contentType: string = 'application/octet-stream'
  ): NextResponse {
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  }

  // Create redirect response
  static redirect(url: string, permanent: boolean = false): NextResponse {
    return NextResponse.redirect(url, permanent ? 301 : 302)
  }

  // Generate request ID
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Utility functions for common response patterns
export const responseUtils = {
  // Wrap async handler with error handling
  async handle<T>(
    handler: () => Promise<T>,
    successStatus: number = 200
  ): Promise<NextResponse> {
    try {
      const result = await handler()
      return ResponseUtils.success(result, successStatus)
    } catch (error) {
      console.error('Handler error:', error)
      
      if (error instanceof Error) {
        return ResponseUtils.internalServerError(error.message)
      }
      
      return ResponseUtils.internalServerError()
    }
  },

  // Create health check response
  healthCheck(services: Record<string, boolean>): NextResponse {
    const allHealthy = Object.values(services).every(status => status)
    const status = allHealthy ? 200 : 503
    
    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString()
    }, { status })
  },

  // Create API info response
  apiInfo(version: string, name: string): NextResponse {
    return ResponseUtils.success({
      name,
      version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  }
}