// Error handling types and utilities

// Error Classification
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  SFMC_API_ERROR = 'SFMC_API_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

// Base Application Error
export interface ApplicationError {
  type: ErrorType
  message: string
  code: string
  details?: Record<string, any>
  timestamp: Date
  requestId: string
  userId?: string
  stack?: string
  cause?: Error
}

// Specific Error Types
export interface ValidationError extends ApplicationError {
  type: ErrorType.VALIDATION_ERROR
  field?: string
  value?: any
  constraints?: string[]
}

export interface AuthenticationError extends ApplicationError {
  type: ErrorType.AUTHENTICATION_ERROR
  authMethod?: string
  tokenExpired?: boolean
}

export interface AuthorizationError extends ApplicationError {
  type: ErrorType.AUTHORIZATION_ERROR
  requiredPermissions?: string[]
  userPermissions?: string[]
}

export interface SFMCApiError extends ApplicationError {
  type: ErrorType.SFMC_API_ERROR
  sfmcErrorCode?: string
  sfmcMessage?: string
  endpoint?: string
  httpStatus?: number
}

export interface AIServiceError extends ApplicationError {
  type: ErrorType.AI_SERVICE_ERROR
  provider?: string
  model?: string
  tokensUsed?: number
  rateLimitInfo?: {
    limit: number
    remaining: number
    resetTime: Date
  }
}

export interface RateLimitError extends ApplicationError {
  type: ErrorType.RATE_LIMIT_ERROR
  limit: number
  remaining: number
  resetTime: Date
  retryAfter: number
}

export interface NetworkError extends ApplicationError {
  type: ErrorType.NETWORK_ERROR
  url?: string
  method?: string
  statusCode?: number
  timeout?: boolean
}

// Error Severity Levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error Context
export interface ErrorContext {
  userId?: string
  sessionId?: string
  requestId: string
  userAgent?: string
  ip?: string
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: any
  query?: Record<string, any>
  timestamp: Date
}

// Error Recovery Strategy
export interface ErrorRecoveryStrategy {
  retryable: boolean
  maxRetries?: number
  backoffStrategy?: 'linear' | 'exponential' | 'fixed'
  baseDelay?: number
  maxDelay?: number
  fallbackAction?: () => Promise<any>
}

// Error Reporting
export interface ErrorReport {
  error: ApplicationError
  context: ErrorContext
  severity: ErrorSeverity
  tags?: string[]
  fingerprint?: string
  breadcrumbs?: Breadcrumb[]
}

export interface Breadcrumb {
  timestamp: Date
  message: string
  category: string
  level: 'info' | 'warning' | 'error'
  data?: Record<string, any>
}

// Circuit Breaker States
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
  expectedErrors?: ErrorType[]
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState
  failureCount: number
  successCount: number
  lastFailureTime?: Date
  lastSuccessTime?: Date
  nextAttemptTime?: Date
}

// Retry Configuration
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
  retryableErrors: ErrorType[]
}

// Error Handler Configuration
export interface ErrorHandlerConfig {
  logErrors: boolean
  reportErrors: boolean
  includeStackTrace: boolean
  sanitizeData: boolean
  errorReporting?: {
    service: 'sentry' | 'bugsnag' | 'custom'
    apiKey?: string
    environment?: string
  }
}

// User-Friendly Error Messages
export interface UserErrorMessage {
  title: string
  message: string
  action?: string
  actionUrl?: string
  supportContact?: string
}

// Error Mapping for User-Friendly Messages
export type ErrorMessageMap = {
  [K in ErrorType]: (error: ApplicationError) => UserErrorMessage
}

// Health Check Error
export interface HealthCheckError {
  service: string
  status: 'unhealthy' | 'degraded'
  error: string
  timestamp: Date
  responseTime?: number
}

// Monitoring and Alerting
export interface ErrorMetrics {
  errorRate: number
  errorCount: number
  uniqueErrors: number
  criticalErrors: number
  period: {
    start: Date
    end: Date
  }
  topErrors: {
    type: ErrorType
    count: number
    percentage: number
  }[]
}