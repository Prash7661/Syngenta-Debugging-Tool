// Kubernetes liveness probe endpoint
import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../middleware/error-middleware'
import { logger } from '../../../../utils/logging/logger'

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    // Perform liveness checks
    const checks = await performLivenessChecks()
    
    // Check if the application is alive and responsive
    const hasFailures = checks.some(check => check.status === 'fail')
    
    if (hasFailures) {
      logger.error('Liveness check failed', { checks })
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks
      }, { status: 503 })
    }
    
    return NextResponse.json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      checks
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    logger.error('Liveness check error', error)
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Liveness check failed'
    }, { status: 503 })
  }
})

async function performLivenessChecks() {
  const checks = []
  
  // Check memory usage
  try {
    const memUsage = process.memoryUsage()
    const memoryLimitMB = parseInt(process.env.MEMORY_LIMIT_MB || '1024')
    const memoryUsageMB = memUsage.heapUsed / 1024 / 1024
    const memoryUsagePercent = (memoryUsageMB / memoryLimitMB) * 100
    
    const status = memoryUsagePercent > 90 ? 'fail' : memoryUsagePercent > 80 ? 'warn' : 'pass'
    
    checks.push({
      name: 'memory',
      status,
      time: new Date().toISOString(),
      metrics: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        usagePercent: Math.round(memoryUsagePercent * 100) / 100
      },
      message: `Memory usage: ${Math.round(memoryUsagePercent)}%`
    })
  } catch (error) {
    checks.push({
      name: 'memory',
      status: 'fail',
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Memory check failed'
    })
  }
  
  // Check event loop lag
  try {
    const eventLoopLag = await measureEventLoopLag()
    const status = eventLoopLag > 100 ? 'fail' : eventLoopLag > 50 ? 'warn' : 'pass'
    
    checks.push({
      name: 'event_loop',
      status,
      time: new Date().toISOString(),
      metrics: {
        lagMs: eventLoopLag
      },
      message: `Event loop lag: ${eventLoopLag}ms`
    })
  } catch (error) {
    checks.push({
      name: 'event_loop',
      status: 'fail',
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Event loop check failed'
    })
  }
  
  // Check uptime
  try {
    const uptime = process.uptime()
    const minUptime = parseInt(process.env.MIN_UPTIME_SECONDS || '30')
    const status = uptime < minUptime ? 'warn' : 'pass'
    
    checks.push({
      name: 'uptime',
      status,
      time: new Date().toISOString(),
      metrics: {
        uptimeSeconds: uptime,
        uptimeMinutes: Math.round(uptime / 60 * 100) / 100
      },
      message: `Uptime: ${Math.round(uptime)}s`
    })
  } catch (error) {
    checks.push({
      name: 'uptime',
      status: 'fail',
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Uptime check failed'
    })
  }
  
  // Check process health
  try {
    const pid = process.pid
    const ppid = process.ppid
    
    checks.push({
      name: 'process',
      status: 'pass',
      time: new Date().toISOString(),
      metrics: {
        pid,
        ppid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      message: `Process ${pid} running on ${process.platform}`
    })
  } catch (error) {
    checks.push({
      name: 'process',
      status: 'fail',
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Process check failed'
    })
  }
  
  return checks
}

function measureEventLoopLag(): Promise<number> {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint()
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1000000 // Convert to milliseconds
      resolve(Math.round(lag * 100) / 100)
    })
  })
}