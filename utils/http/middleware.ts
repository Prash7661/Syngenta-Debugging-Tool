// HTTP middleware utilities for Next.js API routes

import { NextRequest, NextResponse } from 'next/server'
import { ApplicationError, ErrorType } from '../../types'
import { ErrorHandler, ErrorMapper } from '../errors'
import { ValidationSchemas } from '../validation'

export type MiddlewareFunction = (
  request: NextRequest,
  context: any
) => Promise<NextResponse | void>

// Error handling middleware
export function errorMiddleware(handler: Function): MiddlewareFunction {
  return async (request: NextRequest, context: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      const errorHandler = new ErrorHandler({
        logErrors: true,
        reportErrors: process.env.NODE_ENV === 'production',
        includeStackTrace: process.env.NODE_ENV !== 'production',
        sanitizeData: true
      })

      const appError = errorHandler.handleError(error as Error, {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      })

      const httpResponse = ErrorMapper.toHttpResponse(appError)
      
      return NextResponse.json(httpResponse.body, { 
        status: httpResponse.status 
      })
    }
  }
}

// Request validation middleware
export function validationMiddleware(
  validator: (body: any) => { isValid: boolean; errors: any[] }
): MiddlewareFunction {
  return async (request: NextRequest, context: any) => {
    try {
      const body = await request.json()
      const validation = validator(body)
      
      if (!validation.isValid) {
        const error = ErrorMapper.fromHttpStatus(400, 'Validation failed', {
          validationErrors: validation.errors
        })
        
        const httpResponse = ErrorMapper.toHttpResponse(error)
        return NextResponse.json(httpResponse.body, { 
          status: httpResponse.status 
        })
      }
      
      // Add validated body to context
      context.body = body
    } catch (error) {
      const appError = ErrorMapper.fromHttpStatus(400, 'Invalid JSON in request body')
      const httpResponse = ErrorMapper.toHttpResponse(appError)
      
      return NextResponse.json(httpResponse.body, { 
        status: httpResponse.status 
      })
    }
  }
}

// Rate limiting middleware
export function rateLimitMiddleware(
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): MiddlewareFunction {
  const requests = new Map<string, { count: number; resetTime: number }>()

  return async (request: NextRequest, context: any) => {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    const key = `${ip}:${windowStart}`
    
    const current = requests.get(key) || { count: 0, resetTime: windowStart + windowMs }
    
    if (now > current.resetTime) {
      // Reset the window
      current.count = 0
      current.resetTime = windowStart + windowMs
    }
    
    current.count++
    requests.set(key, current)
    
    if (current.count > limit) {
      const error = ErrorMapper.fromHttpStatus(429, 'Rate limit exceeded', {
        limit,
        remaining: 0,
        resetTime: new Date(current.resetTime),
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      })
      
      const httpResponse = ErrorMapper.toHttpResponse(error)
      return NextResponse.json(httpResponse.body, { 
        status: httpResponse.status,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': current.resetTime.toString(),
          'Retry-After': Math.ceil((current.resetTime - now) / 1000).toString()
        }
      })
    }
    
    // Add rate limit info to response headers
    context.rateLimitHeaders = {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': (limit - current.count).toString(),
      'X-RateLimit-Reset': current.resetTime.toString()
    }
  }
}

// CORS middleware
export function corsMiddleware(options: {
  origin?: string | string[]
  methods?: string[]
  allowedHeaders?: string[]
  credentials?: boolean
} = {}): MiddlewareFunction {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = false
  } = options

  return async (request: NextRequest, context: any) => {
    const response = NextResponse.next()
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
      response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))
      response.headers.set('Access-Control-Max-Age', '86400')
    }
    
    // Set CORS headers
    if (Array.isArray(origin)) {
      const requestOrigin = request.headers.get('origin')
      if (requestOrigin && origin.includes(requestOrigin)) {
        response.headers.set('Access-Control-Allow-Origin', requestOrigin)
      }
    } else {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true')
    }
    
    return response
  }
}

// Authentication middleware
export function authMiddleware(
  getUser: (token: string) => Promise<any>
): MiddlewareFunction {
  return async (request: NextRequest, context: any) => {
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = ErrorMapper.fromHttpStatus(401, 'Missing or invalid authorization header')
      const httpResponse = ErrorMapper.toHttpResponse(error)
      
      return NextResponse.json(httpResponse.body, { 
        status: httpResponse.status 
      })
    }
    
    const token = authHeader.substring(7)
    
    try {
      const user = await getUser(token)
      context.user = user
    } catch (error) {
      const appError = ErrorMapper.fromHttpStatus(401, 'Invalid or expired token')
      const httpResponse = ErrorMapper.toHttpResponse(appError)
      
      return NextResponse.json(httpResponse.body, { 
        status: httpResponse.status 
      })
    }
  }
}

// Request logging middleware
export function loggingMiddleware(): MiddlewareFunction {
  return async (request: NextRequest, context: any) => {
    const start = Date.now()
    
    console.log(`${request.method} ${request.url} - Started`)
    
    // Continue with the request
    const response = await context.next?.()
    
    const duration = Date.now() - start
    const status = response?.status || 'unknown'
    
    console.log(`${request.method} ${request.url} - ${status} (${duration}ms)`)
    
    return response
  }
}

// Compose multiple middleware functions
export function compose(...middlewares: MiddlewareFunction[]): MiddlewareFunction {
  return async (request: NextRequest, context: any) => {
    let index = 0
    
    async function dispatch(i: number): Promise<NextResponse | void> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      
      index = i
      
      const middleware = middlewares[i]
      if (!middleware) {
        return
      }
      
      const nextContext = {
        ...context,
        next: () => dispatch(i + 1)
      }
      
      return middleware(request, nextContext)
    }
    
    return dispatch(0)
  }
}

// Helper to create API route with middleware
export function withMiddleware(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  ...middlewares: MiddlewareFunction[]
) {
  return async (request: NextRequest, context: any = {}) => {
    const allMiddlewares = [...middlewares, handler]
    const composedHandler = compose(...allMiddlewares)
    
    return composedHandler(request, context)
  }
}