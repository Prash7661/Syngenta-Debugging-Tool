// SFMC Integration Service tests

import { SFMCIntegrationService } from '../sfmc-integration.service'
import { SFMCCredentials } from '../../../types/sfmc'

describe('SFMCIntegrationService', () => {
  let service: SFMCIntegrationService

  beforeEach(() => {
    service = new SFMCIntegrationService()
  })

  afterEach(async () => {
    if (service) {
      await service.shutdown()
    }
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await service.initialize()
      
      const healthStatus = await service.healthCheck()
      expect(healthStatus.status).toBe('healthy')
    })

    it('should have correct service name', () => {
      expect(service.serviceName).toBe('SFMCIntegrationService')
    })
  })

  describe('authentication', () => {
    it('should throw error when authenticating without valid credentials', async () => {
      await service.initialize()
      
      const invalidCredentials: SFMCCredentials = {
        clientId: 'invalid',
        clientSecret: 'invalid',
        subdomain: 'invalid'
      }

      await expect(service.authenticate(invalidCredentials))
        .rejects
        .toThrow()
    })

    it('should handle authentication errors gracefully', async () => {
      await service.initialize()
      
      const credentials: SFMCCredentials = {
        clientId: '',
        clientSecret: '',
        subdomain: ''
      }

      const result = await service.authenticate(credentials).catch(error => error)
      expect(result).toBeInstanceOf(Error)
    })
  })

  describe('rate limiting', () => {
    it('should provide rate limit status', async () => {
      await service.initialize()
      
      const rateLimitStatus = service.getRateLimitStatus()
      expect(rateLimitStatus).toHaveProperty('limit')
      expect(rateLimitStatus).toHaveProperty('remaining')
      expect(rateLimitStatus).toHaveProperty('resetTime')
    })
  })

  describe('connection management', () => {
    it('should return null connection status when not connected', () => {
      const status = service.getConnectionStatus()
      expect(status).toBeNull()
    })

    it('should disconnect cleanly', async () => {
      await service.initialize()
      await service.disconnect()
      
      const status = service.getConnectionStatus()
      expect(status).toBeNull()
    })
  })

  describe('health check', () => {
    it('should report unhealthy when not initialized', async () => {
      const healthStatus = await service.healthCheck()
      expect(healthStatus.status).toBe('unhealthy')
      expect(healthStatus.message).toContain('not initialized')
    })

    it('should report healthy when initialized', async () => {
      await service.initialize()
      
      const healthStatus = await service.healthCheck()
      expect(healthStatus.status).toBe('healthy')
      expect(healthStatus.responseTime).toBeGreaterThanOrEqual(0)
    })
  })
})