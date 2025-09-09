// Service layer interfaces and types

import { 
  CodeGenerationRequest, 
  CodeGenerationResponse, 
  DebugRequest, 
  DebugResponse,
  PageGenerationRequest,
  PageGenerationResponse
} from './api'
import { 
  SFMCCredentials, 
  AuthResult, 
  DataExtension, 
  DeploymentResult, 
  ValidationResult,
  SFMCConnection
} from './sfmc'
import { 
  AICodeGenerationRequest, 
  AICodeGenerationResponse, 
  AIAnalysisRequest, 
  AIAnalysisResponse,
  AIImageAnalysisRequest,
  AIImageAnalysisResponse
} from './ai'
import { UserSession, GeneratedPage } from './models'
import { ApplicationError, RetryConfig, CircuitBreakerConfig } from './errors'

// Base Service Interface
export interface BaseService {
  readonly serviceName: string
  initialize(): Promise<void>
  healthCheck(): Promise<ServiceHealthStatus>
  shutdown(): Promise<void>
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  message?: string
  timestamp: Date
  responseTime?: number
  dependencies?: Record<string, ServiceHealthStatus>
}

// AI Code Generation Service
export interface IAICodeGenerationService extends BaseService {
  generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse>
  analyzeCode(request: DebugRequest): Promise<DebugResponse>
  processImage(request: AIImageAnalysisRequest): Promise<AIImageAnalysisResponse>
  optimizeCode(code: string, language: string): Promise<string>
  explainCode(code: string, language: string): Promise<string>
  generateTests(code: string, language: string): Promise<string>
}

// SFMC Integration Service
export interface ISFMCIntegrationService extends BaseService {
  authenticate(credentials: SFMCCredentials): Promise<AuthResult>
  refreshToken(refreshToken: string): Promise<AuthResult>
  validateConnection(connectionId: string): Promise<boolean>
  getDataExtensions(connectionId: string): Promise<DataExtension[]>
  deployCloudPage(connectionId: string, page: GeneratedPage): Promise<DeploymentResult>
  validateAMPScript(code: string): Promise<ValidationResult>
  getBusinessUnits(connectionId: string): Promise<any[]>
  testConnection(credentials: SFMCCredentials): Promise<boolean>
}

// Page Generation Service
export interface IPageGenerationService extends BaseService {
  generatePages(request: PageGenerationRequest): Promise<PageGenerationResponse>
  validateConfiguration(config: any): Promise<ValidationResult[]>
  getTemplates(): Promise<any[]>
  previewPage(config: any): Promise<string>
  optimizeForMobile(html: string, css: string): Promise<{ html: string; css: string }>
}

// Session Management Service
export interface ISessionService extends BaseService {
  createSession(userId?: string): Promise<UserSession>
  getSession(sessionId: string): Promise<UserSession | null>
  updateSession(sessionId: string, updates: Partial<UserSession>): Promise<UserSession>
  deleteSession(sessionId: string): Promise<boolean>
  cleanupExpiredSessions(): Promise<number>
  extendSession(sessionId: string, duration: number): Promise<UserSession>
}

// Caching Service
export interface ICacheService extends BaseService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttl?: number): Promise<boolean>
  delete(key: string): Promise<boolean>
  exists(key: string): Promise<boolean>
  clear(pattern?: string): Promise<number>
  increment(key: string, amount?: number): Promise<number>
  expire(key: string, ttl: number): Promise<boolean>
}

// Encryption Service
export interface IEncryptionService extends BaseService {
  encrypt(data: string): Promise<{ encrypted: string; iv: string; tag: string }>
  decrypt(encrypted: string, iv: string, tag: string): Promise<string>
  hash(data: string): Promise<string>
  compare(data: string, hash: string): Promise<boolean>
  generateKey(): string
  generateSalt(): string
}

// Logging Service
export interface ILoggingService extends BaseService {
  log(level: LogLevel, message: string, meta?: Record<string, any>): void
  error(error: ApplicationError, context?: Record<string, any>): void
  info(message: string, meta?: Record<string, any>): void
  warn(message: string, meta?: Record<string, any>): void
  debug(message: string, meta?: Record<string, any>): void
  createLogger(context: string): ILogger
}

export interface ILogger {
  log(level: LogLevel, message: string, meta?: Record<string, any>): void
  error(error: ApplicationError | string, meta?: Record<string, any>): void
  info(message: string, meta?: Record<string, any>): void
  warn(message: string, meta?: Record<string, any>): void
  debug(message: string, meta?: Record<string, any>): void
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

// Monitoring Service
export interface IMonitoringService extends BaseService {
  recordMetric(name: string, value: number, tags?: Record<string, string>): void
  recordError(error: ApplicationError): void
  recordLatency(operation: string, duration: number): void
  recordCounter(name: string, increment?: number, tags?: Record<string, string>): void
  createTimer(name: string): ITimer
  getMetrics(timeRange: TimeRange): Promise<MetricData[]>
}

export interface ITimer {
  stop(tags?: Record<string, string>): number
}

export interface TimeRange {
  start: Date
  end: Date
}

export interface MetricData {
  name: string
  value: number
  timestamp: Date
  tags?: Record<string, string>
}

// Configuration Service
export interface IConfigurationService extends BaseService {
  get<T>(key: string, defaultValue?: T): T
  set(key: string, value: any): void
  has(key: string): boolean
  getAll(): Record<string, any>
  reload(): Promise<void>
  watch(key: string, callback: (value: any) => void): void
}

// Rate Limiting Service
export interface IRateLimitService extends BaseService {
  checkLimit(key: string, limit: number, window: number): Promise<RateLimitResult>
  resetLimit(key: string): Promise<boolean>
  getRemainingRequests(key: string): Promise<number>
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: Date
  retryAfter?: number
}

// Circuit Breaker Service
export interface ICircuitBreakerService extends BaseService {
  execute<T>(
    key: string, 
    operation: () => Promise<T>, 
    config?: CircuitBreakerConfig
  ): Promise<T>
  getState(key: string): string
  reset(key: string): void
  forceOpen(key: string): void
  forceClose(key: string): void
}

// Retry Service
export interface IRetryService extends BaseService {
  execute<T>(
    operation: () => Promise<T>,
    config?: RetryConfig
  ): Promise<T>
  executeWithBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    baseDelay: number
  ): Promise<T>
}

// File Storage Service
export interface IFileStorageService extends BaseService {
  upload(file: Buffer, filename: string, metadata?: Record<string, any>): Promise<FileUploadResult>
  download(fileId: string): Promise<Buffer>
  delete(fileId: string): Promise<boolean>
  getMetadata(fileId: string): Promise<FileMetadata | null>
  generateSignedUrl(fileId: string, expiresIn: number): Promise<string>
}

export interface FileUploadResult {
  fileId: string
  url: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: Date
}

export interface FileMetadata {
  fileId: string
  filename: string
  size: number
  mimeType: string
  uploadedAt: Date
  metadata?: Record<string, any>
}

// Service Factory
export interface IServiceFactory {
  createAIService(): IAICodeGenerationService
  createSFMCService(): ISFMCIntegrationService
  createPageGenerationService(): IPageGenerationService
  createSessionService(): ISessionService
  createCacheService(): ICacheService
  createEncryptionService(): IEncryptionService
  createLoggingService(): ILoggingService
  createMonitoringService(): IMonitoringService
  createConfigurationService(): IConfigurationService
  createRateLimitService(): IRateLimitService
  createCircuitBreakerService(): ICircuitBreakerService
  createRetryService(): IRetryService
  createFileStorageService(): IFileStorageService
}

// Service Registry
export interface IServiceRegistry {
  register<T extends BaseService>(name: string, service: T): void
  get<T extends BaseService>(name: string): T
  has(name: string): boolean
  unregister(name: string): boolean
  getAll(): Map<string, BaseService>
  healthCheck(): Promise<Record<string, ServiceHealthStatus>>
}