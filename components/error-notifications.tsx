'use client'

import React, { useEffect, useState } from 'react'
import { useErrorContext } from './error-context'
import { ApplicationError, ErrorType } from '../types/errors'
import { globalErrorHandler } from '../utils/errors/error-handler'
import { Button } from './ui/button'
import { X, AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react'
import { cn } from '../lib/utils'

interface ErrorNotificationProps {
  error: ApplicationError
  onDismiss: (errorId: string) => void
  onRetry?: () => void
  autoHide?: boolean
  hideDelay?: number
}

function ErrorNotification({ 
  error, 
  onDismiss, 
  onRetry, 
  autoHide = true, 
  hideDelay = 5000 
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isHiding, setIsHiding] = useState(false)

  const userMessage = globalErrorHandler.getUserFriendlyMessage(error)

  useEffect(() => {
    if (autoHide && !shouldPersist(error.type)) {
      const timer = setTimeout(() => {
        handleHide()
      }, hideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, hideDelay, error.type])

  const handleHide = () => {
    setIsHiding(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss(error.requestId)
    }, 300) // Animation duration
  }

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    }
    handleHide()
  }

  if (!isVisible) return null

  const { icon: Icon, bgColor, borderColor, textColor, iconColor } = getNotificationStyle(error.type)

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-md w-full transform transition-all duration-300 ease-in-out',
        isHiding ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      )}
    >
      <div className={cn(
        'rounded-lg border shadow-lg p-4',
        bgColor,
        borderColor
      )}>
        <div className="flex items-start space-x-3">
          <div className={cn('flex-shrink-0 mt-0.5', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={cn('text-sm font-medium', textColor)}>
              {userMessage.title}
            </h4>
            <p className={cn('text-sm mt-1 opacity-90', textColor)}>
              {userMessage.message}
            </p>
            
            {error.requestId && (
              <p className="text-xs mt-2 opacity-60 font-mono">
                ID: {error.requestId}
              </p>
            )}

            <div className="flex items-center space-x-2 mt-3">
              {userMessage.action && onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {userMessage.action}
                </Button>
              )}
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleHide}
                className="h-7 text-xs opacity-70 hover:opacity-100"
              >
                Dismiss
              </Button>
            </div>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleHide}
            className="flex-shrink-0 h-6 w-6 p-0 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function getNotificationStyle(errorType: ErrorType) {
  switch (errorType) {
    case ErrorType.VALIDATION_ERROR:
      return {
        icon: AlertCircle,
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-800',
        iconColor: 'text-yellow-600'
      }

    case ErrorType.AUTHENTICATION_ERROR:
    case ErrorType.AUTHORIZATION_ERROR:
      return {
        icon: AlertTriangle,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-600'
      }

    case ErrorType.NETWORK_ERROR:
    case ErrorType.TIMEOUT_ERROR:
    case ErrorType.SFMC_API_ERROR:
    case ErrorType.AI_SERVICE_ERROR:
      return {
        icon: AlertTriangle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600'
      }

    case ErrorType.RATE_LIMIT_ERROR:
      return {
        icon: Info,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
      }

    case ErrorType.INTERNAL_SERVER_ERROR:
    case ErrorType.DATABASE_ERROR:
      return {
        icon: AlertTriangle,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600'
      }

    default:
      return {
        icon: AlertCircle,
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
        iconColor: 'text-gray-600'
      }
  }
}

function shouldPersist(errorType: ErrorType): boolean {
  // These error types should persist until manually dismissed
  return [
    ErrorType.AUTHENTICATION_ERROR,
    ErrorType.AUTHORIZATION_ERROR,
    ErrorType.INTERNAL_SERVER_ERROR,
    ErrorType.DATABASE_ERROR
  ].includes(errorType)
}

export function ErrorNotifications() {
  const { errors, clearError } = useErrorContext()
  const [retryCallbacks, setRetryCallbacks] = useState<Record<string, () => void>>({})

  const registerRetryCallback = (errorId: string, callback: () => void) => {
    setRetryCallbacks(prev => ({ ...prev, [errorId]: callback }))
  }

  const unregisterRetryCallback = (errorId: string) => {
    setRetryCallbacks(prev => {
      const { [errorId]: _, ...rest } = prev
      return rest
    })
  }

  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2 pointer-events-none">
      {errors.slice(0, 5).map((error, index) => (
        <div
          key={error.requestId}
          className="pointer-events-auto"
          style={{ 
            transform: `translateY(${index * 10}px)`,
            zIndex: 50 - index
          }}
        >
          <ErrorNotification
            error={error}
            onDismiss={(errorId) => {
              clearError(errorId)
              unregisterRetryCallback(errorId)
            }}
            onRetry={retryCallbacks[error.requestId]}
          />
        </div>
      ))}
    </div>
  )
}

// Hook to register retry callbacks for specific errors
export function useErrorRetry() {
  const { errors } = useErrorContext()
  const [retryCallbacks, setRetryCallbacks] = useState<Record<string, () => void>>({})

  const registerRetry = (errorId: string, callback: () => void) => {
    setRetryCallbacks(prev => ({ ...prev, [errorId]: callback }))
  }

  const unregisterRetry = (errorId: string) => {
    setRetryCallbacks(prev => {
      const { [errorId]: _, ...rest } = prev
      return rest
    })
  }

  return { registerRetry, unregisterRetry, retryCallbacks }
}

// Success notification component
interface SuccessNotificationProps {
  message: string
  onDismiss?: () => void
  autoHide?: boolean
  hideDelay?: number
}

export function SuccessNotification({ 
  message, 
  onDismiss, 
  autoHide = true, 
  hideDelay = 3000 
}: SuccessNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isHiding, setIsHiding] = useState(false)

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleHide()
      }, hideDelay)

      return () => clearTimeout(timer)
    }
  }, [autoHide, hideDelay])

  const handleHide = () => {
    setIsHiding(true)
    setTimeout(() => {
      setIsVisible(false)
      if (onDismiss) onDismiss()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-md w-full transform transition-all duration-300 ease-in-out',
        isHiding ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      )}
    >
      <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5 text-green-600">
            <CheckCircle className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm text-green-800">
              {message}
            </p>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleHide}
            className="flex-shrink-0 h-6 w-6 p-0 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}