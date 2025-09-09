// Health monitoring API endpoints

import { NextRequest, NextResponse } from 'next/server'
import { metricsCollector } from '../../../utils/monitoring/metrics-collector'
import { withErrorHandling } from '../../../middleware/error-middleware'
import { logger } from '../../../utils/logging/logger'

// GET /api/health - Enhanced health check for container orchestration
export const GET = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now()
  
  try {
    // Check if this is a readiness or liveness probe
    const url = new URL(request.url)
    const probe = url.searchParams.get('probe')
    
    // Basic health information
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? process.uptime() : 0,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      hostname: process.env.HOSTNAME || 'unknown',
      pid: process.pid
    }

    // For readiness probe, check dependencies
    if (probe === 'readiness') {
      const checks = await performReadinessChecks()
      health.checks = checks
      
      // If any critical check fails, return unhealthy
      const hasFailures = checks.some(check => check.status === 'fail' && check.critical)
      if (hasFailures) {
        return NextResponse.json({
          ...health,
          status: 'unhealthy'
        }, { status: 503 })
      }
    }

    // For liveness probe, just check basic application health
    if (probe === 'liveness') {
      // Simple memory check
      const memUsage = process.memoryUsage()
      health.memory = {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      }
    }

    const responseTime = Date.now() - startTime
    
    // Record the health check metric
    metricsCollector.recordMetric({
      name: 'health_check_duration',
      value: responseTime,
      unit: 'ms',
      timestamp: new Date(),
      tags: { endpoint: '/api/health', probe: probe || 'basic' }
    })

    logger.debug('Health check completed', { responseTime, health, probe })

    return NextResponse.json(health, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
        'X-Health-Check-Type': probe || 'basic'
      }
    })
  } catch (error) {
    logger.error('Health check failed', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 })
  }
})

// Perform readiness checks for dependencies
async function performReadinessChecks() {
  const checks = []
  
  // Check Redis connection
  try {
    // This would normally check Redis connectivity
    // For now, we'll simulate the check
    checks.push({
      name: 'redis',
      status: 'pass',
      critical: true,
      time: new Date().toISOString()
    })
  } catch (error) {
    checks.push({
      name: 'redis',
      status: 'fail',
      critical: true,
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Redis connection failed'
    })
  }
  
  // Check OpenAI API availability
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY
    checks.push({
      name: 'openai',
      status: hasApiKey ? 'pass' : 'warn',
      critical: false,
      time: new Date().toISOString(),
      message: hasApiKey ? 'API key configured' : 'API key not configured'
    })
  } catch (error) {
    checks.push({
      name: 'openai',
      status: 'fail',
      critical: false,
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'OpenAI check failed'
    })
  }
  
  // Check SFMC configuration
  try {
    const hasSfmcConfig = !!(process.env.SFMC_CLIENT_ID && process.env.SFMC_CLIENT_SECRET)
    checks.push({
      name: 'sfmc',
      status: hasSfmcConfig ? 'pass' : 'warn',
      critical: false,
      time: new Date().toISOString(),
      message: hasSfmcConfig ? 'SFMC credentials configured' : 'SFMC credentials not configured'
    })
  } catch (error) {
    checks.push({
      name: 'sfmc',
      status: 'fail',
      critical: false,
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'SFMC check failed'
    })
  }
  
  return checks
}

// POST /api/health/metrics - Record custom metrics
export const POST = withErrorHandling(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { name, value, unit, tags, context } = body

    if (!name || typeof value !== 'number') {
      return NextResponse.json({
        error: 'Invalid metric data. Name and numeric value are required.'
      }, { status: 400 })
    }

    metricsCollector.recordMetric({
      name,
      value,
      unit: unit || 'count',
      timestamp: new Date(),
      tags,
      context
    })

    logger.info('Custom metric recorded', { name, value, unit, tags })

    return NextResponse.json({ 
      success: true, 
      message: 'Metric recorded successfully' 
    })
  } catch (error) {
    logger.error('Failed to record metric', error)
    throw error
  }
})