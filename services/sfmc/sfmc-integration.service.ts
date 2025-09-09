// SFMC Integration Service with OAuth 2.0 authentication and secure credential management

import { AbstractBaseService } from '../base/base-service'
import { HttpClient, SFMCHttpClient } from '../../utils/http/client'
import { SFMCSoapClient, SoapRequest, SoapResponse } from './sfmc-soap-client'
import { EncryptionUtils } from '../../utils/crypto/encryption'
import { RetryManager, retryUtils } from '../../utils/errors/retry'
import { ErrorFactory } from '../../utils/errors/error-factory'
import { 
  SFMCCredentials, 
  SFMCAuthRequest, 
  SFMCAuthResponse, 
  AuthResult, 
  SFMCConnection,
  DataExtension,
  DataExtensionResponse,
  DeploymentResult,
  ValidationResult,
  CloudPageDeployment,
  RateLimitInfo,
  BusinessUnit,
  ContentAsset
} from '../../types/sfmc'
import { ApplicationError, ErrorType } from '../../types/errors'
import { CircuitBreaker, globalCircuitBreakerRegistry, defaultCircuitBreakerConfigs } from '../../utils/errors/circuit-breaker'

export interface SFMCAuthConfig {
  authUrl?: string
  restBaseUrl?: string
  soapBaseUrl?: string
  tokenRefreshThreshold?: number // Minutes before expiry to refresh
  maxRetries?: number
  timeout?: number
}

export interface EncryptedCredentials {
  clientId: string
  encryptedClientSecret: string
  subdomain: string
  iv: string
  tag: string
  key: string
}

export interface TokenInfo {
  accessToken: string
  refreshToken?: string
  expiresAt: Date
  tokenType: string
  scope?: string
}

export interface RateLimitState {
  requestCount: number
  windowStart: Date
  limit: number
  remaining: number
  resetTime: Date
}

export interface SFMCApiEndpoints {
  rest: {
    dataExtensions: string
    assets: string
    businessUnits: string
    contacts: string
  }
  soap: {
    endpoint: string
    wsdl: string
  }
}

export class SFMCIntegrationService extends AbstractBaseService {
  private httpClient: HttpClient
  private sfmcClient?: SFMCHttpClient
  private soapClient?: SFMCSoapClient
  private config: SFMCAuthConfig
  private currentConnection?: SFMCConnection
  private tokenInfo?: TokenInfo
  private circuitBreaker: CircuitBreaker
  private rateLimitState: RateLimitState
  private apiEndpoints?: SFMCApiEndpoints

  constructor(config: SFMCAuthConfig = {}) {
    super('SFMCIntegrationService')
    
    this.config = {
      authUrl: 'https://{subdomain}.auth.marketingcloudapis.com/v2/token',
      restBaseUrl: 'https://{subdomain}.rest.marketingcloudapis.com',
      soapBaseUrl: 'https://{subdomain}.soap.marketingcloudapis.com',
      tokenRefreshThreshold: 5, // Refresh 5 minutes before expiry
      maxRetries: 3,
      timeout: 60000,
      ...config
    }

    this.httpClient = new HttpClient({
      timeout: this.config.timeout,
      retries: this.config.maxRetries
    })

    // Initialize circuit breaker for SFMC API calls
    this.circuitBreaker = globalCircuitBreakerRegistry.getOrCreate(
      'sfmc_api',
      defaultCircuitBreakerConfigs.sfmc_api
    )

    // Initialize rate limiting state
    this.rateLimitState = {
      requestCount: 0,
      windowStart: new Date(),
      limit: 2500, // SFMC default hourly limit
      remaining: 2500,
      resetTime: new Date(Date.now() + 3600000) // 1 hour from now
    }
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing SFMC Integration Service')
    this.initialized = true
  }

  /**
   * Initialize API endpoints based on subdomain
   */
  private initializeApiEndpoints(subdomain: string): void {
    const restBase = this.config.restBaseUrl!.replace('{subdomain}', subdomain)
    const soapBase = this.config.soapBaseUrl!.replace('{subdomain}', subdomain)

    this.apiEndpoints = {
      rest: {
        dataExtensions: `${restBase}/data/v1/customobjectdata`,
        assets: `${restBase}/asset/v1/content/assets`,
        businessUnits: `${restBase}/platform/v1/businessunits`,
        contacts: `${restBase}/contacts/v1/contacts`
      },
      soap: {
        endpoint: `${soapBase}/Service.asmx`,
        wsdl: `${soapBase}/etframework.wsdl`
      }
    }
  }

  /**
   * Authenticate with SFMC using OAuth 2.0 client credentials flow
   */
  async authenticate(credentials: SFMCCredentials & {
    grantType?: string
    scope?: string[]
    authorizationCode?: string
  }): Promise<AuthResult & { connectionId: string; scope?: string }> {
    try {
      this.logger.info('Starting SFMC authentication', { 
        clientId: EncryptionUtils.maskSensitiveData(credentials.clientId),
        subdomain: credentials.subdomain 
      })

      const authUrl = this.config.authUrl!.replace('{subdomain}', credentials.subdomain)
      
      const authRequest: SFMCAuthRequest = {
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        subdomain: credentials.subdomain
      }

      const requestBody: any = {
        grant_type: credentials.grantType || 'client_credentials',
        client_id: authRequest.clientId,
        client_secret: authRequest.clientSecret,
        scope: credentials.scope?.join(' ') || 'email_read email_write email_send data_extensions_read data_extensions_write'
      }

      if (credentials.grantType === 'authorization_code' && credentials.authorizationCode) {
        requestBody.code = credentials.authorizationCode
      }

      const response = await retryUtils.apiCall(async () => {
        return this.httpClient.post<SFMCAuthResponse>(authUrl, requestBody)
      })

      const authResponse = response.data
      const expiresAt = new Date(Date.now() + (authResponse.expiresIn * 1000))

      // Store token information
      this.tokenInfo = {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        expiresAt,
        tokenType: authResponse.tokenType,
        scope: authResponse.scope
      }

      // Create SFMC HTTP client with token
      this.sfmcClient = new SFMCHttpClient(authResponse.accessToken)

      // Initialize API endpoints
      this.initializeApiEndpoints(credentials.subdomain)

      // Create SOAP client
      this.soapClient = new SFMCSoapClient(
        this.apiEndpoints!.soap.endpoint,
        authResponse.accessToken
      )

      // Store encrypted connection details
      await this.storeConnection(credentials, authResponse)

      this.logger.info('SFMC authentication successful', {
        expiresAt: expiresAt.toISOString(),
        scope: authResponse.scope
      })

      return {
        success: true,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        expiresAt,
        connectionId: this.currentConnection!.connectionId,
        tokenType: authResponse.tokenType,
        expiresIn: authResponse.expiresIn,
        scope: authResponse.scope
      }

    } catch (error) {
      this.logger.error('SFMC authentication failed', { error })
      
      if (error instanceof ApplicationError) {
        throw error
      }

      throw ErrorFactory.createSFMCError(
        'Authentication failed',
        'AUTH_FAILED',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken?: string): Promise<AuthResult> {
    try {
      if (!refreshToken && !this.tokenInfo?.refreshToken) {
        throw ErrorFactory.createSFMCError(
          'No refresh token available',
          'NO_REFRESH_TOKEN'
        )
      }

      if (!this.currentConnection) {
        throw ErrorFactory.createSFMCError(
          'No active connection found',
          'NO_CONNECTION'
        )
      }

      const tokenToUse = refreshToken || this.tokenInfo!.refreshToken!
      const authUrl = this.config.authUrl!.replace('{subdomain}', this.currentConnection.subdomain)

      this.logger.info('Refreshing SFMC access token')

      const response = await retryUtils.apiCall(async () => {
        return this.httpClient.post<SFMCAuthResponse>(authUrl, {
          grant_type: 'refresh_token',
          refresh_token: tokenToUse,
          client_id: this.currentConnection!.clientId
        })
      })

      const authResponse = response.data
      const expiresAt = new Date(Date.now() + (authResponse.expiresIn * 1000))

      // Update token information
      this.tokenInfo = {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken || tokenToUse,
        expiresAt,
        tokenType: authResponse.tokenType,
        scope: authResponse.scope
      }

      // Update SFMC client with new token
      if (this.sfmcClient) {
        this.sfmcClient.updateToken(authResponse.accessToken)
      }

      // Update SOAP client with new token
      if (this.soapClient) {
        this.soapClient.updateToken(authResponse.accessToken)
      }

      // Update stored connection
      this.currentConnection.accessToken = authResponse.accessToken
      this.currentConnection.refreshToken = authResponse.refreshToken || tokenToUse
      this.currentConnection.tokenExpiry = expiresAt
      this.currentConnection.connectionStatus = 'active'
      this.currentConnection.lastUsed = new Date()

      this.logger.info('Token refresh successful', {
        expiresAt: expiresAt.toISOString()
      })

      return {
        success: true,
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken || tokenToUse,
        expiresAt
      }

    } catch (error) {
      this.logger.error('Token refresh failed', { error })
      
      if (this.currentConnection) {
        this.currentConnection.connectionStatus = 'error'
      }

      throw ErrorFactory.createSFMCError(
        'Token refresh failed',
        'REFRESH_FAILED',
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }

  /**
   * Check if token needs refresh and automatically refresh if needed
   */
  async ensureValidToken(): Promise<void> {
    if (!this.tokenInfo || !this.currentConnection) {
      throw ErrorFactory.createSFMCError(
        'No active authentication session',
        'NO_AUTH_SESSION'
      )
    }

    const now = new Date()
    const refreshThreshold = new Date(
      this.tokenInfo.expiresAt.getTime() - (this.config.tokenRefreshThreshold! * 60 * 1000)
    )

    if (now >= refreshThreshold) {
      this.logger.info('Token approaching expiry, refreshing automatically')
      await this.refreshToken()
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): SFMCConnection | null {
    return this.currentConnection || null
  }

  /**
   * Disconnect and clear stored credentials
   */
  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting from SFMC')
    
    this.tokenInfo = undefined
    this.sfmcClient = undefined
    this.soapClient = undefined
    this.apiEndpoints = undefined
    
    if (this.currentConnection) {
      this.currentConnection.connectionStatus = 'expired'
      this.currentConnection = undefined
    }
  }

  // ===== API CLIENT METHODS =====

  /**
   * Get data extensions with pagination and filtering support
   */
  async getDataExtensions(options: {
    connectionId?: string
    page?: number
    pageSize?: number
    filter?: string
    sortBy?: string
    sortOrder?: string
    includeFields?: boolean
    includeData?: boolean
    dataExtensionKey?: string
  } = {}): Promise<DataExtensionResponse> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    const { page = 1, pageSize = 50, filter, sortBy, sortOrder, includeFields, includeData, dataExtensionKey } = options

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      let url = `${this.apiEndpoints!.rest.dataExtensions}?$page=${page}&$pageSize=${pageSize}`
      
      if (dataExtensionKey) {
        url = `${this.apiEndpoints!.rest.dataExtensions}/key:${encodeURIComponent(dataExtensionKey)}`
      }
      
      if (filter) {
        url += `&$filter=${encodeURIComponent(filter)}`
      }
      
      if (sortBy) {
        url += `&$orderBy=${sortBy} ${sortOrder || 'asc'}`
      }

      const response = await this.sfmcClient!.get<{
        items: DataExtension[]
        count: number
        page: number
        pageSize: number
      }>(url)

      this.updateRateLimitFromResponse(response.headers)

      return {
        dataExtensions: response.data.items,
        totalCount: response.data.count
      }
    })
  }

  /**
   * Get specific data extension by key
   */
  async getDataExtension(key: string): Promise<DataExtension> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      const response = await this.sfmcClient!.get<DataExtension>(
        `${this.apiEndpoints!.rest.dataExtensions}/key:${encodeURIComponent(key)}`
      )

      this.updateRateLimitFromResponse(response.headers)
      return response.data
    })
  }

  /**
   * Create data extension
   */
  async createDataExtension(options: {
    connectionId: string
    dataExtension: any
  }): Promise<any> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      const response = await this.sfmcClient!.post<any>(
        `${this.apiEndpoints!.rest.dataExtensions}`,
        options.dataExtension
      )

      this.updateRateLimitFromResponse(response.headers)
      return response.data
    })
  }

  /**
   * Update data extension
   */
  async updateDataExtension(options: {
    connectionId: string
    dataExtension: any
  }): Promise<any> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      const response = await this.sfmcClient!.put<any>(
        `${this.apiEndpoints!.rest.dataExtensions}/key:${encodeURIComponent(options.dataExtension.customerKey)}`,
        options.dataExtension
      )

      this.updateRateLimitFromResponse(response.headers)
      return response.data
    })
  }

  /**
   * Delete data extension
   */
  async deleteDataExtension(options: {
    connectionId: string
    dataExtensionKey: string
  }): Promise<any> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      const response = await this.sfmcClient!.delete<any>(
        `${this.apiEndpoints!.rest.dataExtensions}/key:${encodeURIComponent(options.dataExtensionKey)}`
      )

      this.updateRateLimitFromResponse(response.headers)
      return response.data
    })
  }

  /**
   * Deploy cloud page to SFMC
   */
  async deployCloudPage(options: {
    connectionId: string
    cloudPage: any
    deploymentOptions?: any
  }): Promise<DeploymentResult> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      try {
        const assetPayload = {
          name: options.cloudPage.name,
          customerKey: options.cloudPage.customerKey,
          assetType: {
            id: 205, // Cloud Page asset type ID
            name: 'webpage'
          },
          content: options.cloudPage.content.html,
          data: {
            email: {
              options: {
                generateFrom: 'content'
              }
            }
          }
        }

        const response = await this.sfmcClient!.post<{
          id: number
          name: string
          publishedURL?: string
        }>(`${this.apiEndpoints!.rest.assets}`, assetPayload)

        this.updateRateLimitFromResponse(response.headers)

        return {
          success: true,
          pageId: response.data.id.toString(),
          url: response.data.publishedURL,
          deploymentId: `deploy_${Date.now()}_${response.data.id}`
        }
      } catch (error) {
        this.logger.error('Cloud page deployment failed', { error, pageName: options.cloudPage.name })
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown deployment error'
        }
      }
    })
  }

  /**
   * Deploy code resource to SFMC
   */
  async deployCodeResource(options: {
    connectionId: string
    codeResource: any
    deploymentOptions?: any
  }): Promise<DeploymentResult> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      try {
        const assetPayload = {
          name: options.codeResource.name,
          customerKey: options.codeResource.customerKey,
          assetType: {
            id: this.getCodeResourceTypeId(options.codeResource.resourceType),
            name: options.codeResource.resourceType
          },
          content: options.codeResource.content
        }

        const response = await this.sfmcClient!.post<{
          id: number
          name: string
        }>(`${this.apiEndpoints!.rest.assets}`, assetPayload)

        this.updateRateLimitFromResponse(response.headers)

        return {
          success: true,
          pageId: response.data.id.toString(),
          deploymentId: `deploy_${Date.now()}_${response.data.id}`
        }
      } catch (error) {
        this.logger.error('Code resource deployment failed', { error, resourceName: options.codeResource.name })
        
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown deployment error'
        }
      }
    })
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(options: {
    connectionId: string
    deploymentId: string
  }): Promise<any> {
    await this.ensureValidToken()
    this.ensureInitialized()

    // Extract asset ID from deployment ID
    const assetId = options.deploymentId.split('_').pop()
    
    if (!assetId || !this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('Invalid deployment ID or API endpoints not initialized', 'INVALID_DEPLOYMENT_ID')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      const response = await this.sfmcClient!.get<any>(
        `${this.apiEndpoints!.rest.assets}/${assetId}`
      )

      this.updateRateLimitFromResponse(response.headers)
      
      return {
        deploymentId: options.deploymentId,
        status: 'completed',
        asset: response.data,
        deployedAt: new Date().toISOString()
      }
    })
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(options: {
    connectionId: string
    deploymentId: string
    reason?: string
  }): Promise<any> {
    await this.ensureValidToken()
    this.ensureInitialized()

    // Extract asset ID from deployment ID
    const assetId = options.deploymentId.split('_').pop()
    
    if (!assetId || !this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('Invalid deployment ID or API endpoints not initialized', 'INVALID_DEPLOYMENT_ID')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      // In a real implementation, this would restore from backup
      // For now, we'll just mark the asset as inactive
      const response = await this.sfmcClient!.put<any>(
        `${this.apiEndpoints!.rest.assets}/${assetId}`,
        {
          status: 'inactive',
          rollbackReason: options.reason || 'Manual rollback'
        }
      )

      this.updateRateLimitFromResponse(response.headers)
      
      return {
        success: true,
        deploymentId: options.deploymentId,
        rolledBackAt: new Date().toISOString(),
        reason: options.reason
      }
    })
  }

  /**
   * Batch deployment
   */
  async batchDeploy(options: {
    connectionId: string
    deployments: any[]
    batchOptions?: any
  }): Promise<any> {
    await this.ensureValidToken()
    this.ensureInitialized()

    const results = []
    const { continueOnError = false, parallelExecution = true, maxConcurrency = 3 } = options.batchOptions || {}

    if (parallelExecution) {
      // Execute deployments in parallel with concurrency limit
      const chunks = this.chunkArray(options.deployments, maxConcurrency)
      
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (deployment) => {
          try {
            if (deployment.cloudPage) {
              return await this.deployCloudPage({
                connectionId: options.connectionId,
                cloudPage: deployment.cloudPage,
                deploymentOptions: deployment.deploymentOptions
              })
            } else if (deployment.codeResource) {
              return await this.deployCodeResource({
                connectionId: options.connectionId,
                codeResource: deployment.codeResource,
                deploymentOptions: deployment.deploymentOptions
              })
            }
          } catch (error) {
            if (!continueOnError) {
              throw error
            }
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        })

        const chunkResults = await Promise.all(chunkPromises)
        results.push(...chunkResults)
      }
    } else {
      // Execute deployments sequentially
      for (const deployment of options.deployments) {
        try {
          let result
          if (deployment.cloudPage) {
            result = await this.deployCloudPage({
              connectionId: options.connectionId,
              cloudPage: deployment.cloudPage,
              deploymentOptions: deployment.deploymentOptions
            })
          } else if (deployment.codeResource) {
            result = await this.deployCodeResource({
              connectionId: options.connectionId,
              codeResource: deployment.codeResource,
              deploymentOptions: deployment.deploymentOptions
            })
          }
          results.push(result)
        } catch (error) {
          if (!continueOnError) {
            throw error
          }
          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    return {
      batchId: `batch_${Date.now()}`,
      totalDeployments: options.deployments.length,
      successfulDeployments: results.filter(r => r?.success).length,
      failedDeployments: results.filter(r => !r?.success).length,
      results
    }
  }

  /**
   * Get code resource type ID for SFMC asset type
   */
  private getCodeResourceTypeId(resourceType: string): number {
    const typeMap: Record<string, number> = {
      'css': 193,
      'javascript': 194,
      'text': 195,
      'html': 196
    }
    return typeMap[resourceType] || 195 // Default to text
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Validate AMPScript code
   */
  async validateAMPScript(code: string): Promise<ValidationResult> {
    await this.ensureValidToken()
    this.ensureInitialized()

    // This is a simplified validation - in a real implementation,
    // you would use SFMC's validation API or implement comprehensive parsing
    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      try {
        // Basic syntax validation
        const errors = this.performBasicAMPScriptValidation(code)
        
        return {
          isValid: errors.length === 0,
          errors,
          warnings: [],
          suggestions: []
        }
      } catch (error) {
        throw ErrorFactory.createSFMCError(
          'AMPScript validation failed',
          'VALIDATION_ERROR',
          error instanceof Error ? error.message : 'Unknown error'
        )
      }
    })
  }

  /**
   * Get business units
   */
  async getBusinessUnits(): Promise<BusinessUnit[]> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      const response = await this.sfmcClient!.get<{
        items: BusinessUnit[]
      }>(`${this.apiEndpoints!.rest.businessUnits}`)

      this.updateRateLimitFromResponse(response.headers)
      return response.data.items
    })
  }

  /**
   * Get content assets with filtering
   */
  async getContentAssets(assetType?: string, page: number = 1, pageSize: number = 50): Promise<ContentAsset[]> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.apiEndpoints) {
      throw ErrorFactory.createSFMCError('API endpoints not initialized', 'NO_ENDPOINTS')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()

      let url = `${this.apiEndpoints!.rest.assets}?$page=${page}&$pageSize=${pageSize}`
      if (assetType) {
        url += `&$filter=assetType.name eq '${encodeURIComponent(assetType)}'`
      }

      const response = await this.sfmcClient!.get<{
        items: ContentAsset[]
      }>(url)

      this.updateRateLimitFromResponse(response.headers)
      return response.data.items
    })
  }

  // ===== RATE LIMITING METHODS =====

  /**
   * Check rate limit before making API call
   */
  private async checkRateLimit(): Promise<void> {
    const now = new Date()
    
    // Reset window if needed
    if (now >= this.rateLimitState.resetTime) {
      this.rateLimitState.requestCount = 0
      this.rateLimitState.windowStart = now
      this.rateLimitState.resetTime = new Date(now.getTime() + 3600000) // 1 hour
      this.rateLimitState.remaining = this.rateLimitState.limit
    }

    // Check if we're at the limit
    if (this.rateLimitState.remaining <= 0) {
      const waitTime = this.rateLimitState.resetTime.getTime() - now.getTime()
      
      this.logger.warn('Rate limit exceeded, waiting for reset', {
        waitTime,
        resetTime: this.rateLimitState.resetTime
      })

      throw ErrorFactory.createApplicationError(
        ErrorType.RATE_LIMIT_ERROR,
        'SFMC API rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        {
          retryAfter: Math.ceil(waitTime / 1000),
          resetTime: this.rateLimitState.resetTime,
          limit: this.rateLimitState.limit
        }
      )
    }

    // Increment request count
    this.rateLimitState.requestCount++
    this.rateLimitState.remaining--
  }

  /**
   * Update rate limit state from API response headers
   */
  private updateRateLimitFromResponse(headers: Record<string, string>): void {
    // SFMC typically returns rate limit info in headers
    const limit = headers['x-ratelimit-limit']
    const remaining = headers['x-ratelimit-remaining']
    const reset = headers['x-ratelimit-reset']

    if (limit) {
      this.rateLimitState.limit = parseInt(limit, 10)
    }

    if (remaining) {
      this.rateLimitState.remaining = parseInt(remaining, 10)
    }

    if (reset) {
      // Reset header could be timestamp or seconds until reset
      const resetValue = parseInt(reset, 10)
      if (resetValue > 1000000000) {
        // Looks like a timestamp
        this.rateLimitState.resetTime = new Date(resetValue * 1000)
      } else {
        // Looks like seconds until reset
        this.rateLimitState.resetTime = new Date(Date.now() + (resetValue * 1000))
      }
    }

    this.logger.debug('Rate limit updated', {
      limit: this.rateLimitState.limit,
      remaining: this.rateLimitState.remaining,
      resetTime: this.rateLimitState.resetTime
    })
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitInfo {
    return {
      limit: this.rateLimitState.limit,
      remaining: this.rateLimitState.remaining,
      resetTime: this.rateLimitState.resetTime,
      retryAfter: this.rateLimitState.remaining <= 0 
        ? Math.ceil((this.rateLimitState.resetTime.getTime() - Date.now()) / 1000)
        : undefined
    }
  }

  /**
   * Basic AMPScript validation (simplified)
   */
  private performBasicAMPScriptValidation(code: string): any[] {
    const errors: any[] = []
    
    // Check for basic syntax issues
    const openTags = (code.match(/%%\[/g) || []).length
    const closeTags = (code.match(/\]%%/g) || []).length
    
    if (openTags !== closeTags) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Mismatched AMPScript tags',
        code: 'MISMATCHED_TAGS',
        severity: 'error'
      })
    }

    // Check for common function issues
    const functionPattern = /%%\[\s*(\w+)\s*\(/g
    let match
    while ((match = functionPattern.exec(code)) !== null) {
      const functionName = match[1]
      // Add validation for known AMPScript functions
      if (!this.isValidAMPScriptFunction(functionName)) {
        errors.push({
          line: this.getLineNumber(code, match.index),
          column: match.index,
          message: `Unknown AMPScript function: ${functionName}`,
          code: 'UNKNOWN_FUNCTION',
          severity: 'error'
        })
      }
    }

    return errors
  }

  private isValidAMPScriptFunction(functionName: string): boolean {
    const validFunctions = [
      'SET', 'VAR', 'IF', 'ELSE', 'ELSEIF', 'ENDIF',
      'FOR', 'NEXT', 'LOOKUP', 'LOOKUPROWS', 'ROWCOUNT',
      'FIELD', 'ROW', 'CONCAT', 'LENGTH', 'SUBSTRING',
      'REPLACE', 'UPPERCASE', 'LOWERCASE', 'PROPERCASE',
      'NOW', 'DATEADD', 'DATEDIFF', 'FORMAT', 'FORMATDATE'
    ]
    return validFunctions.includes(functionName.toUpperCase())
  }

  private getLineNumber(text: string, index: number): number {
    return text.substring(0, index).split('\n').length
  }

  // ===== SOAP API METHODS =====

  /**
   * Execute SOAP retrieve operation
   */
  async soapRetrieve<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.soapClient) {
      throw ErrorFactory.createSFMCError('SOAP client not initialized', 'NO_SOAP_CLIENT')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()
      return this.soapClient!.retrieve<T>(request)
    })
  }

  /**
   * Execute SOAP create operation
   */
  async soapCreate<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.soapClient) {
      throw ErrorFactory.createSFMCError('SOAP client not initialized', 'NO_SOAP_CLIENT')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()
      return this.soapClient!.create<T>(request)
    })
  }

  /**
   * Execute SOAP update operation
   */
  async soapUpdate<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.soapClient) {
      throw ErrorFactory.createSFMCError('SOAP client not initialized', 'NO_SOAP_CLIENT')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()
      return this.soapClient!.update<T>(request)
    })
  }

  /**
   * Execute SOAP delete operation
   */
  async soapDelete<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.soapClient) {
      throw ErrorFactory.createSFMCError('SOAP client not initialized', 'NO_SOAP_CLIENT')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()
      return this.soapClient!.delete<T>(request)
    })
  }

  /**
   * Execute SOAP query operation
   */
  async soapQuery<T = any>(request: SoapRequest): Promise<SoapResponse<T>> {
    await this.ensureValidToken()
    this.ensureInitialized()

    if (!this.soapClient) {
      throw ErrorFactory.createSFMCError('SOAP client not initialized', 'NO_SOAP_CLIENT')
    }

    return this.circuitBreaker.execute(async () => {
      await this.checkRateLimit()
      return this.soapClient!.query<T>(request)
    })
  }

  /**
   * Store encrypted connection details
   */
  private async storeConnection(credentials: SFMCCredentials, authResponse: SFMCAuthResponse): Promise<void> {
    const encryptedCreds = EncryptionUtils.encryptCredentials(credentials)
    const connectionId = EncryptionUtils.generateSessionId()
    const expiresAt = new Date(Date.now() + (authResponse.expiresIn * 1000))

    this.currentConnection = {
      connectionId,
      subdomain: credentials.subdomain,
      clientId: credentials.clientId,
      encryptedClientSecret: encryptedCreds.encryptedClientSecret,
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      tokenExpiry: expiresAt,
      connectionStatus: 'active',
      lastUsed: new Date(),
      permissions: [] // Will be populated based on token scope
    }

    // Store encryption details securely (in a real implementation, this would go to a secure store)
    // For now, we'll keep it in memory
    this.logger.debug('Connection stored successfully', {
      connectionId,
      subdomain: credentials.subdomain
    })
  }

  /**
   * Decrypt stored credentials
   */
  private decryptStoredCredentials(): SFMCCredentials {
    if (!this.currentConnection) {
      throw ErrorFactory.createSFMCError(
        'No connection available for decryption',
        'NO_CONNECTION'
      )
    }

    // In a real implementation, retrieve encryption details from secure storage
    // This is a simplified version for demonstration
    throw new Error('Credential decryption not implemented - requires secure storage backend')
  }

  /**
   * Validate connection health
   */
  protected async performHealthCheck(): Promise<void> {
    if (!this.currentConnection || !this.tokenInfo) {
      throw new Error('No active SFMC connection')
    }

    if (this.currentConnection.connectionStatus !== 'active') {
      throw new Error(`Connection status: ${this.currentConnection.connectionStatus}`)
    }

    if (new Date() >= this.tokenInfo.expiresAt) {
      throw new Error('Access token has expired')
    }

    // Test connection with a simple API call
    try {
      await this.ensureValidToken()
      // Could add a simple API test here like getting account info
    } catch (error) {
      throw new Error(`Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cleanup during shutdown
   */
  protected async performShutdown(): Promise<void> {
    await this.disconnect()
  }
}