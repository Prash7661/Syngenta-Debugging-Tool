'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ApplicationError, ErrorType } from '../types/errors'
import { ErrorFactory } from '../utils/errors/error-factory'
import { globalErrorHandler } from '../utils/errors/error-handler'
import { Button } from './ui/button'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: ApplicationError, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'feature'
  resetKeys?: Array<string | number>
  resetOnPropsChange?: boolean
}

interface State {
  hasError: boolean
  error: ApplicationError | null
  errorInfo: ErrorInfo | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Convert the error to ApplicationError
    const appError = ErrorFactory.fromError(error, ErrorType.INTERNAL_SERVER_ERROR)
    const processedError = globalErrorHandler.handleError(appError)
    
    return {
      hasError: true,
      error: processedError,
      errorId: processedError.requestId
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const appError = this.state.error || ErrorFactory.fromError(error)
    
    // Log additional error info
    console.error('Error Boundary caught an error:', {
      error: appError,
      errorInfo,
      componentStack: errorInfo.componentStack
    })

    this.setState({ errorInfo })

    // Call custom error handler if provided
    if (this.props.onError && appError) {
      this.props.onError(appError, errorInfo)
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props
    const { hasError } = this.state

    if (hasError && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary()
      }
    }

    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.resetErrorBoundary()
    }
  }

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId)
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    })
  }

  handleRetry = () => {
    this.resetErrorBoundary()
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReportError = () => {
    if (this.state.error && this.state.errorId) {
      // In a real implementation, this would open a support ticket or error reporting form
      const subject = encodeURIComponent(`Error Report: ${this.state.error.type}`)
      const body = encodeURIComponent(`
Error ID: ${this.state.errorId}
Error Type: ${this.state.error.type}
Message: ${this.state.error.message}
Timestamp: ${this.state.error.timestamp}

Please describe what you were doing when this error occurred:
      `)
      
      window.open(`mailto:support@example.com?subject=${subject}&body=${body}`)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return this.renderErrorUI()
    }

    return this.props.children
  }

  private renderErrorUI() {
    const { error, errorId } = this.state
    const { level = 'component' } = this.props

    if (!error) {
      return this.renderGenericError()
    }

    const userMessage = globalErrorHandler.getUserFriendlyMessage(error)

    // Different UI based on error boundary level
    switch (level) {
      case 'page':
        return this.renderPageLevelError(userMessage, errorId)
      case 'feature':
        return this.renderFeatureLevelError(userMessage, errorId)
      default:
        return this.renderComponentLevelError(userMessage, errorId)
    }
  }

  private renderPageLevelError(userMessage: any, errorId: string | null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {userMessage.title}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {userMessage.message}
          </p>

          {errorId && (
            <p className="text-xs text-gray-400 mb-4">
              Error ID: {errorId}
            </p>
          )}

          <div className="space-y-3">
            <Button 
              onClick={this.handleRetry}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {userMessage.action || 'Try Again'}
            </Button>
            
            <Button 
              onClick={this.handleGoHome}
              variant="outline"
              className="w-full"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>

            <Button 
              onClick={this.handleReportError}
              variant="ghost"
              size="sm"
              className="w-full text-gray-500"
            >
              <Bug className="h-4 w-4 mr-2" />
              Report this error
            </Button>
          </div>
        </div>
      </div>
    )
  }

  private renderFeatureLevelError(userMessage: any, errorId: string | null) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 mb-1">
              {userMessage.title}
            </h3>
            <p className="text-sm text-red-700 mb-3">
              {userMessage.message}
            </p>
            
            {errorId && (
              <p className="text-xs text-red-600 mb-3">
                Error ID: {errorId}
              </p>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={this.handleRetry}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {userMessage.action || 'Retry'}
              </Button>
              
              <Button 
                onClick={this.handleReportError}
                size="sm"
                variant="ghost"
                className="text-red-600 hover:bg-red-100"
              >
                <Bug className="h-3 w-3 mr-1" />
                Report
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  private renderComponentLevelError(userMessage: any, errorId: string | null) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-yellow-800 font-medium">
              {userMessage.title}
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              {userMessage.message}
            </p>
          </div>
          <Button 
            onClick={this.handleRetry}
            size="sm"
            variant="ghost"
            className="ml-2 text-yellow-700 hover:bg-yellow-100"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  private renderGenericError() {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Something went wrong
            </h3>
            <p className="text-sm text-red-700 mt-1">
              An unexpected error occurred. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    )
  }
}

// Convenience wrapper components for different levels
export const PageErrorBoundary: React.FC<Omit<Props, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="page" />
)

export const FeatureErrorBoundary: React.FC<Omit<Props, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="feature" />
)

export const ComponentErrorBoundary: React.FC<Omit<Props, 'level'>> = (props) => (
  <ErrorBoundary {...props} level="component" />
)