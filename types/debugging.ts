export type CodeLanguage = 'ampscript' | 'ssjs' | 'sql' | 'html' | 'css' | 'javascript'

export type AnalysisLevel = 'syntax' | 'performance' | 'best_practices' | 'comprehensive'

export type ErrorSeverity = 'error' | 'warning' | 'info'

export interface CodeAnalysisRequest {
  code: string
  language: CodeLanguage
  analysisLevel: AnalysisLevel
  context?: SFMCContext
}

export interface CodeAnalysisResult {
  id: string
  code: string
  language: CodeLanguage
  analysisLevel: AnalysisLevel
  errors: DebugError[]
  warnings: DebugError[]
  performanceIssues: DebugError[]
  bestPracticeViolations: BestPracticeViolation[]
  optimizationSuggestions: OptimizationSuggestion[]
  performanceMetrics?: PerformanceMetrics
  fixedCode?: string
  confidence: number
  processingTime: number
  createdAt: Date
}

export interface DebugError {
  id: string
  line: number
  column: number
  severity: ErrorSeverity
  message: string
  rule: string
  category: ErrorCategory
  fixSuggestion?: string
  codeSnippet?: string
}

export interface DebugWarning extends DebugError {
  severity: 'warning'
}

export interface OptimizationSuggestion {
  id: string
  type: OptimizationType
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  beforeCode?: string
  afterCode?: string
  estimatedImprovement?: string
}

export interface PerformanceMetrics {
  complexity: ComplexityMetrics
  estimatedExecutionTime: number
  memoryUsage: MemoryMetrics
  apiCallCount: number
  loopComplexity: number
  recommendations: PerformanceRecommendation[]
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number
  cognitiveComplexity: number
  nestingDepth: number
  linesOfCode: number
}

export interface MemoryMetrics {
  estimatedMemoryUsage: number
  variableCount: number
  stringConcatenations: number
  arrayOperations: number
}

export interface PerformanceRecommendation {
  type: 'optimization' | 'refactoring' | 'caching'
  message: string
  impact: 'low' | 'medium' | 'high'
  line?: number
}

export interface BestPracticeViolation {
  id: string
  rule: string
  category: BestPracticeCategory
  severity: ErrorSeverity
  message: string
  line: number
  column?: number
  suggestion: string
  documentation?: string
}

export type ErrorCategory = 
  | 'syntax'
  | 'semantic'
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'compatibility'

export type OptimizationType = 
  | 'performance'
  | 'readability'
  | 'maintainability'
  | 'security'
  | 'memory'
  | 'accessibility'

export type BestPracticeCategory = 
  | 'naming'
  | 'structure'
  | 'performance'
  | 'security'
  | 'maintainability'
  | 'documentation'
  | 'error_handling'

export interface SFMCContext {
  dataExtensions?: DataExtensionInfo[]
  cloudPageContext?: CloudPageContext
  emailContext?: EmailContext
  journeyContext?: JourneyContext
}

export interface DataExtensionInfo {
  name: string
  fields: DataExtensionField[]
  primaryKey?: string[]
}

export interface DataExtensionField {
  name: string
  type: 'Text' | 'Number' | 'Date' | 'Boolean' | 'EmailAddress' | 'Phone' | 'Decimal'
  length?: number
  isRequired: boolean
  isPrimaryKey: boolean
}

export interface CloudPageContext {
  pageType: 'landing' | 'form' | 'preference' | 'custom'
  hasForm: boolean
  requiresAuthentication: boolean
}

export interface EmailContext {
  emailType: 'promotional' | 'transactional' | 'newsletter'
  hasPersonalization: boolean
  hasAMPScript: boolean
}

export interface JourneyContext {
  activityType: 'email' | 'sms' | 'push' | 'wait' | 'decision'
  hasPersonalization: boolean
}

// Validator interface that all language validators must implement
export interface LanguageValidator {
  validateSyntax(code: string): Promise<DebugError[]>
  validateSemantics(code: string): Promise<DebugError[]>
  analyzePerformance(code: string): Promise<DebugError[]>
  getOptimizationSuggestions(code: string): Promise<OptimizationSuggestion[]>
  generateFixedCode(code: string, errors: DebugError[]): Promise<string>
}

// Real-time analysis types
export interface RealTimeAnalysisConfig {
  debounceMs: number
  enableLiveValidation: boolean
  enablePerformanceMetrics: boolean
  enableBestPractices: boolean
}

export interface LiveAnalysisResult {
  errors: DebugError[]
  warnings: DebugError[]
  suggestions: OptimizationSuggestion[]
  isValid: boolean
  lastUpdated: Date
}