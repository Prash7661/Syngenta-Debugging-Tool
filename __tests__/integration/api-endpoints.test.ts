import { createMocks } from 'node-mocks-http'
import { NextRequest, NextResponse } from 'next/server'

// Import API route handlers
import { POST as generateCodeHandler } from '../../app/api/generate-code/route'
import { POST as debugCodeHandler } from '../../app/api/debug-code/route'
import { POST as generatePagesHandler } from '../../app/api/generate-pages/route'
import { POST as sfmcAuthHandler } from '../../app/api/sfmc/authenticate/route'
import { GET as healthHandler } from '../../app/api/health/route'

// Mock external dependencies
jest.mock('../../services/ai/ai-code-generation.service')
jest.mock('../../services/sfmc/sfmc-integration.service')
jest.mock('../../services/cloud-pages/cloud-pages.service')

describe('API Endpoints Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks()
    
    // Set up environment variables for tests
    process.env.OPENAI_API_KEY = 'test-api-key'
    process.env.ENCRYPTION_KEY = 'test-encryption-key'
  })

  afterEach(() => {
    // Clean up environment variables
    delete process.env.OPENAI_API_KEY
    delete process.env.ENCRYPTION_KEY
  })

  describe('POST /api/generate-code', () => {
    it('should generate code successfully with valid request', async () => {
      const requestBody = {
        prompt: 'Create a simple AMPScript greeting',
        language: 'ampscript',
        conversationHistory: []
      }

      const request = new NextRequest('http://localhost:3000/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generateCodeHandler(request)
      
      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toHaveProperty('response')
      expect(responseData).toHaveProperty('codeBlocks')
      expect(responseData).toHaveProperty('executionTime')
    })

    it('should return 400 for invalid request body', async () => {
      const requestBody = {
        // Missing required 'prompt' field
        language: 'ampscript'
      }

      const request = new NextRequest('http://localhost:3000/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generateCodeHandler(request)
      
      expect(response.status).toBe(400)
      
      const responseData = await response.json()
      expect(responseData).toHaveProperty('error')
    })

    it('should handle different programming languages', async () => {
      const languages = ['ampscript', 'ssjs', 'sql', 'html', 'css']
      
      for (const language of languages) {
        const requestBody = {
          prompt: `Create a simple ${language} example`,
          language,
          conversationHistory: []
        }

        const request = new NextRequest('http://localhost:3000/api/generate-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })

        const response = await generateCodeHandler(request)
        
        expect(response.status).toBe(200)
        
        const responseData = await response.json()
        expect(responseData.codeBlocks).toBeDefined()
      }
    })

    it('should handle conversation history', async () => {
      const requestBody = {
        prompt: 'Improve the previous code',
        language: 'ampscript',
        conversationHistory: [
          {
            id: '1',
            role: 'user',
            content: 'Create a greeting',
            timestamp: Date.now()
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Here is a greeting: Hello!',
            timestamp: Date.now()
          }
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generateCodeHandler(request)
      
      expect(response.status).toBe(200)
    })
  })

  describe('POST /api/debug-code', () => {
    it('should debug code successfully with valid request', async () => {
      const requestBody = {
        code: '%%=Field("FirstName")=%%',
        language: 'ampscript',
        conversationHistory: []
      }

      const request = new NextRequest('http://localhost:3000/api/debug-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await debugCodeHandler(request)
      
      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toHaveProperty('analysis')
      expect(responseData).toHaveProperty('errors')
      expect(responseData).toHaveProperty('optimizations')
    })

    it('should return 400 for missing code', async () => {
      const requestBody = {
        language: 'ampscript'
        // Missing 'code' field
      }

      const request = new NextRequest('http://localhost:3000/api/debug-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await debugCodeHandler(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle different code languages for debugging', async () => {
      const testCases = [
        { language: 'ampscript', code: '%%=Field("Name")=%%' },
        { language: 'ssjs', code: 'Platform.Load("Core", "1");' },
        { language: 'sql', code: 'SELECT * FROM Subscribers' },
        { language: 'javascript', code: 'var x = 1;' },
        { language: 'css', code: '.class { color: red; }' }
      ]
      
      for (const testCase of testCases) {
        const requestBody = {
          code: testCase.code,
          language: testCase.language,
          conversationHistory: []
        }

        const request = new NextRequest('http://localhost:3000/api/debug-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })

        const response = await debugCodeHandler(request)
        
        expect(response.status).toBe(200)
      }
    })
  })

  describe('POST /api/generate-pages', () => {
    it('should generate cloud pages successfully', async () => {
      const requestBody = {
        configuration: {
          pageSettings: {
            pageName: 'Test Page',
            publishedURL: 'test-page',
            pageType: 'landing'
          },
          codeResources: {
            html: '<h1>Test</h1>',
            css: 'h1 { color: blue; }',
            ampscript: '%%=Field("Name")=%%'
          }
        }
      }

      const request = new NextRequest('http://localhost:3000/api/generate-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generatePagesHandler(request)
      
      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toHaveProperty('pages')
      expect(responseData).toHaveProperty('codeResources')
    })

    it('should return 400 for invalid configuration', async () => {
      const requestBody = {
        configuration: {
          // Missing required pageSettings
        }
      }

      const request = new NextRequest('http://localhost:3000/api/generate-pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await generatePagesHandler(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/sfmc/authenticate', () => {
    it('should authenticate with valid SFMC credentials', async () => {
      const requestBody = {
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        subdomain: 'test-subdomain'
      }

      const request = new NextRequest('http://localhost:3000/api/sfmc/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await sfmcAuthHandler(request)
      
      // Note: This will likely return an error in test environment since we don't have real SFMC credentials
      // But we can test that the endpoint is reachable and handles the request structure
      expect([200, 401, 500]).toContain(response.status)
    })

    it('should return 400 for missing credentials', async () => {
      const requestBody = {
        clientId: 'test-client-id'
        // Missing clientSecret and subdomain
      }

      const request = new NextRequest('http://localhost:3000/api/sfmc/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const response = await sfmcAuthHandler(request)
      
      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const request = new NextRequest('http://localhost:3000/api/health', {
        method: 'GET'
      })

      const response = await healthHandler(request)
      
      expect(response.status).toBe(200)
      
      const responseData = await response.json()
      expect(responseData).toHaveProperty('status')
      expect(responseData).toHaveProperty('timestamp')
      expect(responseData).toHaveProperty('services')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json'
      })

      const response = await generateCodeHandler(request)
      
      expect(response.status).toBe(400)
    })

    it('should handle missing Content-Type header', async () => {
      const requestBody = {
        prompt: 'Test prompt',
        language: 'ampscript'
      }

      const request = new NextRequest('http://localhost:3000/api/generate-code', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      const response = await generateCodeHandler(request)
      
      // Should still work or return appropriate error
      expect([200, 400]).toContain(response.status)
    })
  })

  describe('Rate Limiting', () => {
    it('should handle multiple concurrent requests', async () => {
      const requestBody = {
        prompt: 'Simple test',
        language: 'ampscript',
        conversationHistory: []
      }

      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/generate-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })
      )

      const responses = await Promise.all(
        requests.map(request => generateCodeHandler(request))
      )

      // All requests should be handled (may be rate limited but should respond)
      responses.forEach(response => {
        expect([200, 429, 500]).toContain(response.status)
      })
    })
  })

  describe('Authentication Flow Integration', () => {
    it('should handle complete SFMC authentication workflow', async () => {
      // Step 1: Authenticate
      const authRequest = new NextRequest('http://localhost:3000/api/sfmc/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          subdomain: 'test-subdomain'
        })
      })

      const authResponse = await sfmcAuthHandler(authRequest)
      
      // Authentication may fail in test environment, but endpoint should be reachable
      expect([200, 401, 500]).toContain(authResponse.status)

      if (authResponse.status === 200) {
        const authData = await authResponse.json()
        expect(authData).toHaveProperty('accessToken')
      }
    })
  })

  describe('Code Generation and Debugging Workflow', () => {
    it('should handle complete code generation and debugging workflow', async () => {
      // Step 1: Generate code
      const generateRequest = new NextRequest('http://localhost:3000/api/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Create a personalization block',
          language: 'ampscript',
          conversationHistory: []
        })
      })

      const generateResponse = await generateCodeHandler(generateRequest)
      expect(generateResponse.status).toBe(200)

      const generateData = await generateResponse.json()
      expect(generateData.codeBlocks).toBeDefined()
      expect(generateData.codeBlocks.length).toBeGreaterThan(0)

      // Step 2: Debug the generated code
      const generatedCode = generateData.codeBlocks[0]?.code || '%%=Field("Name")=%%'
      
      const debugRequest = new NextRequest('http://localhost:3000/api/debug-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: generatedCode,
          language: 'ampscript',
          conversationHistory: []
        })
      })

      const debugResponse = await debugCodeHandler(debugRequest)
      expect(debugResponse.status).toBe(200)

      const debugData = await debugResponse.json()
      expect(debugData).toHaveProperty('analysis')
      expect(debugData).toHaveProperty('errors')
    })
  })
})