import { NextRequest } from 'next/server'

// Import API route handlers
import { POST as generateCodeHandler } from '../../app/api/generate-code/route'
import { POST as debugCodeHandler } from '../../app/api/debug-code/route'
import { GET as healthHandler } from '../../app/api/health/route'

// Mock external dependencies to avoid actual API calls
jest.mock('../../services/ai/ai-code-generation.service')
jest.mock('../../services/sfmc/sfmc-integration.service')

describe('Performance Tests - Concurrent Users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-api-key'
    process.env.ENCRYPTION_KEY = 'test-encryption-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.ENCRYPTION_KEY
  })

  describe('Concurrent Code Generation Requests', () => {
    it('should handle 10 concurrent code generation requests', async () => {
      const concurrentRequests = 10
      const requestBody = {
        prompt: 'Create a simple AMPScript greeting',
        language: 'ampscript',
        conversationHistory: []
      }

      const startTime = Date.now()

      const requests = Array.from({ length: concurrentRequests }, (_, index) => 
        new NextRequest(`http://localhost:3000/api/generate-code?req=${index}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...requestBody,
            prompt: `${requestBody.prompt} - Request ${index}`
          })
        })
      )

      const responses = await Promise.all(
        requests.map(request => generateCodeHandler(request))
      )

      const endTime = Date.now()
      const totalTime = endTime - startTime

      // Verify all requests completed
      expect(responses).toHaveLength(concurrentRequests)
      
      // Check response status codes
      const successfulResponses = responses.filter(response => response.status === 200)
      const errorResponses = responses.filter(response => response.status >= 400)

      console.log(`Concurrent requests: ${concurrentRequests}`)
      console.log(`Total time: ${totalTime}ms`)
      console.log(`Average time per request: ${totalTime / concurrentRequests}ms`)
      console.log(`Successful responses: ${successfulResponses.length}`)
      console.log(`Error responses: ${errorResponses.length}`)

      // At least 80% of requests should succeed (allowing for some rate limiting)
      expect(successfulResponses.length).toBeGreaterThanOrEqual(concurrentRequests * 0.8)
      
      // Total time should be reasonable (less than 30 seconds for 10 requests)
      expect(totalTime).toBeLessThan(30000)
    }, 60000) // 60 second timeout

    it('should handle 25 concurrent code generation requests', async () => {
      const concurrentRequests = 25
      const requestBody = {
        prompt: 'Create a data extension lookup',
        language: 'ssjs',
        conversationHistory: []
      }

      const startTime = Date.now()

      const requests = Array.from({ length: concurrentRequests }, (_, index) => 
        new NextRequest(`http://localhost:3000/api/generate-code?req=${index}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...requestBody,
            prompt: `${requestBody.prompt} - Request ${index}`
          })
        })
      )

      const responses = await Promise.all(
        requests.map(request => generateCodeHandler(request))
      )

      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(responses).toHaveLength(concurrentRequests)
      
      const successfulResponses = responses.filter(response => response.status === 200)
      
      console.log(`Concurrent requests: ${concurrentRequests}`)
      console.log(`Total time: ${totalTime}ms`)
      console.log(`Average time per request: ${totalTime / concurrentRequests}ms`)
      console.log(`Successful responses: ${successfulResponses.length}`)

      // At least 70% should succeed under higher load
      expect(successfulResponses.length).toBeGreaterThanOrEqual(concurrentRequests * 0.7)
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(60000)
    }, 90000) // 90 second timeout
  })

  describe('Concurrent Debug Requests', () => {
    it('should handle 15 concurrent debug requests', async () => {
      const concurrentRequests = 15
      const testCodes = [
        '%%=Field("FirstName")=%%',
        'Platform.Load("Core", "1");',
        'SELECT * FROM Subscribers',
        'var x = 1; console.log(x);',
        '.class { color: red; }'
      ]

      const startTime = Date.now()

      const requests = Array.from({ length: concurrentRequests }, (_, index) => {
        const codeIndex = index % testCodes.length
        const language = ['ampscript', 'ssjs', 'sql', 'javascript', 'css'][codeIndex]
        
        return new NextRequest(`http://localhost:3000/api/debug-code?req=${index}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: testCodes[codeIndex],
            language: language,
            conversationHistory: []
          })
        })
      })

      const responses = await Promise.all(
        requests.map(request => debugCodeHandler(request))
      )

      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(responses).toHaveLength(concurrentRequests)
      
      const successfulResponses = responses.filter(response => response.status === 200)
      
      console.log(`Concurrent debug requests: ${concurrentRequests}`)
      console.log(`Total time: ${totalTime}ms`)
      console.log(`Successful responses: ${successfulResponses.length}`)

      expect(successfulResponses.length).toBeGreaterThanOrEqual(concurrentRequests * 0.8)
      expect(totalTime).toBeLessThan(45000)
    }, 75000)
  })

  describe('Mixed Concurrent Requests', () => {
    it('should handle mixed API requests concurrently', async () => {
      const totalRequests = 20
      const startTime = Date.now()

      // Create a mix of different request types
      const requests = []

      // Code generation requests (40%)
      for (let i = 0; i < 8; i++) {
        requests.push(
          generateCodeHandler(new NextRequest(`http://localhost:3000/api/generate-code?req=gen${i}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Generate code example ${i}`,
              language: ['ampscript', 'ssjs', 'sql'][i % 3],
              conversationHistory: []
            })
          }))
        )
      }

      // Debug requests (40%)
      for (let i = 0; i < 8; i++) {
        requests.push(
          debugCodeHandler(new NextRequest(`http://localhost:3000/api/debug-code?req=debug${i}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: `test code ${i}`,
              language: ['ampscript', 'ssjs', 'javascript'][i % 3],
              conversationHistory: []
            })
          }))
        )
      }

      // Health check requests (20%)
      for (let i = 0; i < 4; i++) {
        requests.push(
          healthHandler(new NextRequest(`http://localhost:3000/api/health?req=health${i}`, {
            method: 'GET'
          }))
        )
      }

      const responses = await Promise.all(requests)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      expect(responses).toHaveLength(totalRequests)
      
      const successfulResponses = responses.filter(response => response.status === 200)
      const rateLimitedResponses = responses.filter(response => response.status === 429)
      const errorResponses = responses.filter(response => response.status >= 500)

      console.log(`Mixed concurrent requests: ${totalRequests}`)
      console.log(`Total time: ${totalTime}ms`)
      console.log(`Successful: ${successfulResponses.length}`)
      console.log(`Rate limited: ${rateLimitedResponses.length}`)
      console.log(`Errors: ${errorResponses.length}`)

      // Most requests should succeed or be rate limited (not error)
      expect(successfulResponses.length + rateLimitedResponses.length).toBeGreaterThanOrEqual(totalRequests * 0.8)
      expect(totalTime).toBeLessThan(60000)
    }, 90000)
  })

  describe('Load Testing Scenarios', () => {
    it('should handle burst traffic scenario', async () => {
      // Simulate burst traffic - many requests in quick succession
      const burstSize = 30
      const requestBody = {
        prompt: 'Quick burst test',
        language: 'ampscript',
        conversationHistory: []
      }

      const startTime = Date.now()

      // Create all requests at once (burst)
      const requests = Array.from({ length: burstSize }, (_, index) => 
        generateCodeHandler(new NextRequest(`http://localhost:3000/api/generate-code?burst=${index}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...requestBody,
            prompt: `${requestBody.prompt} ${index}`
          })
        }))
      )

      const responses = await Promise.all(requests)
      const endTime = Date.now()
      const totalTime = endTime - startTime

      const statusCodes = responses.map(r => r.status)
      const successCount = statusCodes.filter(s => s === 200).length
      const rateLimitCount = statusCodes.filter(s => s === 429).length
      const errorCount = statusCodes.filter(s => s >= 500).length

      console.log(`Burst test - ${burstSize} requests in ${totalTime}ms`)
      console.log(`Success: ${successCount}, Rate limited: ${rateLimitCount}, Errors: ${errorCount}`)

      // System should handle burst gracefully (success + rate limiting, minimal errors)
      expect(errorCount).toBeLessThan(burstSize * 0.1) // Less than 10% errors
      expect(successCount + rateLimitCount).toBeGreaterThanOrEqual(burstSize * 0.9)
    }, 120000)

    it('should maintain performance under sustained load', async () => {
      // Simulate sustained load over time
      const requestsPerBatch = 5
      const numberOfBatches = 4
      const delayBetweenBatches = 1000 // 1 second

      const allResponses = []
      const batchTimes = []

      for (let batch = 0; batch < numberOfBatches; batch++) {
        const batchStartTime = Date.now()

        const batchRequests = Array.from({ length: requestsPerBatch }, (_, index) => 
          generateCodeHandler(new NextRequest(`http://localhost:3000/api/generate-code?batch=${batch}&req=${index}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Sustained load test batch ${batch} request ${index}`,
              language: 'ampscript',
              conversationHistory: []
            })
          }))
        )

        const batchResponses = await Promise.all(batchRequests)
        const batchEndTime = Date.now()
        const batchTime = batchEndTime - batchStartTime

        allResponses.push(...batchResponses)
        batchTimes.push(batchTime)

        console.log(`Batch ${batch + 1}/${numberOfBatches} completed in ${batchTime}ms`)

        // Wait between batches (except for the last one)
        if (batch < numberOfBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
        }
      }

      const totalRequests = requestsPerBatch * numberOfBatches
      const successfulResponses = allResponses.filter(r => r.status === 200)
      const averageBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length

      console.log(`Sustained load test completed`)
      console.log(`Total requests: ${totalRequests}`)
      console.log(`Successful: ${successfulResponses.length}`)
      console.log(`Average batch time: ${averageBatchTime}ms`)

      // Performance should remain consistent across batches
      expect(successfulResponses.length).toBeGreaterThanOrEqual(totalRequests * 0.8)
      
      // No batch should take significantly longer than others (performance degradation check)
      const maxBatchTime = Math.max(...batchTimes)
      const minBatchTime = Math.min(...batchTimes)
      expect(maxBatchTime / minBatchTime).toBeLessThan(3) // Max 3x difference
    }, 180000) // 3 minute timeout
  })

  describe('Memory and Resource Usage', () => {
    it('should not have memory leaks under load', async () => {
      const initialMemory = process.memoryUsage()
      
      // Run multiple batches of requests
      for (let batch = 0; batch < 3; batch++) {
        const requests = Array.from({ length: 10 }, (_, index) => 
          generateCodeHandler(new NextRequest(`http://localhost:3000/api/generate-code?memory=${batch}-${index}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Memory test batch ${batch} request ${index}`,
              language: 'ampscript',
              conversationHistory: []
            })
          }))
        )

        await Promise.all(requests)
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreasePercent = (memoryIncrease / initialMemory.heapUsed) * 100

      console.log(`Initial memory: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`)
      console.log(`Final memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`)
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent.toFixed(1)}%)`)

      // Memory increase should be reasonable (less than 50% increase)
      expect(memoryIncreasePercent).toBeLessThan(50)
    }, 120000)
  })
})