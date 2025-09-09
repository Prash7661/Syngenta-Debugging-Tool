// API request and response interfaces

import { CodeLanguage, DebugLanguage, Message, CodeBlock, DebugError, OptimizationSuggestion, PageConfiguration, GeneratedOutput, DebugAnalysis } from './models'

// Code Generation API
export interface CodeGenerationRequest {
  prompt: string
  language?: CodeLanguage
  image?: string
  conversationHistory: Message[]
  context?: SFMCContext
}

export interface CodeGenerationResponse {
  response: string
  codeBlocks: CodeBlock[]
  suggestions: string[]
  executionTime: number
}

export interface SFMCContext {
  dataExtensions?: string[]
  ampscriptFunctions?: string[]
  availableVariables?: Record<string, string>
  businessUnit?: string
}

// Debugging API
export interface DebugRequest {
  code: string
  language: DebugLanguage
  analysisLevel: 'syntax' | 'performance' | 'security' | 'all'
  conversationHistory?: DebugMessage[]
}

export interface DebugResponse {
  analysis: string
  errors: DebugError[]
  fixedCode?: string
  optimizations: OptimizationSuggestion[]
  performanceScore: number
}

export interface DebugMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  codeAnalysis?: DebugAnalysis
}

// Page Generation API
export interface PageGenerationRequest {
  configuration: PageConfiguration
  template?: string
  customizations?: Record<string, any>
}

export interface PageGenerationResponse {
  output: GeneratedOutput
  validationResults: ValidationResult[]
  executionTime: number
}

export interface ValidationResult {
  type: 'error' | 'warning' | 'info'
  message: string
  field?: string
  code?: string
}

// Common API Response Structure
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: ApiError
  timestamp: number
  requestId: string
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  stack?: string
}

// Pagination
export interface PaginatedRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

export interface PaginatedResponse<T> {
  items: T[]
  totalCount: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

// File Upload
export interface FileUploadRequest {
  file: File
  type: 'image' | 'code' | 'config'
  metadata?: Record<string, any>
}

export interface FileUploadResponse {
  fileId: string
  url: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: Date
}