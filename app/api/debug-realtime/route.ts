import { NextRequest, NextResponse } from 'next/server'
import { RealTimeAnalyzer } from '../../../services/debugging/real-time-analyzer'
import { PerformanceMetricsCalculator } from '../../../services/debugging/performance-metrics-calculator'
import { BestPracticesEnforcer } from '../../../services/debugging/best-practices-enforcer'
import { CodeLanguage, RealTimeAnalysisConfig } from '../../../types/debugging'

// Initialize analyzers
const realTimeAnalyzer = new RealTimeAnalyzer()
const performanceCalculator = new PerformanceMetricsCalculator()
const bestPracticesEnforcer = new BestPracticesEnforcer()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      code, 
      language, 
      sessionId, 
      analysisType = 'comprehensive',
      config 
    } = body

    // Validate required fields
    if (!code || !language || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: code, language, sessionId' },
        { status: 400 }
      )
    }

    // Validate language
    const validLanguages: CodeLanguage[] = ['ampscript', 'ssjs', 'sql', 'html', 'css', 'javascript']
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` },
        { status: 400 }
      )
    }

    // Update analyzer configuration if provided
    if (config) {
      realTimeAnalyzer.updateConfig(config)
    }

    let result

    switch (analysisType) {
      case 'syntax':
        // Immediate syntax validation
        const syntaxErrors = await realTimeAnalyzer.validateSyntaxImmediate(code, language)
        result = {
          type: 'syntax',
          errors: syntaxErrors,
          warnings: [],
          suggestions: [],
          isValid: syntaxErrors.filter(e => e.severity === 'error').length === 0,
          lastUpdated: new Date()
        }
        break

      case 'performance':
        // Performance metrics calculation
        const performanceMetrics = await realTimeAnalyzer.calculatePerformanceMetrics(code, language)
        result = {
          type: 'performance',
          performanceMetrics,
          recommendations: performanceMetrics.recommendations,
          estimatedExecutionTime: performanceMetrics.estimatedExecutionTime,
          lastUpdated: new Date()
        }
        break

      case 'best_practices':
        // Best practices enforcement
        const violations = await realTimeAnalyzer.enforceBestPractices(code, language)
        result = {
          type: 'best_practices',
          violations,
          violationCount: violations.length,
          criticalViolations: violations.filter(v => v.severity === 'error').length,
          lastUpdated: new Date()
        }
        break

      case 'comprehensive':
      default:
        // Full real-time analysis with debouncing
        const liveResult = await realTimeAnalyzer.analyzeCodeRealTime(code, language, sessionId)
        result = {
          type: 'comprehensive',
          ...liveResult
        }
        break
    }

    return NextResponse.json({
      success: true,
      data: result,
      sessionId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Real-time analysis error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error during analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      )
    }

    // Get cached analysis result
    const cachedResult = realTimeAnalyzer.getCachedResult(sessionId)
    
    if (!cachedResult) {
      return NextResponse.json(
        { error: 'No cached result found for session' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cachedResult,
      sessionId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Get cached result error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      )
    }

    // Clear cached analysis for session
    realTimeAnalyzer.clearCache(sessionId)

    return NextResponse.json({
      success: true,
      message: 'Session cache cleared',
      sessionId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Clear cache error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Configuration endpoint
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { config } = body

    if (!config) {
      return NextResponse.json(
        { error: 'Missing config object' },
        { status: 400 }
      )
    }

    // Validate configuration
    const validConfig: Partial<RealTimeAnalysisConfig> = {}
    
    if (typeof config.debounceMs === 'number' && config.debounceMs >= 0) {
      validConfig.debounceMs = config.debounceMs
    }
    
    if (typeof config.enableLiveValidation === 'boolean') {
      validConfig.enableLiveValidation = config.enableLiveValidation
    }
    
    if (typeof config.enablePerformanceMetrics === 'boolean') {
      validConfig.enablePerformanceMetrics = config.enablePerformanceMetrics
    }
    
    if (typeof config.enableBestPractices === 'boolean') {
      validConfig.enableBestPractices = config.enableBestPractices
    }

    // Update analyzer configuration
    realTimeAnalyzer.updateConfig(validConfig)

    return NextResponse.json({
      success: true,
      message: 'Configuration updated',
      config: validConfig,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Update config error:', error)
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}