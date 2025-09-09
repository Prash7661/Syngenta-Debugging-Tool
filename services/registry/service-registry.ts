// Service registry for managing service instances and dependencies

import { IServiceRegistry, BaseService, ServiceHealthStatus } from '../../types'

export class ServiceRegistry implements IServiceRegistry {
  private static instance: ServiceRegistry
  private services = new Map<string, BaseService>()
  private dependencies = new Map<string, string[]>()

  private constructor() {}

  static getInstance(): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry()
    }
    return ServiceRegistry.instance
  }

  register<T extends BaseService>(name: string, service: T, dependencies: string[] = []): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`)
    }

    this.services.set(name, service)
    this.dependencies.set(name, dependencies)
  }

  get<T extends BaseService>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service '${name}' is not registered`)
    }
    return service as T
  }

  has(name: string): boolean {
    return this.services.has(name)
  }

  unregister(name: string): boolean {
    // Check if any other services depend on this one
    const dependents = this.findDependents(name)
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister service '${name}' because it has dependents: ${dependents.join(', ')}`
      )
    }

    const removed = this.services.delete(name)
    if (removed) {
      this.dependencies.delete(name)
    }
    return removed
  }

  getAll(): Map<string, BaseService> {
    return new Map(this.services)
  }

  async healthCheck(): Promise<Record<string, ServiceHealthStatus>> {
    const results: Record<string, ServiceHealthStatus> = {}
    
    for (const [name, service] of this.services) {
      try {
        results[name] = await service.healthCheck()
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        }
      }
    }
    
    return results
  }

  async initializeAll(): Promise<void> {
    const initOrder = this.getInitializationOrder()
    
    for (const serviceName of initOrder) {
      const service = this.services.get(serviceName)
      if (service) {
        try {
          await service.initialize()
          console.log(`Service '${serviceName}' initialized successfully`)
        } catch (error) {
          console.error(`Failed to initialize service '${serviceName}':`, error)
          throw error
        }
      }
    }
  }

  async shutdownAll(): Promise<void> {
    const shutdownOrder = this.getInitializationOrder().reverse()
    
    for (const serviceName of shutdownOrder) {
      const service = this.services.get(serviceName)
      if (service) {
        try {
          await service.shutdown()
          console.log(`Service '${serviceName}' shutdown successfully`)
        } catch (error) {
          console.error(`Failed to shutdown service '${serviceName}':`, error)
          // Continue with other services even if one fails
        }
      }
    }
  }

  // Get services in dependency order (dependencies first)
  private getInitializationOrder(): string[] {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const order: string[] = []

    const visit = (serviceName: string) => {
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving service '${serviceName}'`)
      }
      
      if (visited.has(serviceName)) {
        return
      }

      visiting.add(serviceName)
      
      const deps = this.dependencies.get(serviceName) || []
      for (const dep of deps) {
        if (!this.services.has(dep)) {
          throw new Error(`Service '${serviceName}' depends on '${dep}' which is not registered`)
        }
        visit(dep)
      }
      
      visiting.delete(serviceName)
      visited.add(serviceName)
      order.push(serviceName)
    }

    for (const serviceName of this.services.keys()) {
      visit(serviceName)
    }

    return order
  }

  // Find services that depend on the given service
  private findDependents(serviceName: string): string[] {
    const dependents: string[] = []
    
    for (const [name, deps] of this.dependencies) {
      if (deps.includes(serviceName)) {
        dependents.push(name)
      }
    }
    
    return dependents
  }

  // Get dependency graph
  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {}
    
    for (const [name, deps] of this.dependencies) {
      graph[name] = [...deps]
    }
    
    return graph
  }

  // Get services by status
  async getServicesByStatus(status: 'healthy' | 'unhealthy' | 'degraded'): Promise<string[]> {
    const healthResults = await this.healthCheck()
    
    return Object.entries(healthResults)
      .filter(([, health]) => health.status === status)
      .map(([name]) => name)
  }

  // Clear all services (useful for testing)
  clear(): void {
    this.services.clear()
    this.dependencies.clear()
  }

  // Get service count
  getServiceCount(): number {
    return this.services.size
  }

  // List service names
  listServiceNames(): string[] {
    return Array.from(this.services.keys())
  }

  // Check if all services are healthy
  async areAllServicesHealthy(): Promise<boolean> {
    const healthResults = await this.healthCheck()
    return Object.values(healthResults).every(health => health.status === 'healthy')
  }
}

// Export singleton instance
export const serviceRegistry = ServiceRegistry.getInstance()

// Utility functions for service management
export const serviceUtils = {
  // Register a service with automatic dependency injection
  async registerWithDependencies<T extends BaseService>(
    name: string,
    serviceClass: new (...args: any[]) => T,
    dependencies: string[] = [],
    ...args: any[]
  ): Promise<T> {
    // Get dependency instances
    const depInstances = dependencies.map(dep => serviceRegistry.get(dep))
    
    // Create service instance with dependencies
    const service = new serviceClass(...depInstances, ...args)
    
    // Register the service
    serviceRegistry.register(name, service, dependencies)
    
    return service
  },

  // Create a service health monitor
  createHealthMonitor(intervalMs: number = 30000): {
    start: () => void
    stop: () => void
    getLastResults: () => Record<string, ServiceHealthStatus> | null
  } {
    let intervalId: NodeJS.Timeout | null = null
    let lastResults: Record<string, ServiceHealthStatus> | null = null

    return {
      start: () => {
        if (intervalId) return

        intervalId = setInterval(async () => {
          try {
            lastResults = await serviceRegistry.healthCheck()
            
            // Log unhealthy services
            const unhealthyServices = Object.entries(lastResults)
              .filter(([, health]) => health.status !== 'healthy')
              .map(([name, health]) => `${name}: ${health.status} - ${health.message}`)
            
            if (unhealthyServices.length > 0) {
              console.warn('Unhealthy services detected:', unhealthyServices)
            }
          } catch (error) {
            console.error('Health check failed:', error)
          }
        }, intervalMs)
      },

      stop: () => {
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      },

      getLastResults: () => lastResults
    }
  }
}