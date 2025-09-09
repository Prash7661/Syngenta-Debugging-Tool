// Core data models and interfaces

export type CodeLanguage = 'sql' | 'ampscript' | 'ssjs' | 'css' | 'html' | 'javascript' | 'typescript'
export type DebugLanguage = CodeLanguage
export type PageType = 'landing' | 'preference' | 'profile' | 'custom'
export type DebugLevel = 'basic' | 'advanced' | 'comprehensive'

// User Session Model
export interface UserSession {
  sessionId: string
  userId?: string
  sfmcCredentials?: EncryptedCredentials
  preferences: UserPreferences
  conversationHistory: ConversationHistory
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
}

export interface UserPreferences {
  defaultLanguage: CodeLanguage
  debugLevel: DebugLevel
  theme: 'light' | 'dark' | 'system'
  autoSave: boolean
  codeFormatting: FormattingOptions
}

export interface FormattingOptions {
  indentSize: number
  useTabs: boolean
  semicolons: boolean
  quotes: 'single' | 'double'
}

export interface EncryptedCredentials {
  clientId: string
  encryptedClientSecret: string
  subdomain: string
  iv: string
  tag: string
}

// Conversation and Message Models
export interface ConversationHistory {
  messages: Message[]
  totalMessages: number
  lastUpdated: Date
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string
  timestamp: number
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  language?: CodeLanguage
  codeBlocks?: CodeBlock[]
  analysisResults?: DebugAnalysis
}

export interface CodeBlock {
  language: string
  code: string
  explanation?: string
  startLine?: number
  endLine?: number
}

// Code Analysis Models
export interface CodeAnalysisResult {
  id: string
  code: string
  language: CodeLanguage
  analysis: {
    syntaxErrors: SyntaxError[]
    semanticIssues: SemanticIssue[]
    performanceIssues: PerformanceIssue[]
    securityVulnerabilities: SecurityIssue[]
    bestPracticeViolations: BestPracticeViolation[]
  }
  suggestions: CodeSuggestion[]
  fixedCode?: string
  confidence: number
  processingTime: number
  createdAt: Date
}

export interface DebugAnalysis {
  errors: DebugError[]
  warnings: DebugWarning[]
  suggestions: OptimizationSuggestion[]
  performance: PerformanceMetrics
  bestPractices: BestPracticeViolation[]
}

export interface DebugError {
  line: number
  column: number
  severity: 'error' | 'warning' | 'info'
  message: string
  rule: string
  fixSuggestion?: string
}

export interface DebugWarning {
  line: number
  column: number
  message: string
  rule: string
  suggestion?: string
}

export interface OptimizationSuggestion {
  type: 'performance' | 'readability' | 'maintainability' | 'security'
  description: string
  originalCode: string
  suggestedCode: string
  impact: 'low' | 'medium' | 'high'
}

export interface PerformanceMetrics {
  executionTime?: number
  memoryUsage?: number
  complexity: number
  maintainabilityIndex: number
  linesOfCode: number
}

export interface BestPracticeViolation {
  rule: string
  description: string
  line: number
  severity: 'info' | 'warning' | 'error'
  category: 'style' | 'performance' | 'security' | 'maintainability'
}

export interface SyntaxError {
  line: number
  column: number
  message: string
  code: string
}

export interface SemanticIssue {
  line: number
  column: number
  message: string
  type: 'undefined_variable' | 'type_mismatch' | 'unreachable_code'
}

export interface PerformanceIssue {
  line: number
  message: string
  impact: 'low' | 'medium' | 'high'
  suggestion: string
}

export interface SecurityIssue {
  line: number
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  cwe?: string
}

export interface CodeSuggestion {
  type: 'fix' | 'improvement' | 'alternative'
  description: string
  code?: string
  confidence: number
}

// Page Generation Models
export interface PageConfiguration {
  pageSettings: {
    pageName: string
    publishedURL: string
    pageType: PageType
  }
  codeResources: ResourceConfiguration
  advancedOptions: AdvancedOptions
}

export interface ResourceConfiguration {
  css: string[]
  javascript: string[]
  ampscript: string[]
  images: string[]
}

export interface AdvancedOptions {
  responsive: boolean
  framework: 'bootstrap' | 'tailwind' | 'vanilla'
  includeAnalytics: boolean
  seoOptimized: boolean
  accessibility: boolean
}

export interface GeneratedOutput {
  pages: GeneratedPage[]
  codeResources: CodeResource[]
  integrationNotes: string
  testingGuidelines: string
  deploymentInstructions: string
}

export interface GeneratedPage {
  id: string
  name: string
  html: string
  css: string
  javascript: string
  ampscript?: string
  metadata: PageMetadata
}

export interface CodeResource {
  id: string
  name: string
  type: 'css' | 'javascript' | 'ampscript'
  content: string
  dependencies: string[]
}

export interface PageMetadata {
  title: string
  description: string
  keywords: string[]
  responsive: boolean
  framework: string
  createdAt: Date
}

export interface PageTemplate {
  id: string
  name: string
  description: string
  category: string
  html: string
  css: string
  javascript?: string
  ampscript?: string
  configSchema: Record<string, any>
  preview?: string
}