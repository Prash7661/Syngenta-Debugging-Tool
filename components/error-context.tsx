'use client'

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react'
import { ApplicationError, ErrorType } from '../types/errors'
import { ErrorFactory } from '../utils/errors/error-factory'
import { globalErrorHandler } from '../utils/errors/error-handler'
import { logger } from '../utils/logging/logger'

interface ErrorContextValue {
  errors: ApplicationError[]
  reportError: (error: Error | ApplicationError, context?: Record<string, any>) => void
  clearError: (errorId: string) => void
  clearAllErrors: () => void
  hasErrors: boolean
  getErrorById: (errorId: string) => ApplicationError | undefined
  getErrorsByType: (type: ErrorType) => ApplicationError[]
}

interface ErrorProviderProps {
  children: ReactNode
  maxErrors?: number
  autoCleanupDelay?: number
}

const ErrorContext = createContext<ErrorContextValue | undefined>(undefined)

export function ErrorProvider({ 
  children, 
  maxErrors = 10, 
  autoCleanupDelay = 30000 // 30 seconds
}: ErrorProviderProps) {
  const [errors, setErrors] = useState<ApplicationError[]>([])

  const reportError = useCallback((error: Error | ApplicationError, context?: Record<string, any>) => {
    let appError: ApplicationError

    if ('type' in error && 'code' in error) {
      appError = error as ApplicationError
    } else {
      appError = ErrorFactory.fromError(error)
    }

    // Process through global error handler
    const processedError = globalErrorHandler.handleError(appError, {
      requestId: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...context
    })

    // Log the error
    logger.logError(processedError, {
      requestId: processedError.requestId,
      timestamp: new Date(),
      ...context
    })

    // Add to error state
    setErrors(prevErrors => {
      const newErrors = [processedError, ...prevErrors]
      
      // Limit the number of errors stored
      if (newErrors.length > maxErrors) {
        return newErrors.slice(0, maxErrors)
      }
      
      return newErrors
    })

    // Auto cleanup after delay
    if (autoCleanupDelay > 0) {
      setTimeout(() => {
        clearError(processedError.requestId)
      }, autoCleanupDelay)
    }
  }, [maxErrors, autoCleanupDelay])

  const clearError = useCallback((errorId: string) => {
    setErrors(prevErrors => prevErrors.filter(error => error.requestId !== errorId))
  }, [])

  const clearAllErrors = useCallback(() => {
    setErrors([])
  }, [])

  const getErrorById = useCallback((errorId: string) => {
    return errors.find(error => error.requestId === errorId)
  }, [errors])

  const getErrorsByType = useCallback((type: ErrorType) => {
    return errors.filter(error => error.type === type)
  }, [errors])

  const value: ErrorContextValue = {
    errors,
    reportError,
    clearError,
    clearAllErrors,
    hasErrors: errors.length > 0,
    getErrorById,
    getErrorsByType
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useErrorContext(): ErrorContextValue {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useErrorContext must be used within an ErrorProvider')
  }
  return context
}

// Custom hook for error reporting
export function useErrorReporting() {
  const { reportError } = useErrorContext()

  const reportNetworkError = useCallback((error: Error, url?: string, method?: string) => {
    const networkError = ErrorFactory.createNetworkError(
      error.message,
      url,
      method,
      undefined,
      error.name === 'TimeoutError'
    )
    reportError(networkError, { url, method })
  }, [reportError])

  const reportValidationError = useCallback((message: string, field?: string, value?: any) => {
    const validationError = ErrorFactory.createValidationError(message, field, value)
    reportError(validationError, { field, value })
  }, [reportError])

  const reportAuthError = useCallback((message: string, authMethod?: string) => {
    const authError = ErrorFactory.createAuthenticationError(message, authMethod)
    reportError(authError, { authMethod })
  }, [reportError])

  const reportSFMCError = useCallback((
    message: string, 
    sfmcErrorCode?: string, 
    endpoint?: string,
    httpStatus?: number
  ) => {
    const sfmcError = ErrorFactory.createSFMCApiError(
      message,
      sfmcErrorCode,
      undefined,
      endpoint,
      httpStatus
    )
    reportError(sfmcError, { endpoint, httpStatus })
  }, [reportError])

  const reportAIError = useCallback((
    message: string,
    provider?: string,
    model?: string,
    tokensUsed?: number
  ) => {
    const aiError = ErrorFactory.createAIServiceError(message, provider, model, tokensUsed)
    reportError(aiError, { provider, model, tokensUsed })
  }, [reportError])

  return {
    reportError,
    reportNetworkError,
    reportValidationError,
    reportAuthError,
    reportSFMCError,
    reportAIError
  }
}

// Hook for handling async operations with error reporting
export function useAsyncError() {
  const { reportError } = useErrorContext()

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    errorContext?: Record<string, any>
  ): Promise<T | null> => {
    try {
      return await operation()
    } catch (error) {
      reportError(error as Error, errorContext)
      return null
    }
  }, [reportError])

  const wrapAsyncFunction = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorContext?: Record<string, any>
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args)
      } catch (error) {
        reportError(error as Error, { ...errorContext, args })
        return null
      }
    }
  }, [reportError])

  return {
    executeWithErrorHandling,
    wrapAsyncFunction
  }
}