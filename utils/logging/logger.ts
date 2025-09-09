// Centralized logging utility with structured error logging and request tracing

import { ApplicationError, ErrorContext, Breadcrumb } from '../../types/errors'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  requestId?: string
  userId?: string
  sessionId?: string
  context?: Record<string, any>
  error?: Error | ApplicationError
  breadcrumbs?: Breadcrumb[]
  tags?: string[]
  fingerprint?: string
}

export interface LoggerConfig {
  level: LogLevel
  enableRequestTracing: boolean
  enableBreadcrumbs: boolean
  maxBreadcrumbs: number
  enableStructuredLogging: boolean
  enableErrorFingerprinting: boolean
  outputs: LogOutput[]
}

export interface LogOutput {
  type: 'console' | 'file' | 'remote'
  config?: Record<string, any>
}

export class Logger {
  private config: LoggerConfig
  private context: Record<string, any>
  private breadcrumbs: Breadcrumb[] = []

  constructor(config: Partial<LoggerConfig> = {}, context: Record<string, any> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableRequestTracing: true,
      enableBreadcrumbs: true,
      maxBreadcrumbs: 50,
      enableStructuredLogging: true,
      enableErrorFingerprinting: true,
      outputs: [{ type: 'console' }],
      ...config
    }
    this.context = context
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error | ApplicationError, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, { ...context, error })
  }

  fatal(message: string, error?: Error | ApplicationError, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, { ...context, error })
  }

  // Structured error logging
  logError(error: ApplicationError, context?: ErrorContext): void {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message: error.message,
      timestamp: new Date(),
      requestId: error.requestId || context?.requestId,
      userId: error.userId || context?.userId,
      sessionId: context?.sessionId,
      context: {
        errorType: error.type,
        errorCode: error.code,
        errorDetails: error.details,
        stack: error.stack,
        ...context
      },
      error,
      breadcrumbs: this.config.enableBreadcrumbs ? [...this.breadcrumbs] : undefined,
      tags: this.generateTags(error),
      fingerprint: this.config.enableErrorFingerprinting ? this.generateFingerprint(error) : undefined
    }

    this.output(entry)
  }

  // Request tracing
  startRequest(requestId: string, method: string, url: string, userId?: string): void {
    if (!this.config.enableRequestTracing) return

    this.addBreadcrumb({
      timestamp: new Date(),
      message: `Request started: ${method} ${url}`,
      category: 'request',
      level: 'info',
      data: { requestId, method, url, userId }
    })

    this.info('Request started', {
      requestId,
      method,
      url,
      userId,
      type: 'request_start'
    })
  }

  endRequest(requestId: string, statusCode: number, duration: number, error?: Error): void {
    if (!this.config.enableRequestTracing) return

    const level = error ? 'error' : statusCode >= 400 ? 'warning' : 'info'
    
    this.addBreadcrumb({
      timestamp: new Date(),
      message: `Request completed: ${statusCode} (${duration}ms)`,
      category: 'request',
      level,
      data: { requestId, statusCode, duration, error: error?.message }
    })

    const logLevel = error ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO
    this.log(logLevel, 'Request completed', {
      requestId,
      statusCode,
      duration,
      error,
      type: 'request_end'
    })
  }

  // Performance logging
  logPerformance(operation: string, duration: number, context?: Record<string, any>): void {
    this.info(`Performance: ${operation}`, {
      operation,
      duration,
      type: 'performance',
      ...context
    })

    if (this.config.enableBreadcrumbs) {
      this.addBreadcrumb({
        timestamp: new Date(),
        message: `${operation} completed in ${duration}ms`,
        category: 'performance',
        level: duration > 1000 ? 'warning' : 'info',
        data: { operation, duration, ...context }
      })
    }
  }

  // Security logging
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: Record<string, any>): void {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                  severity === 'high' ? LogLevel.ERROR :
                  severity === 'medium' ? LogLevel.WARN : LogLevel.INFO

    this.log(level, `Security Event: ${event}`, {
      securityEvent: event,
      severity,
      type: 'security',
      ...context
    })
  }

  // Business logic logging
  logBusinessEvent(event: string, context?: Record<string, any>): void {
    this.info(`Business Event: ${event}`, {
      businessEvent: event,
      type: 'business',
      ...context
    })
  }

  // Add breadcrumb for debugging context
  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.config.enableBreadcrumbs) return

    this.breadcrumbs.push(breadcrumb)
    
    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs)
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      requestId: context?.requestId || this.context.requestId,
      userId: context?.userId || this.context.userId,
      sessionId: context?.sessionId || this.context.sessionId,
      context: { ...this.context, ...context },
      breadcrumbs: this.config.enableBreadcrumbs ? [...this.breadcrumbs] : undefined
    }

    this.output(entry)
  }

  private output(entry: LogEntry): void {
    this.config.outputs.forEach(output => {
      switch (output.type) {
        case 'console':
          this.outputToConsole(entry)
          break
        case 'file':
          this.outputToFile(entry, output.config)
          break
        case 'remote':
          this.outputToRemote(entry, output.config)
          break
      }
    })
  }

  private outputToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level]
    const timestamp = entry.timestamp.toISOString()
    
    if (this.config.enableStructuredLogging) {
      const structuredLog = {
        level: levelName,
        timestamp,
        message: entry.message,
        requestId: entry.requestId,
        userId: entry.userId,
        sessionId: entry.sessionId,
        ...entry.context,
        breadcrumbs: entry.breadcrumbs,
        tags: entry.tags,
        fingerprint: entry.fingerprint
      }

      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(JSON.stringify(structuredLog, null, 2))
          break
        case LogLevel.INFO:
          console.info(JSON.stringify(structuredLog, null, 2))
          break
        case LogLevel.WARN:
          console.warn(JSON.stringify(structuredLog, null, 2))
          break
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(JSON.stringify(structuredLog, null, 2))
          break
      }
    } else {
      // Simple console output for development
      const prefix = `[${timestamp}] ${levelName}${entry.requestId ? ` [${entry.requestId}]` : ''}`
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(`${prefix}: ${entry.message}`, entry.context)
          break
        case LogLevel.INFO:
          console.info(`${prefix}: ${entry.message}`, entry.context)
          break
        case LogLevel.WARN:
          console.warn(`${prefix}: ${entry.message}`, entry.context)
          break
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(`${prefix}: ${entry.message}`, entry.context)
          if (entry.error) {
            console.error('Error details:', entry.error)
          }
          break
      }
    }
  }

  private outputToFile(entry: LogEntry, config?: Record<string, any>): void {
    // File logging implementation would go here
    // For now, we'll just use console as fallback
    this.outputToConsole(entry)
  }

  private outputToRemote(entry: LogEntry, config?: Record<string, any>): void {
    // Remote logging implementation (e.g., to external service) would go here
    // For now, we'll just use console as fallback
    this.outputToConsole(entry)
  }

  private generateTags(error: ApplicationError): string[] {
    const tags = [error.type, error.code]
    
    if (error.details?.endpoint) {
      tags.push(`endpoint:${error.details.endpoint}`)
    }
    
    if (error.details?.provider) {
      tags.push(`provider:${error.details.provider}`)
    }

    if (error.details?.statusCode) {
      tags.push(`status:${error.details.statusCode}`)
    }

    return tags
  }

  private generateFingerprint(error: ApplicationError): string {
    const key = `${error.type}:${error.code}:${error.message}`
    return Buffer.from(key).toString('base64')
  }

  child(context: Record<string, any>): Logger {
    return new Logger(this.config, { ...this.context, ...context })
  }

  // Create logger with request context
  withRequest(requestId: string, userId?: string, sessionId?: string): Logger {
    return this.child({ requestId, userId, sessionId })
  }

  // Clear breadcrumbs
  clearBreadcrumbs(): void {
    this.breadcrumbs = []
  }
}

// Global logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableStructuredLogging: process.env.NODE_ENV === 'production',
  enableRequestTracing: true,
  enableBreadcrumbs: true
})

// Request tracing middleware helper
export function createRequestLogger(requestId: string, userId?: string, sessionId?: string): Logger {
  return logger.withRequest(requestId, userId, sessionId)
}