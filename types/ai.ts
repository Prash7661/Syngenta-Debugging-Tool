// AI service types and interfaces

import { CodeLanguage, CodeBlock } from './models'

// AI Code Generation
export interface AICodeGenerationRequest {
  prompt: string
  language?: CodeLanguage
  context?: AIContext
  temperature?: number
  maxTokens?: number
  model?: AIModel
}

export interface AICodeGenerationResponse {
  content: string
  codeBlocks: CodeBlock[]
  usage: TokenUsage
  model: string
  finishReason: 'stop' | 'length' | 'content_filter'
}

export interface AIContext {
  previousMessages?: AIMessage[]
  codeContext?: string
  sfmcContext?: {
    dataExtensions?: string[]
    functions?: string[]
    variables?: Record<string, string>
  }
  userPreferences?: {
    codingStyle?: string
    verbosity?: 'concise' | 'detailed' | 'verbose'
    includeComments?: boolean
  }
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCost?: number
}

export type AIModel = 
  | 'gpt-4'
  | 'gpt-4-turbo'
  | 'gpt-3.5-turbo'
  | 'claude-3-opus'
  | 'claude-3-sonnet'
  | 'claude-3-haiku'

// AI Code Analysis
export interface AIAnalysisRequest {
  code: string
  language: CodeLanguage
  analysisType: AnalysisType[]
  context?: AIContext
}

export interface AIAnalysisResponse {
  analysis: CodeAnalysisResult
  suggestions: AISuggestion[]
  confidence: number
  processingTime: number
}

export type AnalysisType = 
  | 'syntax'
  | 'performance'
  | 'security'
  | 'best_practices'
  | 'optimization'
  | 'documentation'

export interface AISuggestion {
  type: 'fix' | 'improvement' | 'optimization' | 'alternative'
  title: string
  description: string
  originalCode?: string
  suggestedCode?: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  category: 'performance' | 'readability' | 'security' | 'maintainability'
}

export interface CodeAnalysisResult {
  overallScore: number
  issues: AnalysisIssue[]
  metrics: CodeMetrics
  suggestions: AISuggestion[]
}

export interface AnalysisIssue {
  id: string
  type: AnalysisType
  severity: 'info' | 'warning' | 'error' | 'critical'
  line: number
  column?: number
  message: string
  rule?: string
  fixable: boolean
  suggestion?: AISuggestion
}

export interface CodeMetrics {
  linesOfCode: number
  cyclomaticComplexity: number
  maintainabilityIndex: number
  technicalDebt: number
  testCoverage?: number
  duplicatedLines?: number
}

// AI Image Processing
export interface AIImageAnalysisRequest {
  imageUrl: string
  prompt: string
  analysisType: 'code_generation' | 'ui_analysis' | 'diagram_interpretation'
}

export interface AIImageAnalysisResponse {
  description: string
  extractedText?: string
  generatedCode?: CodeBlock[]
  suggestions: string[]
  confidence: number
}

// AI Service Configuration
export interface AIServiceConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'local'
  apiKey: string
  baseUrl?: string
  model: AIModel
  defaultTemperature: number
  maxTokens: number
  timeout: number
  retryAttempts: number
}

// AI Response Caching
export interface CachedAIResponse {
  id: string
  requestHash: string
  response: AICodeGenerationResponse | AIAnalysisResponse
  createdAt: Date
  expiresAt: Date
  hitCount: number
}

// AI Usage Tracking
export interface AIUsageMetrics {
  userId?: string
  sessionId: string
  requestType: 'generation' | 'analysis' | 'image'
  model: AIModel
  tokensUsed: number
  cost: number
  responseTime: number
  timestamp: Date
}

// AI Error Types
export interface AIServiceError {
  type: 'rate_limit' | 'quota_exceeded' | 'invalid_request' | 'service_unavailable' | 'content_filter'
  message: string
  retryAfter?: number
  details?: Record<string, any>
}