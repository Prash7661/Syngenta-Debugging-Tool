// Error mapping utilities for converting between different error formats

import { ApplicationError, ErrorType, UserErrorMessage } from '../../types'
import { ErrorFactory } from './error-factory'

export class ErrorMapper {
  // Map HTTP status codes to ApplicationError types
  static fromHttpStatus(
    statusCode: number, 
    message?: string, 
    details?: Record<string, any>
  ): ApplicationError {
    const defaultMessage = message || this.getDefaultHttpMessage(statusCode)
    
    switch (statusCode) {
      case 400:
        return ErrorFactory.createValidationError(defaultMessage)
      
      case 401:
        return ErrorFactory.createAuthenticationError(defaultMessage)
      
      case 403:
        return ErrorFactory.createAuthorizationError(defaultMessage)
      
      case 404:
        return ErrorFactory.createApplicationError(
          ErrorType.NOT_FOUND_ERROR,
          defaultMessage,
          'RESOURCE_NOT_FOUND',
          details
        )
      
      case 409:
        return ErrorFactory.createApplicationError(
          ErrorType.CONFLICT_ERROR,
          defaultMessage,
          'RESOURCE_CONFLICT',
          details
        )
      
      case 429:
        return ErrorFactory.createRateLimitError(
          defaultMessage,
          details?.limit || 0,
          details?.remaining || 0,
          details?.resetTime || new Date(),
          details?.retryAfter || 60
        )
      
      case 500:
      case 502:
      case 503:
      case 504:
        return ErrorFactory.createApplicationError(
          ErrorType.INTERNAL_SERVER_ERROR,
          defaultMessage,
          'SERVER_ERROR',
          { statusCode, ...details }
        )
      
      default:
        return ErrorFactory.createApplicationError(
          ErrorType.INTERNAL_SERVER_ERROR,
          defaultMessage,
          'UNKNOWN_HTTP_ERROR',
          { statusCode, ...details }
        )
    }
  }

  // Map SFMC API errors to ApplicationError
  static fromSFMCError(
    sfmcError: any,
    endpoint?: string
  ): ApplicationError {
    const errorCode = sfmcError.errorcode || sfmcError.error_code || 'UNKNOWN'
    const message = sfmcError.message || sfmcError.error_description || 'SFMC API Error'
    
    // Handle specific SFMC error codes
    switch (errorCode) {
      case 'INVALID_LOGIN':
      case 'AUTHENTICATION_FAILED':
        return ErrorFactory.createAuthenticationError(
          message,
          'sfmc_oauth',
          false
        )
      
      case 'INSUFFICIENT_PRIVILEGES':
      case 'ACCESS_DENIED':
        return ErrorFactory.createAuthorizationError(
          message,
          ['sfmc_api_access']
        )
      
      case 'RATE_LIMIT_EXCEEDED':
        return ErrorFactory.createRateLimitError(
          message,
          sfmcError.limit || 0,
          sfmcError.remaining || 0,
          new Date(Date.now() + (sfmcError.reset_time || 3600) * 1000),
          sfmcError.retry_after || 60
        )
      
      default:
        return ErrorFactory.createSFMCApiError(
          message,
          errorCode,
          sfmcError.message,
          endpoint,
          sfmcError.status
        )
    }
  }

  // Map AI service errors to ApplicationError
  static fromAIServiceError(
    aiError: any,
    provider: string = 'openai',
    model?: string
  ): ApplicationError {
    const message = aiError.message || 'AI Service Error'
    const errorType = aiError.type || aiError.error?.type || 'unknown'
    
    switch (errorType) {
      case 'insufficient_quota':
      case 'quota_exceeded':
        return ErrorFactory.createAIServiceError(
          'AI service quota exceeded',
          provider,
          model,
          aiError.usage?.total_tokens
        )
      
      case 'rate_limit_exceeded':
        return ErrorFactory.createRateLimitError(
          'AI service rate limit exceeded',
          aiError.limit || 0,
          aiError.remaining || 0,
          new Date(Date.now() + (aiError.reset_time || 60) * 1000),
          aiError.retry_after || 60
        )
      
      case 'invalid_request_error':
        return ErrorFactory.createValidationError(
          message,
          aiError.param
        )
      
      case 'authentication_error':
        return ErrorFactory.createAuthenticationError(
          'AI service authentication failed',
          provider
        )
      
      default:
        return ErrorFactory.createAIServiceError(
          message,
          provider,
          model,
          aiError.usage?.total_tokens
        )
    }
  }

  // Map JavaScript errors to ApplicationError
  static fromJavaScriptError(error: Error): ApplicationError {
    if (error.name === 'TypeError') {
      return ErrorFactory.createValidationError(
        error.message,
        undefined,
        undefined,
        ['Type validation failed']
      )
    }
    
    if (error.name === 'ReferenceError') {
      return ErrorFactory.createApplicationError(
        ErrorType.INTERNAL_SERVER_ERROR,
        error.message,
        'REFERENCE_ERROR'
      )
    }
    
    if (error.name === 'SyntaxError') {
      return ErrorFactory.createValidationError(
        error.message,
        undefined,
        undefined,
        ['Syntax validation failed']
      )
    }
    
    if (error.message.includes('timeout')) {
      return ErrorFactory.createApplicationError(
        ErrorType.TIMEOUT_ERROR,
        error.message,
        'OPERATION_TIMEOUT'
      )
    }
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return ErrorFactory.createNetworkError(
        error.message,
        undefined,
        undefined,
        undefined,
        error.message.includes('timeout')
      )
    }
    
    return ErrorFactory.fromError(error)
  }

  // Convert ApplicationError to user-friendly message
  static toUserMessage(error: ApplicationError): UserErrorMessage {
    const baseMessage: UserErrorMessage = {
      title: 'Error',
      message: 'An unexpected error occurred.',
      action: 'Try Again'
    }

    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        return {
          title: 'Invalid Input',
          message: error.message || 'Please check your input and try again.',
          action: 'Correct Input'
        }

      case ErrorType.AUTHENTICATION_ERROR:
        return {
          title: 'Authentication Required',
          message: 'Please sign in to continue.',
          action: 'Sign In',
          actionUrl: '/login'
        }

      case ErrorType.AUTHORIZATION_ERROR:
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to perform this action.',
          action: 'Contact Support',
          supportContact: 'support@example.com'
        }

      case ErrorType.RATE_LIMIT_ERROR:
        const retryAfter = error.details?.retryAfter || 60
        return {
          title: 'Rate Limit Exceeded',
          message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
          action: 'Wait and Retry'
        }

      case ErrorType.SFMC_API_ERROR:
        return {
          title: 'SFMC Connection Error',
          message: 'Unable to connect to Salesforce Marketing Cloud. Please check your credentials.',
          action: 'Check Connection'
        }

      case ErrorType.AI_SERVICE_ERROR:
        return {
          title: 'AI Service Unavailable',
          message: 'The AI service is temporarily unavailable. Please try again later.',
          action: 'Try Again Later'
        }

      case ErrorType.NETWORK_ERROR:
        return {
          title: 'Connection Error',
          message: 'Unable to connect to the service. Please check your internet connection.',
          action: 'Check Connection'
        }

      case ErrorType.NOT_FOUND_ERROR:
        return {
          title: 'Not Found',
          message: 'The requested resource could not be found.',
          action: 'Go Back'
        }

      default:
        return {
          ...baseMessage,
          title: 'System Error',
          message: 'A system error occurred. Our team has been notified.',
          supportContact: 'support@example.com'
        }
    }
  }

  // Convert ApplicationError to HTTP response format
  static toHttpResponse(error: ApplicationError): {
    status: number
    body: {
      error: {
        code: string
        message: string
        type: string
        details?: Record<string, any>
        requestId: string
        timestamp: string
      }
    }
  } {
    const status = this.getHttpStatusFromErrorType(error.type)
    
    return {
      status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          type: error.type,
          details: error.details,
          requestId: error.requestId,
          timestamp: error.timestamp.toISOString()
        }
      }
    }
  }

  private static getDefaultHttpMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    }
    
    return messages[statusCode] || 'Unknown Error'
  }

  private static getHttpStatusFromErrorType(errorType: ErrorType): number {
    const statusMap: Record<ErrorType, number> = {
      [ErrorType.VALIDATION_ERROR]: 400,
      [ErrorType.AUTHENTICATION_ERROR]: 401,
      [ErrorType.AUTHORIZATION_ERROR]: 403,
      [ErrorType.NOT_FOUND_ERROR]: 404,
      [ErrorType.CONFLICT_ERROR]: 409,
      [ErrorType.RATE_LIMIT_ERROR]: 429,
      [ErrorType.INTERNAL_SERVER_ERROR]: 500,
      [ErrorType.SFMC_API_ERROR]: 502,
      [ErrorType.AI_SERVICE_ERROR]: 502,
      [ErrorType.NETWORK_ERROR]: 502,
      [ErrorType.DATABASE_ERROR]: 500,
      [ErrorType.FILE_SYSTEM_ERROR]: 500,
      [ErrorType.CONFIGURATION_ERROR]: 500,
      [ErrorType.TIMEOUT_ERROR]: 504
    }
    
    return statusMap[errorType] || 500
  }
}