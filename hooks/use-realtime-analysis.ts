import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  CodeLanguage, 
  LiveAnalysisResult, 
  PerformanceMetrics, 
  BestPracticeViolation,
  RealTimeAnalysisConfig 
} from '../types/debugging'

interface UseRealTimeAnalysisOptions {
  sessionId: string
  debounceMs?: number
  enableLiveValidation?: boolean
  enablePerformanceMetrics?: boolean
  enableBestPractices?: boolean
}

interface RealTimeAnalysisState {
  isAnalyzing: boolean
  result: LiveAnalysisResult | null
  performanceMetrics: PerformanceMetrics | null
  bestPracticeViolations: BestPracticeViolation[]
  error: string | null
  lastAnalyzedCode: string
}

export function useRealTimeAnalysis(options: UseRealTimeAnalysisOptions) {
  const [state, setState] = useState<RealTimeAnalysisState>({
    isAnalyzing: false,
    result: null,
    performanceMetrics: null,
    bestPracticeViolations: [],
    error: null,
    lastAnalyzedCode: ''
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Configuration
  const config: RealTimeAnalysisConfig = {
    debounceMs: options.debounceMs || 300,
    enableLiveValidation: options.enableLiveValidation ?? true,
    enablePerformanceMetrics: options.enablePerformanceMetrics ?? true,
    enableBestPractices: options.enableBestPractices ?? true
  }

  /**
   * Performs real-time analysis with debouncing
   */
  const analyzeCode = useCallback(async (
    code: string, 
    language: CodeLanguage,
    analysisType: 'syntax' | 'performance' | 'best_practices' | 'comprehensive' = 'comprehensive'
  ) => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Set analyzing state
    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      error: null 
    }))

    // Debounce the analysis
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Create new abort controller
        abortControllerRef.current = new AbortController()

        const response = await fetch('/api/debug-realtime', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            language,
            sessionId: options.sessionId,
            analysisType,
            config
          }),
          signal: abortControllerRef.current.signal
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Analysis failed')
        }

        const data = await response.json()

        if (data.success) {
          setState(prev => ({
            ...prev,
            isAnalyzing: false,
            result: data.data.type === 'comprehensive' ? data.data : prev.result,
            performanceMetrics: data.data.performanceMetrics || prev.performanceMetrics,
            bestPracticeViolations: data.data.violations || prev.bestPracticeViolations,
            lastAnalyzedCode: code,
            error: null
          }))
        } else {
          throw new Error(data.error || 'Analysis failed')
        }

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled, don't update state
          return
        }

        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }))
      }
    }, config.debounceMs)
  }, [options.sessionId, config])

  /**
   * Performs immediate syntax validation without debouncing
   */
  const validateSyntaxImmediate = useCallback(async (code: string, language: CodeLanguage) => {
    try {
      setState(prev => ({ ...prev, error: null }))

      const response = await fetch('/api/debug-realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          sessionId: options.sessionId,
          analysisType: 'syntax',
          config
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Syntax validation failed')
      }

      const data = await response.json()
      
      if (data.success) {
        return data.data.errors || []
      } else {
        throw new Error(data.error || 'Syntax validation failed')
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Syntax validation failed'
      }))
      return []
    }
  }, [options.sessionId, config])

  /**
   * Gets cached analysis result
   */
  const getCachedResult = useCallback(async () => {
    try {
      const response = await fetch(`/api/debug-realtime?sessionId=${options.sessionId}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setState(prev => ({
            ...prev,
            result: data.data,
            error: null
          }))
          return data.data
        }
      }
      
      return null
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get cached result'
      }))
      return null
    }
  }, [options.sessionId])

  /**
   * Clears analysis cache
   */
  const clearCache = useCallback(async () => {
    try {
      await fetch(`/api/debug-realtime?sessionId=${options.sessionId}`, {
        method: 'DELETE'
      })

      setState({
        isAnalyzing: false,
        result: null,
        performanceMetrics: null,
        bestPracticeViolations: [],
        error: null,
        lastAnalyzedCode: ''
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear cache'
      }))
    }
  }, [options.sessionId])

  /**
   * Updates analysis configuration
   */
  const updateConfig = useCallback(async (newConfig: Partial<RealTimeAnalysisConfig>) => {
    try {
      const response = await fetch('/api/debug-realtime', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config: newConfig })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update configuration')
      }

      // Update local config
      Object.assign(config, newConfig)

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update configuration'
      }))
    }
  }, [config])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    // State
    isAnalyzing: state.isAnalyzing,
    result: state.result,
    performanceMetrics: state.performanceMetrics,
    bestPracticeViolations: state.bestPracticeViolations,
    error: state.error,
    lastAnalyzedCode: state.lastAnalyzedCode,

    // Actions
    analyzeCode,
    validateSyntaxImmediate,
    getCachedResult,
    clearCache,
    updateConfig,

    // Computed values
    hasErrors: state.result ? state.result.errors.length > 0 : false,
    hasWarnings: state.result ? state.result.warnings.length > 0 : false,
    isValid: state.result ? state.result.isValid : true,
    errorCount: state.result ? state.result.errors.length : 0,
    warningCount: state.result ? state.result.warnings.length : 0,
    suggestionCount: state.result ? state.result.suggestions.length : 0
  }
}