// Error rate tracking and threshold-based alerting

import { ApplicationError, ErrorType } from '../../types/errors'
import { logger } from '../logging/logger'
import { metricsCollector } from './metrics-collector'

export interface ErrorRateConfig {
  windowSize: number // Time window in milliseconds
  thresholds: {
    warning: number // Error rate percentage for warning
    critical: number // Error rate percentage for critical alert
  }
  minRequests: number // Minimum requests needed to calculate meaningful rate
}

export interface ErrorRateMetrics {
  windowStart: Date
  windowEnd: Date
  totalRequests: number
  totalErrors: number
  errorRate: number
  errorsByType: Record<ErrorType, number>
  status: 'healthy' | 'warning' | 'critical'
  trend: 'improving' | 'stable' | 'degrading'
}

export interface ErrorRateAlert {
  id: string
  timestamp: Date
  level: 'warning' | 'critical'
  errorRate: number
  threshold: number
  windowSize: number
  totalRequests: number
  totalErrors: number
  message: string
  resolved?: Date
}

export class ErrorRateTracker {
  private config: ErrorRateConfig
  private requestCounts: Map<number, number> = new Map() // timestamp bucket -> request count
  private errorCounts: Map<number, { total: number; byType: Record<ErrorType, number> }> = new Map()
  private alerts: ErrorRateAlert[] = []
  private bucketSize = 60000 // 1 minute buckets
  private lastAlertTime = 0
  private alertCooldown = 300000 // 5 minutes between similar alerts

  constructor(config: Partial<ErrorRateConfig> = {}) {
    this.config = {
      windowSize: 5 * 60 * 1000, // 5 minutes
      thresholds: {
        warning: 5, // 5% error rate
        critical: 10 // 10% error rate
      },
      minRequests: 10,
      ...config
    }

    // Clean up old data every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Record a successful request
   */
  recordRequest(timestamp: Date = new Date()): void {
    const bucket = this.getBucket(timestamp)
    this.requestCounts.set(bucket, (this.requestCounts.get(bucket) || 0) + 1)
  }

  /**
   * Record an error
   */
  recordError(error: ApplicationError, timestamp: Date = new Date()): void {
    const bucket = this.getBucket(timestamp)
    
    // Record total request (error is also a request)
    this.recordRequest(timestamp)
    
    // Record error
    const errorData = this.errorCounts.get(bucket) || { 
      total: 0, 
      byType: {} as Record<ErrorType, number> 
    }
    
    errorData.total += 1
    errorData.byType[error.type] = (errorData.byType[error.type] || 0) + 1
    
    this.errorCounts.set(bucket, errorData)

    // Check if we need to trigger alerts
    this.checkErrorRateThresholds(timestamp)
  }

  /**
   * Get current error rate metrics
   */
  getCurrentMetrics(timestamp: Date = new Date()): ErrorRateMetrics {
    const windowStart = new Date(timestamp.getTime() - this.config.windowSize)
    const windowEnd = timestamp

    const { totalRequests, totalErrors, errorsByType } = this.getWindowData(windowStart, windowEnd)
    
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    const status = this.determineStatus(errorRate, totalRequests)
    const trend = this.calculateTrend(timestamp)

    return {
      windowStart,
      windowEnd,
      totalRequests,
      totalErrors,
      errorRate,
      errorsByType,
      status,
      trend
    }
  }

  /**
   * Get error rate for a specific time window
   */
  getErrorRateForWindow(start: Date, end: Date): ErrorRateMetrics {
    const { totalRequests, totalErrors, errorsByType } = this.getWindowData(start, end)
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    const status = this.determineStatus(errorRate, totalRequests)

    return {
      windowStart: start,
      windowEnd: end,
      totalRequests,
      totalErrors,
      errorRate,
      errorsByType,
      status,
      trend: 'stable' // Can't calculate trend for arbitrary windows
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): ErrorRateAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = new Date()
      logger.info('Error rate alert resolved', { alertId, alert })
      return true
    }
    return false
  }

  /**
   * Get error rate history for charting
   */
  getErrorRateHistory(duration: number = 60 * 60 * 1000): Array<{
    timestamp: Date
    errorRate: number
    totalRequests: number
    totalErrors: number
  }> {
    const now = new Date()
    const start = new Date(now.getTime() - duration)
    const history: Array<{
      timestamp: Date
      errorRate: number
      totalRequests: number
      totalErrors: number
    }> = []

    // Generate data points every minute
    for (let time = start.getTime(); time <= now.getTime(); time += this.bucketSize) {
      const timestamp = new Date(time)
      const windowStart = new Date(time - this.config.windowSize)
      const windowEnd = timestamp

      const { totalRequests, totalErrors } = this.getWindowData(windowStart, windowEnd)
      const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0

      history.push({
        timestamp,
        errorRate,
        totalRequests,
        totalErrors
      })
    }

    return history
  }

  /**
   * Export metrics for monitoring systems
   */
  exportMetrics(): Record<string, any> {
    const current = this.getCurrentMetrics()
    const activeAlerts = this.getActiveAlerts()

    return {
      error_rate_current: current.errorRate,
      error_rate_status: current.status,
      error_rate_trend: current.trend,
      error_rate_total_requests: current.totalRequests,
      error_rate_total_errors: current.totalErrors,
      error_rate_active_alerts: activeAlerts.length,
      error_rate_window_size_minutes: this.config.windowSize / 60000,
      error_rate_thresholds: this.config.thresholds
    }
  }

  private getBucket(timestamp: Date): number {
    return Math.floor(timestamp.getTime() / this.bucketSize) * this.bucketSize
  }

  private getWindowData(start: Date, end: Date): {
    totalRequests: number
    totalErrors: number
    errorsByType: Record<ErrorType, number>
  } {
    let totalRequests = 0
    let totalErrors = 0
    const errorsByType: Record<ErrorType, number> = {} as Record<ErrorType, number>

    const startBucket = this.getBucket(start)
    const endBucket = this.getBucket(end)

    for (let bucket = startBucket; bucket <= endBucket; bucket += this.bucketSize) {
      const requests = this.requestCounts.get(bucket) || 0
      const errors = this.errorCounts.get(bucket)

      totalRequests += requests

      if (errors) {
        totalErrors += errors.total
        
        for (const [type, count] of Object.entries(errors.byType)) {
          errorsByType[type as ErrorType] = (errorsByType[type as ErrorType] || 0) + count
        }
      }
    }

    return { totalRequests, totalErrors, errorsByType }
  }

  private determineStatus(errorRate: number, totalRequests: number): 'healthy' | 'warning' | 'critical' {
    if (totalRequests < this.config.minRequests) {
      return 'healthy' // Not enough data
    }

    if (errorRate >= this.config.thresholds.critical) {
      return 'critical'
    }

    if (errorRate >= this.config.thresholds.warning) {
      return 'warning'
    }

    return 'healthy'
  }

  private calculateTrend(timestamp: Date): 'improving' | 'stable' | 'degrading' {
    const currentWindow = this.getCurrentMetrics(timestamp)
    const previousWindowEnd = new Date(timestamp.getTime() - this.config.windowSize)
    const previousWindowStart = new Date(previousWindowEnd.getTime() - this.config.windowSize)
    
    const previousWindow = this.getErrorRateForWindow(previousWindowStart, previousWindowEnd)

    const currentRate = currentWindow.errorRate
    const previousRate = previousWindow.errorRate

    // Need minimum requests in both windows to determine trend
    if (currentWindow.totalRequests < this.config.minRequests || 
        previousWindow.totalRequests < this.config.minRequests) {
      return 'stable'
    }

    const rateDifference = currentRate - previousRate

    if (rateDifference > 1) { // Error rate increased by more than 1%
      return 'degrading'
    } else if (rateDifference < -1) { // Error rate decreased by more than 1%
      return 'improving'
    } else {
      return 'stable'
    }
  }

  private checkErrorRateThresholds(timestamp: Date): void {
    const metrics = this.getCurrentMetrics(timestamp)
    
    // Don't alert if we don't have enough requests
    if (metrics.totalRequests < this.config.minRequests) {
      return
    }

    // Check cooldown period
    if (timestamp.getTime() - this.lastAlertTime < this.alertCooldown) {
      return
    }

    let alertLevel: 'warning' | 'critical' | null = null

    if (metrics.errorRate >= this.config.thresholds.critical) {
      alertLevel = 'critical'
    } else if (metrics.errorRate >= this.config.thresholds.warning) {
      alertLevel = 'warning'
    }

    if (alertLevel) {
      this.triggerAlert(alertLevel, metrics, timestamp)
    }
  }

  private triggerAlert(level: 'warning' | 'critical', metrics: ErrorRateMetrics, timestamp: Date): void {
    const alertId = `error_rate_${level}_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`
    const threshold = this.config.thresholds[level]

    const alert: ErrorRateAlert = {
      id: alertId,
      timestamp,
      level,
      errorRate: metrics.errorRate,
      threshold,
      windowSize: this.config.windowSize,
      totalRequests: metrics.totalRequests,
      totalErrors: metrics.totalErrors,
      message: `Error rate ${metrics.errorRate.toFixed(1)}% exceeds ${level} threshold of ${threshold}% (${metrics.totalErrors}/${metrics.totalRequests} requests failed)`
    }

    this.alerts.push(alert)
    this.lastAlertTime = timestamp.getTime()

    // Log the alert
    logger.warn('Error rate alert triggered', { alert, metrics })

    // Record alert metric
    metricsCollector.recordMetric({
      name: 'error_rate_alert_triggered',
      value: 1,
      unit: 'count',
      timestamp,
      tags: {
        level,
        error_rate: metrics.errorRate.toString(),
        threshold: threshold.toString()
      }
    })

    // Send notification (placeholder)
    this.sendAlertNotification(alert)
  }

  private sendAlertNotification(alert: ErrorRateAlert): void {
    // Placeholder for alert notification logic
    // This could integrate with Slack, email, PagerDuty, etc.
    console.warn(`🚨 ERROR RATE ALERT [${alert.level.toUpperCase()}]: ${alert.message}`)
  }

  private cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // Keep 24 hours of data
    const cutoffBucket = Math.floor(cutoff / this.bucketSize) * this.bucketSize

    // Clean up old request counts
    for (const bucket of this.requestCounts.keys()) {
      if (bucket < cutoffBucket) {
        this.requestCounts.delete(bucket)
      }
    }

    // Clean up old error counts
    for (const bucket of this.errorCounts.keys()) {
      if (bucket < cutoffBucket) {
        this.errorCounts.delete(bucket)
      }
    }

    // Clean up old resolved alerts
    const alertCutoff = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)) // Keep 7 days
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || alert.resolved > alertCutoff
    )

    logger.debug('Error rate tracker cleanup completed', {
      requestBuckets: this.requestCounts.size,
      errorBuckets: this.errorCounts.size,
      alerts: this.alerts.length
    })
  }
}

// Global error rate tracker instance
export const errorRateTracker = new ErrorRateTracker()