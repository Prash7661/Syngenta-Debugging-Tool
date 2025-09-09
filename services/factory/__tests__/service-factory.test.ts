import { ServiceFactory, serviceFactory } from '../service-factory'

// Mock the AI service to avoid actual API calls and dependencies
jest.mock('../../ai/ai-code-generation.service', () => ({
  AICodeGenerationService: jest.fn().mockImplementation((config) => ({
    serviceName: 'AICodeGenerationService',
    config,
    initialize: jest.fn(),
    healthCheck: jest.fn(),
    shutdown: jest.fn()
  }))
}))

import { AICodeGenerationService } from '../../ai/ai-code-generation.service'

describe('ServiceFactory', () => {
  let factory: ServiceFactory

  beforeEach(() => {
    // Create a fresh instance for each test
    factory = ServiceFactory.getInstance()
    factory.clearServices()
  })

  afterEach(() => {
    factory.clearServices()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ServiceFactory.getInstance()
      const instance2 = ServiceFactory.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should return the same instance as the exported singleton', () => {
      const instance = ServiceFactory.getInstance()
      
      expect(instance).toBe(serviceFactory)
    })
  })

  describe('AI service creation', () => {
    beforeEach(() => {
      // Mock environment variable
      process.env.OPENAI_API_KEY = 'test-api-key'
    })

    afterEach(() => {
      delete process.env.OPENAI_API_KEY
    })

    it('should create AI service with default configuration', () => {
      const aiService = factory.createAIService()
      
      expect(aiService).toBeDefined()
      expect(aiService.serviceName).toBe('AICodeGenerationService')
    })

    it('should return the same AI service instance on multiple calls', () => {
      const aiService1 = factory.createAIService()
      const aiService2 = factory.createAIService()
      
      expect(aiService1).toBe(aiService2)
    })

    it('should create AI service with correct configuration', () => {
      const aiService = factory.createAIService()
      
      // Verify the service was created (mocked constructor should have been called)
      expect(AICodeGenerationService).toHaveBeenCalledWith({
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-4',
        defaultTemperature: 0.1,
        maxTokens: 4000,
        timeout: 120000,
        retryAttempts: 3
      })
    })

    it('should handle missing API key', () => {
      delete process.env.OPENAI_API_KEY
      
      const aiService = factory.createAIService()
      
      expect(AICodeGenerationService).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: ''
        })
      )
    })
  })

  describe('SFMC service creation', () => {
    it('should create SFMC service', () => {
      const sfmcService = factory.createSFMCService()
      
      expect(sfmcService).toBeDefined()
      expect(sfmcService.serviceName).toBe('SFMCIntegrationService')
    })

    it('should return the same SFMC service instance on multiple calls', () => {
      const sfmcService1 = factory.createSFMCService()
      const sfmcService2 = factory.createSFMCService()
      
      expect(sfmcService1).toBe(sfmcService2)
    })

    it('should create SFMC service with required methods', () => {
      const sfmcService = factory.createSFMCService()
      
      expect(sfmcService.initialize).toBeDefined()
      expect(sfmcService.healthCheck).toBeDefined()
      expect(sfmcService.shutdown).toBeDefined()
      expect(typeof sfmcService.initialize).toBe('function')
      expect(typeof sfmcService.healthCheck).toBe('function')
      expect(typeof sfmcService.shutdown).toBe('function')
    })
  })

  describe('page generation service creation', () => {
    it('should create page generation service', () => {
      const pageService = factory.createPageGenerationService()
      
      expect(pageService).toBeDefined()
      expect(pageService.serviceName).toBe('PageGenerationService')
    })

    it('should return the same page generation service instance on multiple calls', () => {
      const pageService1 = factory.createPageGenerationService()
      const pageService2 = factory.createPageGenerationService()
      
      expect(pageService1).toBe(pageService2)
    })
  })

  describe('session service creation', () => {
    it('should create session service', () => {
      const sessionService = factory.createSessionService()
      
      expect(sessionService).toBeDefined()
      expect(sessionService.serviceName).toBe('SessionService')
    })

    it('should return the same session service instance on multiple calls', () => {
      const sessionService1 = factory.createSessionService()
      const sessionService2 = factory.createSessionService()
      
      expect(sessionService1).toBe(sessionService2)
    })
  })

  describe('cache service creation', () => {
    it('should create cache service', () => {
      const cacheService = factory.createCacheService()
      
      expect(cacheService).toBeDefined()
      expect(cacheService.serviceName).toBe('CacheService')
    })

    it('should return the same cache service instance on multiple calls', () => {
      const cacheService1 = factory.createCacheService()
      const cacheService2 = factory.createCacheService()
      
      expect(cacheService1).toBe(cacheService2)
    })
  })

  describe('encryption service creation', () => {
    it('should create encryption service', () => {
      const encryptionService = factory.createEncryptionService()
      
      expect(encryptionService).toBeDefined()
      expect(encryptionService.serviceName).toBe('EncryptionService')
    })

    it('should return the same encryption service instance on multiple calls', () => {
      const encryptionService1 = factory.createEncryptionService()
      const encryptionService2 = factory.createEncryptionService()
      
      expect(encryptionService1).toBe(encryptionService2)
    })
  })

  describe('logging service creation', () => {
    it('should create logging service', () => {
      const loggingService = factory.createLoggingService()
      
      expect(loggingService).toBeDefined()
      expect(loggingService.serviceName).toBe('LoggingService')
    })
  })

  describe('monitoring service creation', () => {
    it('should create monitoring service', () => {
      const monitoringService = factory.createMonitoringService()
      
      expect(monitoringService).toBeDefined()
      expect(monitoringService.serviceName).toBe('MonitoringService')
    })
  })

  describe('configuration service creation', () => {
    it('should create configuration service', () => {
      const configService = factory.createConfigurationService()
      
      expect(configService).toBeDefined()
      expect(configService.serviceName).toBe('ConfigurationService')
    })
  })

  describe('rate limit service creation', () => {
    it('should create rate limit service', () => {
      const rateLimitService = factory.createRateLimitService()
      
      expect(rateLimitService).toBeDefined()
      expect(rateLimitService.serviceName).toBe('RateLimitService')
    })
  })

  describe('circuit breaker service creation', () => {
    it('should create circuit breaker service', () => {
      const circuitBreakerService = factory.createCircuitBreakerService()
      
      expect(circuitBreakerService).toBeDefined()
      expect(circuitBreakerService.serviceName).toBe('CircuitBreakerService')
    })
  })

  describe('retry service creation', () => {
    it('should create retry service', () => {
      const retryService = factory.createRetryService()
      
      expect(retryService).toBeDefined()
      expect(retryService.serviceName).toBe('RetryService')
    })
  })

  describe('file storage service creation', () => {
    it('should create file storage service', () => {
      const fileStorageService = factory.createFileStorageService()
      
      expect(fileStorageService).toBeDefined()
      expect(fileStorageService.serviceName).toBe('FileStorageService')
    })
  })

  describe('service management', () => {
    it('should clear all services', () => {
      // Create some services
      factory.createAIService()
      factory.createSFMCService()
      factory.createCacheService()
      
      expect(factory.listServices().length).toBeGreaterThan(0)
      
      factory.clearServices()
      
      expect(factory.listServices().length).toBe(0)
    })

    it('should list all created services', () => {
      factory.createAIService()
      factory.createSFMCService()
      
      const services = factory.listServices()
      
      expect(services).toContain('ai-service')
      expect(services).toContain('sfmc-service')
      expect(services.length).toBe(2)
    })

    it('should get service by key', () => {
      const aiService = factory.createAIService()
      
      const retrievedService = factory.getService('ai-service')
      
      expect(retrievedService).toBe(aiService)
    })

    it('should return undefined for non-existent service', () => {
      const nonExistentService = factory.getService('non-existent')
      
      expect(nonExistentService).toBeUndefined()
    })
  })

  describe('placeholder service functionality', () => {
    it('should create placeholder services with required interface', async () => {
      const placeholderService = factory.createSessionService()
      
      // Test initialization
      await expect(placeholderService.initialize()).resolves.toBeUndefined()
      
      // Test health check
      const health = await placeholderService.healthCheck()
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeInstanceOf(Date)
      
      // Test shutdown
      await expect(placeholderService.shutdown()).resolves.toBeUndefined()
    })

    it('should log service operations', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      const service = factory.createCacheService()
      
      await service.initialize()
      expect(consoleSpy).toHaveBeenCalledWith('CacheService initialized')
      
      await service.shutdown()
      expect(consoleSpy).toHaveBeenCalledWith('CacheService shutdown')
      
      consoleSpy.mockRestore()
    })
  })

  describe('error handling', () => {
    it('should handle service creation errors gracefully', () => {
      // Mock AICodeGenerationService constructor to throw
      const originalImplementation = (AICodeGenerationService as jest.Mock).mockImplementation(() => {
        throw new Error('Service creation failed')
      })
      
      expect(() => factory.createAIService()).toThrow('Service creation failed')
      
      // Restore original implementation
      originalImplementation.mockRestore()
    })
  })

  describe('service lifecycle integration', () => {
    it('should create multiple different services', () => {
      const aiService = factory.createAIService()
      const sfmcService = factory.createSFMCService()
      const cacheService = factory.createCacheService()
      const sessionService = factory.createSessionService()
      
      expect(aiService).toBeDefined()
      expect(sfmcService).toBeDefined()
      expect(cacheService).toBeDefined()
      expect(sessionService).toBeDefined()
      
      // All should be different instances
      expect(aiService).not.toBe(sfmcService)
      expect(sfmcService).not.toBe(cacheService)
      expect(cacheService).not.toBe(sessionService)
    })

    it('should maintain service instances across factory operations', () => {
      const aiService1 = factory.createAIService()
      const sfmcService = factory.createSFMCService()
      const aiService2 = factory.createAIService()
      
      expect(aiService1).toBe(aiService2)
      expect(aiService1).not.toBe(sfmcService)
    })
  })
})