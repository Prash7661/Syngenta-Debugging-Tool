import { BaseService } from '../base/base-service'
import { 
  CodeAnalysisRequest, 
  CodeAnalysisResult, 
  DebugError, 
  DebugWarning, 
  OptimizationSuggestion, 
  PerformanceMetrics,
  BestPracticeViolation,
  CodeLanguage,
  AnalysisLevel,
  LanguageValidator
} from '../../types/debugging'
import { CodeAnalysisCache } from '../cache/code-analysis-cache'
import { AMPScriptValidator } from './validators/ampscript-validator'
import { SSJSValidator } from './validators/ssjs-validator'
import { SQLValidator } from './validators/sql-validator'
import { HTMLValidator } from './validators/html-validator'
import { CSSValidator } from './validators/css-validator'
import { JavaScriptValidator } from './validators/javascript-validator'
import { PerformanceAnalyzer } from './analyzers/performance-analyzer'
import { BestPracticesAnalyzer } from './analyzers/best-practices-analyzer'

export class CodeAnalysisService extends BaseService {
  private validators: Map<CodeLanguage, LanguageValidator>
  private performanceAnalyzer: PerformanceAnalyzer
  private bestPracticesAnalyzer: BestPracticesAnalyzer

  constructor() {
    super('CodeAnalysisService')
    
    // Initialize validators for each supported language
    this.validators = new Map([
      ['ampscript', new AMPScriptValidator()],
      ['ssjs', new SSJSValidator()],
      ['sql', new SQLValidator()],
      ['html', new HTMLValidator()],
      ['css', new CSSValidator()],
      ['javascript', new JavaScriptValidator()]
    ])

    this.performanceAnalyzer = new PerformanceAnalyzer()
    this.bestPracticesAnalyzer = new BestPracticesAnalyzer()
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    const startTime = Date.now()
    
    try {
      this.logger.info('Starting code analysis', { 
        language: request.language, 
        codeLength: request.code.length,
        analysisLevel: request.analysisLevel 
      })

      const validator = this.validators.get(request.language)
      if (!validator) {
        throw new Error(`Unsupported language: ${request.language}`)
      }

      // Perform syntax and semantic analysis
      const syntaxErrors = await validator.validateSyntax(request.code)
      const semanticIssues = await validator.validateSemantics(request.code)
      
      // Perform performance analysis if requested
      let performanceMetrics: PerformanceMetrics | undefined
      let performanceIssues: DebugError[] = []
      
      if (request.analysisLevel === 'performance' || request.analysisLevel === 'comprehensive') {
        performanceMetrics = await this.performanceAnalyzer.analyze(request.code, request.language)
        performanceIssues = await validator.analyzePerformance(request.code)
      }

      // Perform best practices analysis if requested
      let bestPracticeViolations: BestPracticeViolation[] = []
      let optimizationSuggestions: OptimizationSuggestion[] = []
      
      if (request.analysisLevel === 'best_practices' || request.analysisLevel === 'comprehensive') {
        bestPracticeViolations = await this.bestPracticesAnalyzer.analyze(request.code, request.language)
        optimizationSuggestions = await validator.getOptimizationSuggestions(request.code)
      }

      // Generate fixed code if errors were found
      let fixedCode: string | undefined
      if (syntaxErrors.length > 0 || semanticIssues.length > 0) {
        fixedCode = await validator.generateFixedCode(request.code, [...syntaxErrors, ...semanticIssues])
      }

      const processingTime = Date.now() - startTime

      const result: CodeAnalysisResult = {
        id: this.generateId(),
        code: request.code,
        language: request.language,
        analysisLevel: request.analysisLevel,
        errors: syntaxErrors,
        warnings: semanticIssues.filter(issue => issue.severity === 'warning'),
        performanceIssues,
        bestPracticeViolations,
        optimizationSuggestions,
        performanceMetrics,
        fixedCode,
        confidence: this.calculateConfidence(syntaxErrors, semanticIssues, performanceIssues),
        processingTime,
        createdAt: new Date()
      }

      this.logger.info('Code analysis completed', { 
        analysisId: result.id,
        errorsFound: syntaxErrors.length,
        warningsFound: semanticIssues.length,
        processingTime 
      })

      return result

    } catch (error) {
      this.logger.error('Code analysis failed', error)
      throw error
    }
  }

  async validateSyntax(code: string, language: CodeLanguage): Promise<DebugError[]> {
    const validator = this.validators.get(language)
    if (!validator) {
      throw new Error(`Unsupported language: ${language}`)
    }
    
    return await validator.validateSyntax(code)
  }

  async analyzePerformance(code: string, language: CodeLanguage): Promise<PerformanceMetrics> {
    return await this.performanceAnalyzer.analyze(code, language)
  }

  async getBestPracticeViolations(code: string, language: CodeLanguage): Promise<BestPracticeViolation[]> {
    return await this.bestPracticesAnalyzer.analyze(code, language)
  }

  private calculateConfidence(
    syntaxErrors: DebugError[], 
    semanticIssues: DebugError[], 
    performanceIssues: DebugError[]
  ): number {
    const totalIssues = syntaxErrors.length + semanticIssues.length + performanceIssues.length
    
    if (totalIssues === 0) return 1.0
    
    // Weight different types of issues
    const syntaxWeight = 0.5
    const semanticWeight = 0.3
    const performanceWeight = 0.2
    
    const weightedScore = (
      (syntaxErrors.length * syntaxWeight) +
      (semanticIssues.length * semanticWeight) +
      (performanceIssues.length * performanceWeight)
    ) / totalIssues
    
    return Math.max(0.1, 1.0 - weightedScore)
  }

  private generateId(): string {
    return `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}