// Error factory for creating standardized errors

import { 
  ApplicationError, 
  ErrorType, 
  ValidationError, 
  AuthenticationError,
  AuthorizationError,
  SFMCApiError,
  AIServiceError,
  RateLimitError,
  NetworkError
} from '../../types'

export class ErrorFactory {
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static createApplicationError(
    type: ErrorType,
    message: string,
    code: string,
    details?: Record<string, any>,
    userId?: string,
    cause?: Error
  ): ApplicationError {
    return {
      type,
      message,
      code,
      details,
      timestamp: new Date(),
      requestId: this.generateRequestId(),
      userId,
      stack: new Error().stack,
      cause
    }
  }

  static createValidationError(
    message: string,
    field?: string,
    value?: any,
    constraints?: string[],
    userId?: string
  ): ValidationError {
    return {
      ...this.createApplicationError(
        ErrorType.VALIDATION_ERROR,
        message,
        'VALIDATION_FAILED',
        { field, value, constraints },
        userId
      ),
      type: ErrorType.VALIDATION_ERROR,
      field,
      value,
      constraints
    }
  }

  static createAuthenticationError(
    message: string,
    authMethod?: string,
    tokenExpired?: boolean,
    userId?: string
  ): AuthenticationError {
    return {
      ...this.createApplicationError(
        ErrorType.AUTHENTICATION_ERROR,
        message,
        'AUTH_FAILED',
        { authMethod, tokenExpired },
        userId
      ),
      type: ErrorType.AUTHENTICATION_ERROR,
      authMethod,
      tokenExpired
    }
  }

  static createAuthorizationError(
    message: string,
    requiredPermissions?: string[],
    userPermissions?: string[],
    userId?: string
  ): AuthorizationError {
    return {
      ...this.createApplicationError(
        ErrorType.AUTHORIZATION_ERROR,
        message,
        'AUTHORIZATION_FAILED',
        { requiredPermissions, userPermissions },
        userId
      ),
      type: ErrorType.AUTHORIZATION_ERROR,
      requiredPermissions,
      userPermissions
    }
  }

  static createSFMCApiError(
    message: string,
    sfmcErrorCode?: string,
    sfmcMessage?: string,
    endpoint?: string,
    httpStatus?: number,
    userId?: string
  ): SFMCApiError {
    return {
      ...this.createApplicationError(
        ErrorType.SFMC_API_ERROR,
        message,
        'SFMC_API_ERROR',
        { sfmcErrorCode, sfmcMessage, endpoint, httpStatus },
        userId
      ),
      type: ErrorType.SFMC_API_ERROR,
      sfmcErrorCode,
      sfmcMessage,
      endpoint,
      httpStatus
    }
  }

  static createAIServiceError(
    message: string,
    provider?: string,
    model?: string,
    tokensUsed?: number,
    rateLimitInfo?: any,
    userId?: string
  ): AIServiceError {
    return {
      ...this.createApplicationError(
        ErrorType.AI_SERVICE_ERROR,
        message,
        'AI_SERVICE_ERROR',
        { provider, model, tokensUsed, rateLimitInfo },
        userId
      ),
      type: ErrorType.AI_SERVICE_ERROR,
      provider,
      model,
      tokensUsed,
      rateLimitInfo
    }
  }

  static createRateLimitError(
    message: string,
    limit: number,
    remaining: number,
    resetTime: Date,
    retryAfter: number,
    userId?: string
  ): RateLimitError {
    return {
      ...this.createApplicationError(
        ErrorType.RATE_LIMIT_ERROR,
        message,
        'RATE_LIMIT_EXCEEDED',
        { limit, remaining, resetTime, retryAfter },
        userId
      ),
      type: ErrorType.RATE_LIMIT_ERROR,
      limit,
      remaining,
      resetTime,
      retryAfter
    }
  }

  static createNetworkError(
    message: string,
    url?: string,
    method?: string,
    statusCode?: number,
    timeout?: boolean,
    userId?: string
  ): NetworkError {
    return {
      ...this.createApplicationError(
        ErrorType.NETWORK_ERROR,
        message,
        'NETWORK_ERROR',
        { url, method, statusCode, timeout },
        userId
      ),
      type: ErrorType.NETWORK_ERROR,
      url,
      method,
      statusCode,
      timeout
    }
  }

  static fromError(error: Error, type: ErrorType = ErrorType.INTERNAL_SERVER_ERROR): ApplicationError {
    return this.createApplicationError(
      type,
      error.message,
      'UNKNOWN_ERROR',
      { originalError: error.name },
      undefined,
      error
    )
  }
}