import { AbstractBaseService } from '../base-service'
import { ServiceHealthStatus } from '../../../types'

// Create a concrete implementation for testing
class TestService extends AbstractBaseService {
  private shouldFailHealthCheck = false
  private shouldFailInitialization = false
  private shouldFailShutdown = false
  private initializationDelay = 0
  private healthCheckDelay = 0

  constructor(serviceName: string = 'TestService') {
    super(serviceName)
  }

  async initialize(): Promise<void> {
    if (this.shouldFailInitialization) {
      throw new Error('Initialization failed')
    }
    
    if (this.initializationDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.initializationDelay))
    }
    
    this.initialized = true
    this.logger.info(`${this.serviceName} initialized`)
  }

  protected async performHealthCheck(): Promise<void> {
    if (this.shouldFailHealthCheck) {
      throw new Error('Health check failed')
    }
    
    if (this.healthCheckDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.healthCheckDelay))
    }
  }

  protected async performShutdown(): Promise<void> {
    if (this.shouldFailShutdown) {
      throw new Error('Shutdown failed')
    }
    
    this.logger.info(`${this.serviceName} shutdown`)
  }

  // Test helper methods
  setFailHealthCheck(fail: boolean): void {
    this.shouldFailHealthCheck = fail
  }

  setFailInitialization(fail: boolean): void {
    this.shouldFailInitialization = fail
  }

  setFailShutdown(fail: boolean): void {
    this.shouldFailShutdown = fail
  }

  setInitializationDelay(delay: number): void {
    this.initializationDelay = delay
  }

  setHealthCheckDelay(delay: number): void {
    this.healthCheckDelay = delay
  }

  isInitialized(): boolean {
    return this.initialized
  }
}

describe('AbstractBaseService', () => {
  let service: TestService
  let mockLogger: any

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    }
    
    service = new TestService('TestService')
    // Replace logger with mock
    ;(service as any).logger = mockLogger
  })

  afterEach(async () => {
    if (service && service.isInitialized()) {
      try {
        await service.shutdown()
      } catch (error) {
        // Ignore shutdown errors in cleanup
      }
    }
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(service.isInitialized()).toBe(false)
      
      await service.initialize()
      
      expect(service.isInitialized()).toBe(true)
      expect(mockLogger.info).toHaveBeenCalledWith('TestService initialized')
    })

    it('should handle initialization failure', async () => {
      service.setFailInitialization(true)
      
      await expect(service.initialize()).rejects.toThrow('Initialization failed')
      expect(service.isInitialized()).toBe(false)
    })

    it('should handle initialization with delay', async () => {
      service.setInitializationDelay(100)
      
      const startTime = Date.now()
      await service.initialize()
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
      expect(service.isInitialized()).toBe(true)
    })

    it('should have correct service name', () => {
      expect(service.serviceName).toBe('TestService')
    })

    it('should accept custom service name', () => {
      const customService = new TestService('CustomServiceName')
      expect(customService.serviceName).toBe('CustomServiceName')
    })
  })

  describe('health check', () => {
    it('should return unhealthy when not initialized', async () => {
      const health = await service.healthCheck()
      
      expect(health.status).toBe('unhealthy')
      expect(health.message).toBe('Service not initialized')
      expect(health.timestamp).toBeInstanceOf(Date)
      expect(health.responseTime).toBeUndefined()
    })

    it('should return healthy when initialized', async () => {
      await service.initialize()
      
      const health = await service.healthCheck()
      
      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeInstanceOf(Date)
      expect(health.responseTime).toBeGreaterThanOrEqual(0)
      expect(health.message).toBeUndefined()
    })

    it('should measure response time', async () => {
      await service.initialize()
      service.setHealthCheckDelay(50)
      
      const health = await service.healthCheck()
      
      expect(health.responseTime).toBeGreaterThanOrEqual(50)
    })

    it('should handle health check failure', async () => {
      await service.initialize()
      service.setFailHealthCheck(true)
      
      const health = await service.healthCheck()
      
      expect(health.status).toBe('unhealthy')
      expect(health.message).toBe('Health check failed')
      expect(health.timestamp).toBeInstanceOf(Date)
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Health check failed for TestService',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })

    it('should handle unknown errors in health check', async () => {
      await service.initialize()
      
      // Mock performHealthCheck to throw non-Error object
      jest.spyOn(service as any, 'performHealthCheck').mockRejectedValue('string error')
      
      const health = await service.healthCheck()
      
      expect(health.status).toBe('unhealthy')
      expect(health.message).toBe('Unknown error')
    })
  })

  describe('shutdown', () => {
    it('should shutdown successfully when initialized', async () => {
      await service.initialize()
      expect(service.isInitialized()).toBe(true)
      
      await service.shutdown()
      
      expect(service.isInitialized()).toBe(false)
      expect(mockLogger.info).toHaveBeenCalledWith('TestService shutdown completed')
    })

    it('should shutdown successfully when not initialized', async () => {
      expect(service.isInitialized()).toBe(false)
      
      await service.shutdown()
      
      expect(service.isInitialized()).toBe(false)
      expect(mockLogger.info).toHaveBeenCalledWith('TestService shutdown completed')
    })

    it('should handle shutdown failure', async () => {
      await service.initialize()
      service.setFailShutdown(true)
      
      await expect(service.shutdown()).rejects.toThrow('Shutdown failed')
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during TestService shutdown',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })

    it('should set initialized to false even after shutdown failure', async () => {
      await service.initialize()
      service.setFailShutdown(true)
      
      try {
        await service.shutdown()
      } catch (error) {
        // Expected to fail
      }
      
      expect(service.isInitialized()).toBe(false)
    })
  })

  describe('ensureInitialized', () => {
    it('should not throw when service is initialized', async () => {
      await service.initialize()
      
      expect(() => (service as any).ensureInitialized()).not.toThrow()
    })

    it('should throw when service is not initialized', () => {
      expect(() => (service as any).ensureInitialized()).toThrow('TestService is not initialized')
    })

    it('should throw with correct service name', () => {
      const customService = new TestService('CustomService')
      
      expect(() => (customService as any).ensureInitialized()).toThrow('CustomService is not initialized')
    })
  })

  describe('logger integration', () => {
    it('should use provided logger', () => {
      const customLogger = {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      }
      
      const serviceWithLogger = new TestService('ServiceWithLogger')
      ;(serviceWithLogger as any).logger = customLogger
      
      expect((serviceWithLogger as any).logger).toBe(customLogger)
    })

    it('should use console as default logger', () => {
      const serviceWithDefaultLogger = new TestService('DefaultLogger')
      
      expect((serviceWithDefaultLogger as any).logger).toBe(console)
    })
  })

  describe('service lifecycle', () => {
    it('should handle complete lifecycle', async () => {
      // Initial state
      expect(service.isInitialized()).toBe(false)
      
      // Initialize
      await service.initialize()
      expect(service.isInitialized()).toBe(true)
      
      // Health check
      const health = await service.healthCheck()
      expect(health.status).toBe('healthy')
      
      // Shutdown
      await service.shutdown()
      expect(service.isInitialized()).toBe(false)
      
      // Health check after shutdown
      const healthAfterShutdown = await service.healthCheck()
      expect(healthAfterShutdown.status).toBe('unhealthy')
    })

    it('should handle multiple initializations', async () => {
      await service.initialize()
      expect(service.isInitialized()).toBe(true)
      
      // Second initialization should work
      await service.initialize()
      expect(service.isInitialized()).toBe(true)
    })

    it('should handle multiple shutdowns', async () => {
      await service.initialize()
      await service.shutdown()
      expect(service.isInitialized()).toBe(false)
      
      // Second shutdown should work
      await service.shutdown()
      expect(service.isInitialized()).toBe(false)
    })
  })

  describe('error scenarios', () => {
    it('should handle service that fails both initialization and health check', async () => {
      service.setFailInitialization(true)
      service.setFailHealthCheck(true)
      
      await expect(service.initialize()).rejects.toThrow()
      
      const health = await service.healthCheck()
      expect(health.status).toBe('unhealthy')
      expect(health.message).toBe('Service not initialized')
    })

    it('should handle service that initializes but fails health check', async () => {
      await service.initialize()
      service.setFailHealthCheck(true)
      
      const health = await service.healthCheck()
      expect(health.status).toBe('unhealthy')
      expect(health.message).toBe('Health check failed')
    })
  })

  describe('performance', () => {
    it('should complete health check quickly for healthy service', async () => {
      await service.initialize()
      
      const startTime = Date.now()
      const health = await service.healthCheck()
      const endTime = Date.now()
      
      expect(health.status).toBe('healthy')
      expect(endTime - startTime).toBeLessThan(100) // Should be very fast
    })

    it('should handle concurrent health checks', async () => {
      await service.initialize()
      
      const healthPromises = Array.from({ length: 10 }, () => service.healthCheck())
      const results = await Promise.all(healthPromises)
      
      results.forEach(health => {
        expect(health.status).toBe('healthy')
        expect(health.responseTime).toBeGreaterThanOrEqual(0)
      })
    })
  })
})