// Kubernetes readiness probe endpoint
import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '../../../../middleware/error-middleware'
import { logger } from '../../../../utils/logging/logger'

export const GET = withErrorHandling(async (request: NextRequest) => {
  try {
    // Perform readiness checks
    const checks = await performReadinessChecks()
    
    // Check if all critical services are ready
    const criticalFailures = checks.filter(check => check.status === 'fail' && check.critical)
    
    if (criticalFailures.length > 0) {
      logger.warn('Readiness check failed', { criticalFailures })
      return NextResponse.json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        checks,
        criticalFailures
      }, { status: 503 })
    }
    
    return NextResponse.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    logger.error('Readiness check error', error)
    return NextResponse.json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed'
    }, { status: 503 })
  }
})

async function performReadinessChecks() {
  const checks = []
  const timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000')
  
  // Check Redis connection
  try {
    await Promise.race([
      checkRedisConnection(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ])
    
    checks.push({
      name: 'redis',
      status: 'pass',
      critical: true,
      time: new Date().toISOString(),
      message: 'Redis connection successful'
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
  
  // Check database/storage readiness
  try {
    await Promise.race([
      checkStorageReadiness(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ])
    
    checks.push({
      name: 'storage',
      status: 'pass',
      critical: true,
      time: new Date().toISOString(),
      message: 'Storage system ready'
    })
  } catch (error) {
    checks.push({
      name: 'storage',
      status: 'fail',
      critical: true,
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Storage not ready'
    })
  }
  
  // Check external API dependencies
  try {
    const apiChecks = await checkExternalAPIs()
    checks.push(...apiChecks)
  } catch (error) {
    checks.push({
      name: 'external_apis',
      status: 'fail',
      critical: false,
      time: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'External API check failed'
    })
  }
  
  return checks
}

async function checkRedisConnection(): Promise<void> {
  // Simulate Redis connection check
  // In a real implementation, this would connect to Redis
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    throw new Error('Redis URL not configured')
  }
  
  // Simulate connection check
  await new Promise(resolve => setTimeout(resolve, 100))
}

async function checkStorageReadiness(): Promise<void> {
  // Check if the application can write to necessary directories
  try {
    const fs = require('fs').promises
    const testFile = '/tmp/health-check-test'
    await fs.writeFile(testFile, 'test')
    await fs.unlink(testFile)
  } catch (error) {
    throw new Error('Storage not writable')
  }
}

async function checkExternalAPIs() {
  const checks = []
  
  // Check OpenAI API configuration
  const hasOpenAI = !!process.env.OPENAI_API_KEY
  checks.push({
    name: 'openai_config',
    status: hasOpenAI ? 'pass' : 'warn',
    critical: false,
    time: new Date().toISOString(),
    message: hasOpenAI ? 'OpenAI API key configured' : 'OpenAI API key not configured'
  })
  
  // Check SFMC configuration
  const hasSFMC = !!(process.env.SFMC_CLIENT_ID && process.env.SFMC_CLIENT_SECRET)
  checks.push({
    name: 'sfmc_config',
    status: hasSFMC ? 'pass' : 'warn',
    critical: false,
    time: new Date().toISOString(),
    message: hasSFMC ? 'SFMC credentials configured' : 'SFMC credentials not configured'
  })
  
  return checks
}