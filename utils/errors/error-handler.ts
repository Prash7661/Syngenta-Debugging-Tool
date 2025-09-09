// Centralized error handling utilities

import { 
  ApplicationError, 
  ErrorType, 
  ErrorHandlerConfig, 
  UserErrorMessage, 
  ErrorMessageMap,
  ErrorContext,
  ErrorReport,
  ErrorSeverity
} from '../../types'
import { ErrorFactory } from './error-factory'

export class ErrorHandler {
  private config: ErrorHandlerConfig
  private errorMessageMap: Partial<ErrorMessageMap>

  constructor(config: ErrorHandlerConfig) {
    this.config = config
    this.errorMessageMap = this.createDefaultErrorMessageMap()
  }

  handleError(error: Error | ApplicationError, context?: Partial<ErrorContext>): ApplicationError {
    const appError = this.normalizeError(error)
    const fullContext = this.buildErrorContext(context)
    
    if (this.config.logErrors) {
      this.logError(appError, fullContext)
    }

    if (this.config.reportErrors) {
      this.reportError(appError, fullContext)
    }

    return appError
  }

  getUserFriendlyMessage(error: ApplicationError): UserErrorMessage {
    const mapper = this.errorMessageMap[error.type]
    if (mapper) {
      return mapper(error)
    }

    return {
      title: 'An Error Occurred',
      message: 'Something went wrong. Please try again later.',
      action: 'Retry',
      supportContact: 'support@example.com'
    }
  }

  private normalizeError(error: Error | ApplicationError): ApplicationError {
    if (this.isApplicationError(error)) {
      return error
    }

    // Convert standard errors to ApplicationError
    if (error.name === 'ValidationError') {
      return ErrorFactory.createValidationError(error.message)
    }

    if (error.name === 'UnauthorizedError') {
      return ErrorFactory.createAuthenticationError(error.message)
    }

    return ErrorFactory.fromError(error)
  }

  private isApplicationError(error: any): error is ApplicationError {
    return error && typeof error === 'object' && 'type' in error && 'code' in error
  }

  private buildErrorContext(context?: Partial<ErrorContext>): ErrorContext {
    return {
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...context
    }
  }

  private logError(error: ApplicationError, context: ErrorContext): void {
    const logData = {
      error: {
        type: error.type,
        code: error.code,
        message: error.message,
        details: error.details
      },
      context,
      stack: this.config.includeStackTrace ? error.stack : undefined
    }

    console.error('Application Error:', JSON.stringify(logData, null, 2))
  }

  private reportError(error: ApplicationError, context: ErrorContext): void {
    const report: ErrorReport = {
      error,
      context,
      severity: this.determineSeverity(error),
      fingerprint: this.generateFingerprint(error),
      tags: this.generateTags(error)
    }

    // In a real implementation, this would send to an error reporting service
    console.warn('Error Report:', report)
  }

  private determineSeverity(error: ApplicationError): ErrorSeverity {
    switch (error.type) {
      case ErrorType.INTERNAL_SERVER_ERROR:
      case ErrorType.DATABASE_ERROR:
        return ErrorSeverity.CRITICAL
      
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
      case ErrorType.SFMC_API_ERROR:
        return ErrorSeverity.HIGH
      
      case ErrorType.VALIDATION_ERROR:
      case ErrorType.RATE_LIMIT_ERROR:
        return ErrorSeverity.MEDIUM
      
      default:
        return ErrorSeverity.LOW
    }
  }

  private generateFingerprint(error: ApplicationError): string {
    const key = `${error.type}:${error.code}:${error.message}`
    return Buffer.from(key).toString('base64')
  }

  private generateTags(error: ApplicationError): string[] {
    const tags = [error.type, error.code]
    
    if (error.details?.endpoint) {
      tags.push(`endpoint:${error.details.endpoint}`)
    }
    
    if (error.details?.provider) {
      tags.push(`provider:${error.details.provider}`)
    }

    return tags
  }

  private createDefaultErrorMessageMap(): Partial<ErrorMessageMap> {
    return {
      [ErrorType.VALIDATION_ERROR]: (error) => ({
        title: 'Invalid Input',
        message: error.message || 'Please check your input and try again.',
        action: 'Correct Input'
      }),

      [ErrorType.AUTHENTICATION_ERROR]: (error) => ({
        title: 'Authentication Failed',
        message: 'Please check your credentials and try again.',
        action: 'Sign In Again'
      }),

      [ErrorType.AUTHORIZATION_ERROR]: (error) => ({
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        action: 'Contact Administrator'
      }),

      [ErrorType.SFMC_API_ERROR]: (error) => ({
        title: 'SFMC Connection Error',
        message: 'Unable to connect to Salesforce Marketing Cloud. Please check your connection.',
        action: 'Retry Connection'
      }),

      [ErrorType.AI_SERVICE_ERROR]: (error) => ({
        title: 'AI Service Unavailable',
        message: 'The AI service is temporarily unavailable. Please try again later.',
        action: 'Try Again'
      }),

      [ErrorType.RATE_LIMIT_ERROR]: (error) => ({
        title: 'Rate Limit Exceeded',
        message: 'Too many requests. Please wait before trying again.',
        action: 'Wait and Retry'
      }),

      [ErrorType.NETWORK_ERROR]: (error) => ({
        title: 'Network Error',
        message: 'Unable to connect to the service. Please check your internet connection.',
        action: 'Check Connection'
      }),

      [ErrorType.INTERNAL_SERVER_ERROR]: (error) => ({
        title: 'Server Error',
        message: 'An unexpected error occurred. Our team has been notified.',
        action: 'Try Again Later',
        supportContact: 'support@example.com'
      })
    }
  }
}

// Global error handler instance
export const globalErrorHandler = new ErrorHandler({
  logErrors: true,
  reportErrors: process.env.NODE_ENV === 'production',
  includeStackTrace: process.env.NODE_ENV !== 'production',
  sanitizeData: true
})