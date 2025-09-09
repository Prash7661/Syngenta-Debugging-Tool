// Service factory for creating and managing service instances

import { 
  IServiceFactory,
  IAICodeGenerationService,
  ISFMCIntegrationService,
  IPageGenerationService,
  ISessionService,
  ICacheService,
  IEncryptionService,
  ILoggingService,
  IMonitoringService,
  IConfigurationService,
  IRateLimitService,
  ICircuitBreakerService,
  IRetryService,
  IFileStorageService
} from '../../types'
import { AICodeGenerationService } from '../ai/ai-code-generation.service'
import { AIServiceConfig } from '../../types/ai'

export class ServiceFactory implements IServiceFactory {
  private static instance: ServiceFactory
  private services = new Map<string, any>()

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory()
    }
    return ServiceFactory.instance
  }

  createAIService(): IAICodeGenerationService {
    const key = 'ai-service'
    if (!this.services.has(key)) {
      // Create AI service with default configuration
      const config: AIServiceConfig = {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: 'gpt-4',
        defaultTemperature: 0.1,
        maxTokens: 4000,
        timeout: 120000,
        retryAttempts: 3
      }
      
      const service = new AICodeGenerationService(config)
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createSFMCService(): ISFMCIntegrationService {
    const key = 'sfmc-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('SFMCIntegrationService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createPageGenerationService(): IPageGenerationService {
    const key = 'page-generation-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('PageGenerationService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createSessionService(): ISessionService {
    const key = 'session-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('SessionService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createCacheService(): ICacheService {
    const key = 'cache-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('CacheService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createEncryptionService(): IEncryptionService {
    const key = 'encryption-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('EncryptionService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createLoggingService(): ILoggingService {
    const key = 'logging-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('LoggingService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createMonitoringService(): IMonitoringService {
    const key = 'monitoring-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('MonitoringService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createConfigurationService(): IConfigurationService {
    const key = 'configuration-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('ConfigurationService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createRateLimitService(): IRateLimitService {
    const key = 'rate-limit-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('RateLimitService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createCircuitBreakerService(): ICircuitBreakerService {
    const key = 'circuit-breaker-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('CircuitBreakerService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createRetryService(): IRetryService {
    const key = 'retry-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('RetryService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  createFileStorageService(): IFileStorageService {
    const key = 'file-storage-service'
    if (!this.services.has(key)) {
      const service = this.createPlaceholderService('FileStorageService')
      this.services.set(key, service)
    }
    return this.services.get(key)
  }

  // Helper method to create placeholder services
  // In a real implementation, these would be actual service classes
  private createPlaceholderService(serviceName: string): any {
    return {
      serviceName,
      initialize: async () => {
        console.log(`${serviceName} initialized`)
      },
      healthCheck: async () => ({
        status: 'healthy' as const,
        timestamp: new Date()
      }),
      shutdown: async () => {
        console.log(`${serviceName} shutdown`)
      }
    }
  }

  // Clear all cached services (useful for testing)
  clearServices(): void {
    this.services.clear()
  }

  // Get service by key (for debugging)
  getService(key: string): any {
    return this.services.get(key)
  }

  // List all created services
  listServices(): string[] {
    return Array.from(this.services.keys())
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance()