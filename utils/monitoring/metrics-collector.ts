// Performance monitoring and metrics collection system

import { ApplicationError, ErrorType } from '../../types/errors'
import { logger } from '../logging/logger'

export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'rate'
  timestamp: Date
  tags?: Record<string, string>
  context?: Record<string, any>
}

export interface SystemHealthMetrics {
  timestamp: Date
  performance: {
    responseTime: PerformanceMetric
    throughput: PerformanceMetric
    errorRate: PerformanceMetric
    cpuUsage?: PerformanceMetric
    memoryUsage?: PerformanceMetric
  }
  errors: {
    totalErrors: number
    errorsByType: Record<ErrorType, number>
    criticalErrors: number
    recentErrors: ApplicationError[]
  }
  services: {
    sfmcApi: ServiceHealthStatus
    aiService: ServiceHealthStatus
    database: ServiceHealthStatus
    cache: ServiceHealthStatus
  }
  requests: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    averageResponseTime: number
    slowRequests: number
  }
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  responseTime?: number
  errorRate?: number
  lastCheck: Date
  uptime?: number
  details?: Record<string, any>
}

export interface AlertThreshold {
  metric: string
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  value: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  enabled: boolean
}

export interface Alert {
  id: string
  threshold: AlertThreshold
  currentValue: number
  triggeredAt: Date
  resolved?: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  context?: Record<string, any>
}

export class MetricsCollector {
  private metrics: PerformanceMetric[] = []
  private errors: ApplicationError[] = []
  private requests: RequestMetric[] = []
  private alerts: Alert[] = []
  private thresholds: AlertThreshold[] = []
  private maxMetricsHistory = 1000
  private maxErrorHistory = 100
  private maxRequestHistory = 1000

  constructor() {
    this.initializeDefaultThresholds()
    this.startPeriodicCollection()
  }

  // Metric collection methods
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory)
    }

    // Check for threshold violations
    this.checkThresholds(metric)

    logger.debug('Metric recorded', {
      metric: metric.name,
      value: metric.value,
      unit: metric.unit,
      tags: metric.tags
    })
  }

  recordError(error: ApplicationError): void {
    this.errors.push(error)
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(-this.maxErrorHistory)
    }

    logger.info('Error recorded for monitoring', {
      errorType: error.type,
      errorCode: error.code,
      requestId: error.requestId
    })
  }

  recordRequest(request: RequestMetric): void {
    this.requests.push(request)
    
    // Keep only recent requests
    if (this.requests.length > this.maxRequestHistory) {
      this.requests = this.requests.slice(-this.maxRequestHistory)
    }

    // Record performance metrics
    this.recordMetric({
      name: 'request_duration',
      value: request.duration,
      unit: 'ms',
      timestamp: new Date(),
      tags: {
        method: request.method,
        endpoint: request.endpoint,
        status: request.statusCode.toString()
      }
    })
  }

  // Performance monitoring
  measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now()
    
    return fn()
      .then(result => {
        const duration = Date.now() - startTime
        this.recordMetric({
          name: `operation_duration`,
          value: duration,
          unit: 'ms',
          timestamp: new Date(),
          tags: { operation, status: 'success', ...tags }
        })
        return result
      })
      .catch(error => {
        const duration = Date.now() - startTime
        this.recordMetric({
          name: `operation_duration`,
          value: duration,
          unit: 'ms',
          timestamp: new Date(),
          tags: { operation, status: 'error', ...tags }
        })
        throw error
      })
  }

  // System health assessment
  getSystemHealth(): SystemHealthMetrics {
    const now = new Date()
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000)
    const last1Hour = new Date(now.getTime() - 60 * 60 * 1000)

    const recentRequests = this.requests.filter(r => r.timestamp > last5Minutes)
    const recentErrors = this.errors.filter(e => e.timestamp > last5Minutes)
    const hourlyErrors = this.errors.filter(e => e.timestamp > last1Hour)

    const totalRequests = recentRequests.length
    const successfulRequests = recentRequests.filter(r => r.statusCode < 400).length
    const failedRequests = totalRequests - successfulRequests
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0

    const averageResponseTime = totalRequests > 0 
      ? recentRequests.reduce((sum, r) => sum + r.duration, 0) / totalRequests 
      : 0

    const slowRequests = recentRequests.filter(r => r.duration > 2000).length

    return {
      timestamp: now,
      performance: {
        responseTime: {
          name: 'average_response_time',
          value: averageResponseTime,
          unit: 'ms',
          timestamp: now
        },
        throughput: {
          name: 'requests_per_minute',
          value: totalRequests,
          unit: 'count',
          timestamp: now
        },
        errorRate: {
          name: 'error_rate',
          value: errorRate,
          unit: 'percentage',
          timestamp: now
        }
      },
      errors: {
        totalErrors: recentErrors.length,
        errorsByType: this.groupErrorsByType(hourlyErrors),
        criticalErrors: recentErrors.filter(e => 
          [ErrorType.INTERNAL_SERVER_ERROR, ErrorType.DATABASE_ERROR].includes(e.type)
        ).length,
        recentErrors: recentErrors.slice(-10)
      },
      services: {
        sfmcApi: this.checkServiceHealth('sfmc'),
        aiService: this.checkServiceHealth('ai'),
        database: this.checkServiceHealth('database'),
        cache: this.checkServiceHealth('cache')
      },
      requests: {
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime,
        slowRequests
      }
    }
  }

  // Alert management
  addThreshold(threshold: AlertThreshold): void {
    this.thresholds.push(threshold)
    logger.info('Alert threshold added', { threshold })
  }

  removeThreshold(metricName: string): void {
    this.thresholds = this.thresholds.filter(t => t.metric !== metricName)
    logger.info('Alert threshold removed', { metricName })
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = new Date()
      logger.info('Alert resolved', { alertId, alert })
    }
  }

  // Health check for individual services
  async checkServiceHealth(service: string): Promise<ServiceHealthStatus> {
    const startTime = Date.now()
    
    try {
      let isHealthy = false
      let details: Record<string, any> = {}

      switch (service) {
        case 'sfmc':
          // In a real implementation, this would ping the SFMC API
          isHealthy = await this.pingService('https://api.sfmc.example.com/health')
          break
        case 'ai':
          // Check AI service health
          isHealthy = await this.pingService('https://api.openai.com/v1/models')
          break
        case 'database':
          // Check database connection
          isHealthy = await this.checkDatabaseHealth()
          break
        case 'cache':
          // Check cache service
          isHealthy = await this.checkCacheHealth()
          break
        default:
          isHealthy = true
      }

      const responseTime = Date.now() - startTime
      const recentErrors = this.getServiceErrors(service, 5 * 60 * 1000) // Last 5 minutes
      const errorRate = this.calculateServiceErrorRate(service, 5 * 60 * 1000)

      return {
        status: this.determineHealthStatus(isHealthy, responseTime, errorRate),
        responseTime,
        errorRate,
        lastCheck: new Date(),
        details
      }
    } catch (error) {
      logger.error(`Health check failed for service: ${service}`, error)
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        details: { error: (error as Error).message }
      }
    }
  }

  // Export metrics for external monitoring systems
  exportMetrics(format: 'json' | 'prometheus' = 'json'): string {
    const health = this.getSystemHealth()
    
    if (format === 'prometheus') {
      return this.formatPrometheusMetrics(health)
    }
    
    return JSON.stringify(health, null, 2)
  }

  private initializeDefaultThresholds(): void {
    const defaultThresholds: AlertThreshold[] = [
      {
        metric: 'error_rate',
        operator: 'gt',
        value: 5,
        severity: 'medium',
        description: 'Error rate exceeds 5%',
        enabled: true
      },
      {
        metric: 'error_rate',
        operator: 'gt',
        value: 10,
        severity: 'high',
        description: 'Error rate exceeds 10%',
        enabled: true
      },
      {
        metric: 'average_response_time',
        operator: 'gt',
        value: 2000,
        severity: 'medium',
        description: 'Average response time exceeds 2 seconds',
        enabled: true
      },
      {
        metric: 'average_response_time',
        operator: 'gt',
        value: 5000,
        severity: 'high',
        description: 'Average response time exceeds 5 seconds',
        enabled: true
      }
    ]

    this.thresholds = defaultThresholds
  }

  private checkThresholds(metric: PerformanceMetric): void {
    const relevantThresholds = this.thresholds.filter(
      t => t.enabled && t.metric === metric.name
    )

    for (const threshold of relevantThresholds) {
      if (this.evaluateThreshold(metric.value, threshold)) {
        this.triggerAlert(threshold, metric.value, metric)
      }
    }
  }

  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value
      case 'gte': return value >= threshold.value
      case 'lt': return value < threshold.value
      case 'lte': return value <= threshold.value
      case 'eq': return value === threshold.value
      default: return false
    }
  }

  private triggerAlert(threshold: AlertThreshold, currentValue: number, metric: PerformanceMetric): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const alert: Alert = {
      id: alertId,
      threshold,
      currentValue,
      triggeredAt: new Date(),
      severity: threshold.severity,
      message: `${threshold.description}. Current value: ${currentValue}`,
      context: {
        metric: metric.name,
        tags: metric.tags,
        unit: metric.unit
      }
    }

    this.alerts.push(alert)
    
    logger.warn('Alert triggered', { alert })
    
    // In a real implementation, this would send notifications
    this.sendAlertNotification(alert)
  }

  private sendAlertNotification(alert: Alert): void {
    // Placeholder for alert notification logic
    // This could send emails, Slack messages, webhook calls, etc.
    console.warn(`🚨 ALERT: ${alert.message}`)
  }

  private startPeriodicCollection(): void {
    // Collect system metrics every minute
    setInterval(() => {
      this.collectSystemMetrics()
    }, 60000)

    // Clean up old data every hour
    setInterval(() => {
      this.cleanupOldData()
    }, 3600000)
  }

  private collectSystemMetrics(): void {
    const now = new Date()
    
    // Collect memory usage if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage()
      this.recordMetric({
        name: 'memory_usage',
        value: memUsage.heapUsed / 1024 / 1024, // MB
        unit: 'bytes',
        timestamp: now,
        tags: { type: 'heap_used' }
      })
    }
  }

  private cleanupOldData(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    this.errors = this.errors.filter(e => e.timestamp > cutoff)
    this.requests = this.requests.filter(r => r.timestamp > cutoff)
    
    // Resolve old alerts
    this.alerts.forEach(alert => {
      if (!alert.resolved && alert.triggeredAt < cutoff) {
        alert.resolved = new Date()
      }
    })
  }

  private groupErrorsByType(errors: ApplicationError[]): Record<ErrorType, number> {
    const grouped: Record<ErrorType, number> = {} as Record<ErrorType, number>
    
    for (const error of errors) {
      grouped[error.type] = (grouped[error.type] || 0) + 1
    }
    
    return grouped
  }

  private getServiceErrors(service: string, timeWindow: number): ApplicationError[] {
    const cutoff = new Date(Date.now() - timeWindow)
    return this.errors.filter(error => 
      error.timestamp > cutoff && 
      (error.details?.service === service || this.inferServiceFromError(error) === service)
    )
  }

  private calculateServiceErrorRate(service: string, timeWindow: number): number {
    const cutoff = new Date(Date.now() - timeWindow)
    const serviceRequests = this.requests.filter(r => 
      r.timestamp > cutoff && r.service === service
    )
    const serviceErrors = this.getServiceErrors(service, timeWindow)
    
    return serviceRequests.length > 0 
      ? (serviceErrors.length / serviceRequests.length) * 100 
      : 0
  }

  private inferServiceFromError(error: ApplicationError): string {
    if (error.type === ErrorType.SFMC_API_ERROR) return 'sfmc'
    if (error.type === ErrorType.AI_SERVICE_ERROR) return 'ai'
    if (error.type === ErrorType.DATABASE_ERROR) return 'database'
    return 'unknown'
  }

  private determineHealthStatus(
    isHealthy: boolean, 
    responseTime: number, 
    errorRate: number
  ): ServiceHealthStatus['status'] {
    if (!isHealthy || errorRate > 10) return 'unhealthy'
    if (responseTime > 5000 || errorRate > 5) return 'degraded'
    return 'healthy'
  }

  private async pingService(url: string): Promise<boolean> {
    try {
      // In a real implementation, this would make an actual HTTP request
      // For now, we'll simulate a health check
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
      return Math.random() > 0.1 // 90% success rate
    } catch {
      return false
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    // Simulate database health check
    return Math.random() > 0.05 // 95% success rate
  }

  private async checkCacheHealth(): Promise<boolean> {
    // Simulate cache health check
    return Math.random() > 0.02 // 98% success rate
  }

  private formatPrometheusMetrics(health: SystemHealthMetrics): string {
    const lines: string[] = []
    
    lines.push(`# HELP response_time_ms Average response time in milliseconds`)
    lines.push(`# TYPE response_time_ms gauge`)
    lines.push(`response_time_ms ${health.performance.responseTime.value}`)
    
    lines.push(`# HELP error_rate_percent Error rate as percentage`)
    lines.push(`# TYPE error_rate_percent gauge`)
    lines.push(`error_rate_percent ${health.performance.errorRate.value}`)
    
    lines.push(`# HELP requests_total Total number of requests`)
    lines.push(`# TYPE requests_total counter`)
    lines.push(`requests_total ${health.requests.totalRequests}`)
    
    return lines.join('\n')
  }
}

interface RequestMetric {
  timestamp: Date
  method: string
  endpoint: string
  statusCode: number
  duration: number
  service?: string
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector()