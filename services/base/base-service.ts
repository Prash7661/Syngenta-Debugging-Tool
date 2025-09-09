// Base service implementation

import { BaseService, ServiceHealthStatus, ILogger } from '../../types'

export abstract class AbstractBaseService implements BaseService {
  protected logger: ILogger
  protected initialized = false

  constructor(
    public readonly serviceName: string,
    logger?: ILogger
  ) {
    this.logger = logger || console as any
  }

  abstract initialize(): Promise<void>

  async healthCheck(): Promise<ServiceHealthStatus> {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          message: 'Service not initialized',
          timestamp: new Date()
        }
      }

      const startTime = Date.now()
      await this.performHealthCheck()
      const responseTime = Date.now() - startTime

      return {
        status: 'healthy',
        timestamp: new Date(),
        responseTime
      }
    } catch (error) {
      this.logger.error(`Health check failed for ${this.serviceName}`, { error })
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.performShutdown()
      this.initialized = false
      this.logger.info(`${this.serviceName} shutdown completed`)
    } catch (error) {
      this.initialized = false
      this.logger.error(`Error during ${this.serviceName} shutdown`, { error })
      throw error
    }
  }

  protected async performHealthCheck(): Promise<void> {
    // Override in subclasses for specific health checks
  }

  protected async performShutdown(): Promise<void> {
    // Override in subclasses for specific shutdown logic
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(`${this.serviceName} is not initialized`)
    }
  }
}