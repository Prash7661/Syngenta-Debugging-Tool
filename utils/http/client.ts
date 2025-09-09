// HTTP client utilities with retry and error handling

import { ApplicationError, ErrorType, NetworkError } from '../../types'
import { ErrorFactory, RetryManager } from '../errors'

export interface HttpClientConfig {
  baseURL?: string
  timeout?: number
  retries?: number
  headers?: Record<string, string>
  validateStatus?: (status: number) => boolean
}

export interface HttpResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
}

export class HttpClient {
  private config: HttpClientConfig

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      timeout: 30000,
      retries: 3,
      validateStatus: (status) => status >= 200 && status < 300,
      ...config
    }
  }

  async get<T = any>(url: string, config?: Partial<HttpClientConfig>): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, undefined, config)
  }

  async post<T = any>(url: string, data?: any, config?: Partial<HttpClientConfig>): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: Partial<HttpClientConfig>): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, data, config)
  }

  async patch<T = any>(url: string, data?: any, config?: Partial<HttpClientConfig>): Promise<HttpResponse<T>> {
    return this.request<T>('PATCH', url, data, config)
  }

  async delete<T = any>(url: string, config?: Partial<HttpClientConfig>): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config)
  }

  private async request<T>(
    method: string,
    url: string,
    data?: any,
    config?: Partial<HttpClientConfig>
  ): Promise<HttpResponse<T>> {
    const finalConfig = { ...this.config, ...config }
    const fullUrl = finalConfig.baseURL ? `${finalConfig.baseURL}${url}` : url

    return RetryManager.execute(async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), finalConfig.timeout)

        const requestInit: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...finalConfig.headers
          },
          signal: controller.signal
        }

        if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
          requestInit.body = JSON.stringify(data)
        }

        const response = await fetch(fullUrl, requestInit)
        clearTimeout(timeoutId)

        if (!finalConfig.validateStatus!(response.status)) {
          throw this.createHttpError(response, method, fullUrl)
        }

        const responseData = await this.parseResponse<T>(response)
        
        return {
          data: responseData,
          status: response.status,
          statusText: response.statusText,
          headers: this.parseHeaders(response.headers)
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw ErrorFactory.createNetworkError(
              'Request timeout',
              fullUrl,
              method,
              undefined,
              true
            )
          }
          
          if (error.message.includes('fetch')) {
            throw ErrorFactory.createNetworkError(
              error.message,
              fullUrl,
              method
            )
          }
        }
        
        throw error
      }
    }, {
      maxAttempts: finalConfig.retries,
      retryableErrors: [ErrorType.NETWORK_ERROR, ErrorType.TIMEOUT_ERROR]
    })
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      return response.json()
    }
    
    if (contentType?.includes('text/')) {
      return response.text() as unknown as T
    }
    
    return response.blob() as unknown as T
  }

  private parseHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {}
    headers.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  private createHttpError(response: Response, method: string, url: string): NetworkError {
    return ErrorFactory.createNetworkError(
      `HTTP ${response.status}: ${response.statusText}`,
      url,
      method,
      response.status
    )
  }
}

// Specialized HTTP clients
export class SFMCHttpClient extends HttpClient {
  constructor(accessToken?: string) {
    super({
      headers: {
        'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        'Content-Type': 'application/json'
      },
      timeout: 60000, // SFMC can be slow
      retries: 3
    })
  }

  updateToken(accessToken: string): void {
    this.config.headers = {
      ...this.config.headers,
      'Authorization': `Bearer ${accessToken}`
    }
  }
}

export class AIServiceHttpClient extends HttpClient {
  constructor(apiKey: string, provider: 'openai' | 'anthropic' = 'openai') {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (provider === 'openai') {
      headers['Authorization'] = `Bearer ${apiKey}`
    } else if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey
    }

    super({
      headers,
      timeout: 120000, // AI services can be slow
      retries: 2
    })
  }
}

// Utility functions
export const httpUtils = {
  // Create a simple GET request
  async get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    const client = new HttpClient({ headers })
    const response = await client.get<T>(url)
    return response.data
  },

  // Create a simple POST request
  async post<T>(url: string, data: any, headers?: Record<string, string>): Promise<T> {
    const client = new HttpClient({ headers })
    const response = await client.post<T>(url, data)
    return response.data
  },

  // Check if URL is reachable
  async isReachable(url: string, timeout: number = 5000): Promise<boolean> {
    try {
      const client = new HttpClient({ timeout, retries: 1 })
      await client.get(url)
      return true
    } catch {
      return false
    }
  },

  // Download file as buffer
  async downloadFile(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw ErrorFactory.createNetworkError(
        `Failed to download file: ${response.statusText}`,
        url,
        'GET',
        response.status
      )
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  },

  // Upload file with progress
  async uploadFile(
    url: string,
    file: Buffer,
    filename: string,
    onProgress?: (progress: number) => void
  ): Promise<any> {
    const formData = new FormData()
    const blob = new Blob([file])
    formData.append('file', blob, filename)

    // Note: Progress tracking would require a more sophisticated implementation
    // This is a simplified version
    const response = await fetch(url, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw ErrorFactory.createNetworkError(
        `Upload failed: ${response.statusText}`,
        url,
        'POST',
        response.status
      )
    }

    return response.json()
  }
}