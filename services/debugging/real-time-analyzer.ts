import { 
  CodeLanguage, 
  DebugError, 
  OptimizationSuggestion, 
  RealTimeAnalysisConfig, 
  LiveAnalysisResult,
  PerformanceMetrics,
  BestPracticeViolation
} from '../../types/debugging'
import { CodeAnalysisService } from './code-analysis.service'

export class RealTimeAnalyzer {
  private analysisService: CodeAnalysisService
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private analysisCache: Map<string, LiveAnalysisResult> = new Map()
  private config: RealTimeAnalysisConfig

  constructor(config: RealTimeAnalysisConfig = {
    debounceMs: 300,
    enableLiveValidation: true,
    enablePerformanceMetrics: true,
    enableBestPractices: true
  }) {
    this.analysisService = new CodeAnalysisService()
    this.config = config
  }

  /**
   * Performs debounced real-time analysis of code
   */
  async analyzeCodeRealTime(
    code: string, 
    language: CodeLanguage, 
    sessionId: string
  ): Promise<LiveAnalysisResult> {
    return new Promise((resolve) => {
      // Clear existing timer for this session
      const existingTimer = this.debounceTimers.get(sessionId)
      if (existingTimer) {
        clearTimeout(existingTimer)
      }

      // Set new debounced timer
      const timer = setTimeout(async () => {
        try {
          const result = await this.performLiveAnalysis(code, language)
          this.analysisCache.set(sessionId, result)
          resolve(result)
        } catch (error) {
          // Return cached result or empty result on error
          const cachedResult = this.analysisCache.get(sessionId)
          if (cachedResult) {
            resolve(cachedResult)
          } else {
            resolve(this.createEmptyResult())
          }
        } finally {
          this.debounceTimers.delete(sessionId)
        }
      }, this.config.debounceMs)

      this.debounceTimers.set(sessionId, timer)
    })
  }

  /**
   * Performs immediate syntax validation without debouncing
   */
  async validateSyntaxImmediate(code: string, language: CodeLanguage): Promise<DebugError[]> {
    if (!this.config.enableLiveValidation) {
      return []
    }

    try {
      return await this.analysisService.validateSyntax(code, language)
    } catch (error) {
      console.error('Immediate syntax validation failed:', error)
      return []
    }
  }

  /**
   * Calculates performance metrics for code execution time estimation
   */
  async calculatePerformanceMetrics(code: string, language: CodeLanguage): Promise<PerformanceMetrics> {
    if (!this.config.enablePerformanceMetrics) {
      return this.createEmptyPerformanceMetrics()
    }

    const startTime = performance.now()
    
    try {
      const metrics = await this.analysisService.analyzePerformance(code, language)
      const analysisTime = performance.now() - startTime
      
      // Add analysis time to the metrics
      return {
        ...metrics,
        estimatedExecutionTime: this.estimateExecutionTime(code, language, metrics),
        recommendations: [
          ...metrics.recommendations,
          ...this.generatePerformanceRecommendations(analysisTime, metrics)
        ]
      }
    } catch (error) {
      console.error('Performance metrics calculation failed:', error)
      return this.createEmptyPerformanceMetrics()
    }
  }

  /**
   * Enforces best practices with rule-based suggestions
   */
  async enforceBestPractices(code: string, language: CodeLanguage): Promise<BestPracticeViolation[]> {
    if (!this.config.enableBestPractices) {
      return []
    }

    try {
      return await this.analysisService.getBestPracticeViolations(code, language)
    } catch (error) {
      console.error('Best practices enforcement failed:', error)
      return []
    }
  }

  /**
   * Gets cached analysis result for a session
   */
  getCachedResult(sessionId: string): LiveAnalysisResult | undefined {
    return this.analysisCache.get(sessionId)
  }

  /**
   * Clears analysis cache for a session
   */
  clearCache(sessionId: string): void {
    this.analysisCache.delete(sessionId)
    const timer = this.debounceTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.debounceTimers.delete(sessionId)
    }
  }

  /**
   * Updates configuration for real-time analysis
   */
  updateConfig(newConfig: Partial<RealTimeAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  private async performLiveAnalysis(code: string, language: CodeLanguage): Promise<LiveAnalysisResult> {
    const [errors, bestPracticeViolations] = await Promise.all([
      this.validateSyntaxImmediate(code, language),
      this.enforceBestPractices(code, language)
    ])

    // Separate errors and warnings
    const actualErrors = errors.filter(e => e.severity === 'error')
    const warnings = errors.filter(e => e.severity === 'warning')

    // Convert best practice violations to suggestions
    const suggestions: OptimizationSuggestion[] = bestPracticeViolations.map(violation => ({
      id: violation.id,
      type: this.mapCategoryToOptimizationType(violation.category),
      title: violation.rule,
      description: violation.message,
      impact: violation.severity === 'error' ? 'high' : violation.severity === 'warning' ? 'medium' : 'low',
      effort: 'low',
      estimatedImprovement: violation.suggestion
    }))

    return {
      errors: actualErrors,
      warnings,
      suggestions,
      isValid: actualErrors.length === 0,
      lastUpdated: new Date()
    }
  }

  private estimateExecutionTime(code: string, language: CodeLanguage, metrics: PerformanceMetrics): number {
    // Base execution time estimation based on language and complexity
    const baseTimeMs = this.getBaseExecutionTime(language)
    const complexityMultiplier = 1 + (metrics.complexity.cyclomaticComplexity * 0.1)
    const loopMultiplier = 1 + (metrics.loopComplexity * 0.2)
    const apiCallMultiplier = 1 + (metrics.apiCallCount * 0.5)

    return baseTimeMs * complexityMultiplier * loopMultiplier * apiCallMultiplier
  }

  private getBaseExecutionTime(language: CodeLanguage): number {
    // Base execution times in milliseconds for different languages
    const baseTimes = {
      'ampscript': 50,    // AMPScript is typically slower due to SFMC processing
      'ssjs': 20,         // Server-side JavaScript is relatively fast
      'sql': 100,         // SQL queries can vary widely, using conservative estimate
      'html': 5,          // HTML parsing is very fast
      'css': 10,          // CSS processing is fast
      'javascript': 15    // Client-side JavaScript is fast
    }

    return baseTimes[language] || 25
  }

  private generatePerformanceRecommendations(
    analysisTime: number, 
    metrics: PerformanceMetrics
  ): Array<{ type: 'optimization' | 'refactoring' | 'caching', message: string, impact: 'low' | 'medium' | 'high' }> {
    const recommendations = []

    if (analysisTime > 1000) {
      recommendations.push({
        type: 'optimization' as const,
        message: 'Code analysis took longer than expected. Consider breaking down complex logic.',
        impact: 'medium' as const
      })
    }

    if (metrics.complexity.cyclomaticComplexity > 10) {
      recommendations.push({
        type: 'refactoring' as const,
        message: 'High cyclomatic complexity detected. Consider refactoring into smaller functions.',
        impact: 'high' as const
      })
    }

    if (metrics.apiCallCount > 5) {
      recommendations.push({
        type: 'caching' as const,
        message: 'Multiple API calls detected. Consider caching results to improve performance.',
        impact: 'high' as const
      })
    }

    return recommendations
  }

  private mapCategoryToOptimizationType(category: string): 'performance' | 'readability' | 'maintainability' | 'security' | 'memory' | 'accessibility' {
    const mapping: Record<string, 'performance' | 'readability' | 'maintainability' | 'security' | 'memory' | 'accessibility'> = {
      'performance': 'performance',
      'security': 'security',
      'maintainability': 'maintainability',
      'naming': 'readability',
      'structure': 'readability',
      'documentation': 'maintainability',
      'error_handling': 'maintainability'
    }

    return mapping[category] || 'maintainability'
  }

  private createEmptyResult(): LiveAnalysisResult {
    return {
      errors: [],
      warnings: [],
      suggestions: [],
      isValid: true,
      lastUpdated: new Date()
    }
  }

  private createEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      complexity: {
        cyclomaticComplexity: 0,
        cognitiveComplexity: 0,
        nestingDepth: 0,
        linesOfCode: 0
      },
      estimatedExecutionTime: 0,
      memoryUsage: {
        estimatedMemoryUsage: 0,
        variableCount: 0,
        stringConcatenations: 0,
        arrayOperations: 0
      },
      apiCallCount: 0,
      loopComplexity: 0,
      recommendations: []
    }
  }
}