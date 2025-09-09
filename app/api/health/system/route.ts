// System health and metrics API endpoint

import { NextRequest, NextResponse } from 'next/server'
import { metricsCollector } from '../../../../utils/monitoring/metrics-collector'
import { withErrorHandling } from '../../../../middleware/error-middleware'
import { logger } from '../../../../utils/logging/logger'

// GET /api/health/system - Get comprehensive system health
export const GET = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now()
  
  try {
    const url = new URL(request.url)
    const format = url.searchParams.get('format') || 'json'
    const includeMetrics = url.searchParams.get('metrics') !== 'false'
    const includeAlerts = url.searchParams.get('alerts') !== 'false'

    logger.debug('System health check requested', { format, includeMetrics, includeAlerts })

    // Get comprehensive system health
    const systemHealth = metricsCollector.getSystemHealth()
    
    // Get active alerts if requested
    const alerts = includeAlerts ? metricsCollector.getActiveAlerts() : []

    const response = {
      ...systemHealth,
      alerts: alerts.length > 0 ? alerts : undefined,
      meta: {
        responseTime: Date.now() - startTime,
        format,
        generatedAt: new Date().toISOString()
      }
    }

    // Record the system health check metric
    metricsCollector.recordMetric({
      name: 'system_health_check_duration',
      value: Date.now() - startTime,
      unit: 'ms',
      timestamp: new Date(),
      tags: { endpoint: '/api/health/system', format }
    })

    // Handle different response formats
    if (format === 'prometheus') {
      const prometheusMetrics = metricsCollector.exportMetrics('prometheus')
      return new NextResponse(prometheusMetrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${Date.now() - startTime}ms`
      }
    })
  } catch (error) {
    logger.error('System health check failed', error)
    throw error
  }
})

// POST /api/health/system/alerts - Manage alerts
export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { action, alertId, threshold } = body

    switch (action) {
      case 'resolve':
        if (!alertId) {
          return NextResponse.json({
            error: 'Alert ID is required for resolve action'
          }, { status: 400 })
        }
        
        metricsCollector.resolveAlert(alertId)
        logger.info('Alert resolved via API', { alertId })
        
        return NextResponse.json({ 
          success: true, 
          message: 'Alert resolved successfully' 
        })

      case 'add_threshold':
        if (!threshold) {
          return NextResponse.json({
            error: 'Threshold configuration is required'
          }, { status: 400 })
        }
        
        metricsCollector.addThreshold(threshold)
        logger.info('Alert threshold added via API', { threshold })
        
        return NextResponse.json({ 
          success: true, 
          message: 'Alert threshold added successfully' 
        })

      case 'remove_threshold':
        if (!threshold?.metric) {
          return NextResponse.json({
            error: 'Metric name is required for remove threshold action'
          }, { status: 400 })
        }
        
        metricsCollector.removeThreshold(threshold.metric)
        logger.info('Alert threshold removed via API', { metric: threshold.metric })
        
        return NextResponse.json({ 
          success: true, 
          message: 'Alert threshold removed successfully' 
        })

      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: resolve, add_threshold, remove_threshold'
        }, { status: 400 })
    }
  } catch (error) {
    logger.error('Alert management failed', error)
    throw error
  }
})