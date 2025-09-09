import { ServiceRegistry, serviceRegistry, serviceUtils } from '../service-registry'
import { AbstractBaseService } from '../../base/base-service'
import { ServiceHealthStatus } from '../../../types'

// Create test service implementations
class TestServiceA extends AbstractBaseService {
  constructor() {
    super('TestServiceA')
  }

  async initialize(): Promise<void> {
    this.initialized = true
  }
}

class TestServiceB extends AbstractBaseService {
  private shouldFailHealthCheck = false

  constructor() {
    super('TestServiceB')
  }

  async initialize(): Promise<void> {
    this.initialized = true
  }

  protected async performHealthCheck(): Promise<void> {
    if (this.shouldFailHealthCheck) {
      throw new Error('Health check failed')
    }
  }

  setFailHealthCheck(fail: boolean): void {
    this.shouldFailHealthCheck = fail
  }
}

class TestServiceC extends AbstractBaseService {
  constructor() {
    super('TestServiceC')
  }

  async initialize(): Promise<void> {
    this.initialized = true
  }
}

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry
  let serviceA: TestServiceA
  let serviceB: TestServiceB
  let serviceC: TestServiceC

  beforeEach(() => {
    registry = ServiceRegistry.getInstance()
    registry.clear()
    
    serviceA = new TestServiceA()
    serviceB = new TestServiceB()
    serviceC = new TestServiceC()
  })

  afterEach(async () => {
    try {
      await registry.shutdownAll()
    } catch (error) {
      // Ignore shutdown errors in cleanup
    }
    registry.clear()
  })

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ServiceRegistry.getInstance()
      const instance2 = ServiceRegistry.getInstance()
      
      expect(instance1).toBe(instance2)
    })

    it('should return the same instance as the exported singleton', () => {
      const instance = ServiceRegistry.getInstance()
      
      expect(instance).toBe(serviceRegistry)
    })
  })

  describe('service registration', () => {
    it('should register a service successfully', () => {
      registry.register('serviceA', serviceA)
      
      expect(registry.has('serviceA')).toBe(true)
      expect(registry.get('serviceA')).toBe(serviceA)
    })

    it('should register a service with dependencies', () => {
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB, ['serviceA'])
      
      expect(registry.has('serviceB')).toBe(true)
      expect(registry.get('serviceB')).toBe(serviceB)
    })

    it('should throw error when registering duplicate service', () => {
      registry.register('serviceA', serviceA)
      
      expect(() => registry.register('serviceA', serviceB)).toThrow(
        "Service 'serviceA' is already registered"
      )
    })

    it('should register multiple services', () => {
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB)
      registry.register('serviceC', serviceC)
      
      expect(registry.getServiceCount()).toBe(3)
      expect(registry.listServiceNames()).toEqual(['serviceA', 'serviceB', 'serviceC'])
    })
  })

  describe('service retrieval', () => {
    beforeEach(() => {
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB)
    })

    it('should retrieve registered service', () => {
      const retrieved = registry.get('serviceA')
      
      expect(retrieved).toBe(serviceA)
    })

    it('should throw error when retrieving non-existent service', () => {
      expect(() => registry.get('nonExistent')).toThrow(
        "Service 'nonExistent' is not registered"
      )
    })

    it('should check if service exists', () => {
      expect(registry.has('serviceA')).toBe(true)
      expect(registry.has('nonExistent')).toBe(false)
    })

    it('should get all services', () => {
      const allServices = registry.getAll()
      
      expect(allServices.size).toBe(2)
      expect(allServices.get('serviceA')).toBe(serviceA)
      expect(allServices.get('serviceB')).toBe(serviceB)
    })
  })

  describe('service unregistration', () => {
    beforeEach(() => {
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB, ['serviceA'])
    })

    it('should unregister service without dependents', () => {
      const result = registry.unregister('serviceB')
      
      expect(result).toBe(true)
      expect(registry.has('serviceB')).toBe(false)
      expect(registry.has('serviceA')).toBe(true)
    })

    it('should throw error when unregistering service with dependents', () => {
      expect(() => registry.unregister('serviceA')).toThrow(
        "Cannot unregister service 'serviceA' because it has dependents: serviceB"
      )
    })

    it('should return false when unregistering non-existent service', () => {
      const result = registry.unregister('nonExistent')
      
      expect(result).toBe(false)
    })

    it('should allow unregistering after removing dependents', () => {
      registry.unregister('serviceB')
      const result = registry.unregister('serviceA')
      
      expect(result).toBe(true)
      expect(registry.has('serviceA')).toBe(false)
    })
  })

  describe('dependency management', () => {
    it('should handle services with no dependencies', () => {
      registry.register('serviceA', serviceA)
      
      const graph = registry.getDependencyGraph()
      expect(graph.serviceA).toEqual([])
    })

    it('should track service dependencies', () => {
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB, ['serviceA'])
      registry.register('serviceC', serviceC, ['serviceA', 'serviceB'])
      
      const graph = registry.getDependencyGraph()
      expect(graph.serviceA).toEqual([])
      expect(graph.serviceB).toEqual(['serviceA'])
      expect(graph.serviceC).toEqual(['serviceA', 'serviceB'])
    })

    it('should detect circular dependencies', async () => {
      registry.register('serviceA', serviceA, ['serviceB'])
      registry.register('serviceB', serviceB, ['serviceA'])
      
      await expect(registry.initializeAll()).rejects.toThrow(
        "Circular dependency detected involving service 'serviceA'"
      )
    })

    it('should validate dependencies exist during initialization', async () => {
      registry.register('serviceA', serviceA, ['nonExistent'])
      
      await expect(registry.initializeAll()).rejects.toThrow(
        "Service 'serviceA' depends on 'nonExistent' which is not registered"
      )
    })
  })

  describe('service initialization', () => {
    it('should initialize single service', async () => {
      registry.register('serviceA', serviceA)
      
      await registry.initializeAll()
      
      const health = await serviceA.healthCheck()
      expect(health.status).toBe('healthy')
    })

    it('should initialize services in dependency order', async () => {
      const initOrder: string[] = []
      
      // Mock initialize methods to track order
      serviceA.initialize = jest.fn().mockImplementation(async () => {
        initOrder.push('serviceA')
        ;(serviceA as any).initialized = true
      })
      
      serviceB.initialize = jest.fn().mockImplementation(async () => {
        initOrder.push('serviceB')
        ;(serviceB as any).initialized = true
      })
      
      serviceC.initialize = jest.fn().mockImplementation(async () => {
        initOrder.push('serviceC')
        ;(serviceC as any).initialized = true
      })
      
      registry.register('serviceC', serviceC, ['serviceB'])
      registry.register('serviceB', serviceB, ['serviceA'])
      registry.register('serviceA', serviceA)
      
      await registry.initializeAll()
      
      expect(initOrder).toEqual(['serviceA', 'serviceB', 'serviceC'])
    })

    it('should handle initialization failure', async () => {
      serviceA.initialize = jest.fn().mockRejectedValue(new Error('Init failed'))
      registry.register('serviceA', serviceA)
      
      await expect(registry.initializeAll()).rejects.toThrow('Init failed')
    })

    it('should log successful initialization', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      registry.register('serviceA', serviceA)
      await registry.initializeAll()
      
      expect(consoleSpy).toHaveBeenCalledWith("Service 'serviceA' initialized successfully")
      
      consoleSpy.mockRestore()
    })
  })

  describe('service shutdown', () => {
    beforeEach(async () => {
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB, ['serviceA'])
      await registry.initializeAll()
    })

    it('should shutdown services in reverse dependency order', async () => {
      const shutdownOrder: string[] = []
      
      serviceA.shutdown = jest.fn().mockImplementation(async () => {
        shutdownOrder.push('serviceA')
        ;(serviceA as any).initialized = false
      })
      
      serviceB.shutdown = jest.fn().mockImplementation(async () => {
        shutdownOrder.push('serviceB')
        ;(serviceB as any).initialized = false
      })
      
      await registry.shutdownAll()
      
      expect(shutdownOrder).toEqual(['serviceB', 'serviceA'])
    })

    it('should continue shutdown even if one service fails', async () => {
      serviceB.shutdown = jest.fn().mockRejectedValue(new Error('Shutdown failed'))
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await registry.shutdownAll()
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to shutdown service 'serviceB':",
        expect.any(Error)
      )
      
      consoleErrorSpy.mockRestore()
    })

    it('should log successful shutdown', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      await registry.shutdownAll()
      
      expect(consoleSpy).toHaveBeenCalledWith("Service 'serviceA' shutdown successfully")
      expect(consoleSpy).toHaveBeenCalledWith("Service 'serviceB' shutdown successfully")
      
      consoleSpy.mockRestore()
    })
  })

  describe('health checks', () => {
    beforeEach(async () => {
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB)
      await registry.initializeAll()
    })

    it('should perform health check on all services', async () => {
      const healthResults = await registry.healthCheck()
      
      expect(healthResults.serviceA.status).toBe('healthy')
      expect(healthResults.serviceB.status).toBe('healthy')
    })

    it('should handle health check failures', async () => {
      serviceB.setFailHealthCheck(true)
      
      const healthResults = await registry.healthCheck()
      
      expect(healthResults.serviceA.status).toBe('healthy')
      expect(healthResults.serviceB.status).toBe('unhealthy')
      expect(healthResults.serviceB.message).toBe('Health check failed')
    })

    it('should handle health check exceptions', async () => {
      serviceA.healthCheck = jest.fn().mockRejectedValue(new Error('Health check error'))
      
      const healthResults = await registry.healthCheck()
      
      expect(healthResults.serviceA.status).toBe('unhealthy')
      expect(healthResults.serviceA.message).toBe('Health check error')
    })

    it('should get services by health status', async () => {
      serviceB.setFailHealthCheck(true)
      
      const healthyServices = await registry.getServicesByStatus('healthy')
      const unhealthyServices = await registry.getServicesByStatus('unhealthy')
      
      expect(healthyServices).toEqual(['serviceA'])
      expect(unhealthyServices).toEqual(['serviceB'])
    })

    it('should check if all services are healthy', async () => {
      let allHealthy = await registry.areAllServicesHealthy()
      expect(allHealthy).toBe(true)
      
      serviceB.setFailHealthCheck(true)
      allHealthy = await registry.areAllServicesHealthy()
      expect(allHealthy).toBe(false)
    })
  })

  describe('utility methods', () => {
    beforeEach(() => {
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB)
    })

    it('should clear all services', () => {
      expect(registry.getServiceCount()).toBe(2)
      
      registry.clear()
      
      expect(registry.getServiceCount()).toBe(0)
      expect(registry.listServiceNames()).toEqual([])
    })

    it('should get service count', () => {
      expect(registry.getServiceCount()).toBe(2)
      
      registry.register('serviceC', serviceC)
      expect(registry.getServiceCount()).toBe(3)
    })

    it('should list service names', () => {
      const names = registry.listServiceNames()
      
      expect(names).toEqual(['serviceA', 'serviceB'])
    })
  })

  describe('complex dependency scenarios', () => {
    it('should handle complex dependency tree', async () => {
      // Create a complex dependency tree:
      // serviceD depends on serviceB and serviceC
      // serviceB depends on serviceA
      // serviceC depends on serviceA
      const serviceD = new TestServiceC()
      serviceD.serviceName = 'TestServiceD'
      
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB, ['serviceA'])
      registry.register('serviceC', serviceC, ['serviceA'])
      registry.register('serviceD', serviceD, ['serviceB', 'serviceC'])
      
      await registry.initializeAll()
      
      const healthResults = await registry.healthCheck()
      expect(Object.keys(healthResults)).toHaveLength(4)
      expect(healthResults.serviceA.status).toBe('healthy')
      expect(healthResults.serviceB.status).toBe('healthy')
      expect(healthResults.serviceC.status).toBe('healthy')
      expect(healthResults.serviceD.status).toBe('healthy')
    })

    it('should handle diamond dependency pattern', async () => {
      // Diamond pattern: D depends on B and C, both B and C depend on A
      const serviceD = new TestServiceC()
      serviceD.serviceName = 'TestServiceD'
      
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB, ['serviceA'])
      registry.register('serviceC', serviceC, ['serviceA'])
      registry.register('serviceD', serviceD, ['serviceB', 'serviceC'])
      
      const graph = registry.getDependencyGraph()
      expect(graph.serviceD).toEqual(['serviceB', 'serviceC'])
      expect(graph.serviceB).toEqual(['serviceA'])
      expect(graph.serviceC).toEqual(['serviceA'])
      expect(graph.serviceA).toEqual([])
    })
  })
})

describe('serviceUtils', () => {
  let registry: ServiceRegistry

  beforeEach(() => {
    registry = ServiceRegistry.getInstance()
    registry.clear()
  })

  afterEach(() => {
    registry.clear()
  })

  describe('registerWithDependencies', () => {
    it('should register service with dependency injection', async () => {
      // First register a dependency
      const serviceA = new TestServiceA()
      registry.register('serviceA', serviceA)
      
      // Register service with dependency
      const serviceB = await serviceUtils.registerWithDependencies(
        'serviceB',
        TestServiceB,
        ['serviceA']
      )
      
      expect(registry.has('serviceB')).toBe(true)
      expect(serviceB).toBeInstanceOf(TestServiceB)
    })

    it('should handle services with no dependencies', async () => {
      const service = await serviceUtils.registerWithDependencies(
        'serviceA',
        TestServiceA,
        []
      )
      
      expect(registry.has('serviceA')).toBe(true)
      expect(service).toBeInstanceOf(TestServiceA)
    })
  })

  describe('createHealthMonitor', () => {
    let serviceA: TestServiceA
    let serviceB: TestServiceB

    beforeEach(async () => {
      serviceA = new TestServiceA()
      serviceB = new TestServiceB()
      
      registry.register('serviceA', serviceA)
      registry.register('serviceB', serviceB)
      await registry.initializeAll()
    })

    it('should create health monitor', () => {
      const monitor = serviceUtils.createHealthMonitor(100)
      
      expect(monitor.start).toBeDefined()
      expect(monitor.stop).toBeDefined()
      expect(monitor.getLastResults).toBeDefined()
    })

    it('should monitor service health', (done) => {
      const monitor = serviceUtils.createHealthMonitor(50)
      
      monitor.start()
      
      setTimeout(() => {
        const results = monitor.getLastResults()
        expect(results).toBeDefined()
        expect(results?.serviceA.status).toBe('healthy')
        expect(results?.serviceB.status).toBe('healthy')
        
        monitor.stop()
        done()
      }, 100)
    })

    it('should detect unhealthy services', (done) => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const monitor = serviceUtils.createHealthMonitor(50)
      
      serviceB.setFailHealthCheck(true)
      monitor.start()
      
      setTimeout(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Unhealthy services detected:',
          expect.arrayContaining([expect.stringContaining('serviceB: unhealthy')])
        )
        
        monitor.stop()
        consoleWarnSpy.mockRestore()
        done()
      }, 100)
    })

    it('should handle health check errors', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const monitor = serviceUtils.createHealthMonitor(50)
      
      // Mock registry to throw error
      jest.spyOn(registry, 'healthCheck').mockRejectedValue(new Error('Health check failed'))
      
      monitor.start()
      
      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Health check failed:', expect.any(Error))
        
        monitor.stop()
        consoleErrorSpy.mockRestore()
        done()
      }, 100)
    })

    it('should stop monitoring', () => {
      const monitor = serviceUtils.createHealthMonitor(100)
      
      monitor.start()
      monitor.stop()
      
      // Should not throw or cause issues
      expect(monitor.getLastResults()).toBeNull()
    })

    it('should handle multiple start/stop calls', () => {
      const monitor = serviceUtils.createHealthMonitor(100)
      
      monitor.start()
      monitor.start() // Should not create duplicate intervals
      monitor.stop()
      monitor.stop() // Should not cause errors
      
      expect(true).toBe(true) // Test passes if no errors thrown
    })
  })
})