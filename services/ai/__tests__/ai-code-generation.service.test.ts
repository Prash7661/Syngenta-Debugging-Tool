import { AICodeGenerationService } from '../ai-code-generation.service'
import { AIServiceConfig } from '../../../types/ai'
import { CodeGenerationRequest, DebugRequest } from '../../../types/services'

describe('AICodeGenerationService', () => {
  let service: AICodeGenerationService
  let config: AIServiceConfig

  beforeEach(() => {
    config = {
      provider: 'openai',
      apiKey: 'test-api-key',
      model: 'gpt-4',
      defaultTemperature: 0.1,
      maxTokens: 1000,
      timeout: 30000,
      retryAttempts: 2
    }
    
    service = new AICodeGenerationService(config)
  })

  afterEach(async () => {
    if (service) {
      await service.shutdown()
    }
  })

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Mock the HTTP client to avoid actual API calls
      jest.spyOn(service as any, 'testConnection').mockResolvedValue(undefined)
      
      await service.initialize()
      
      const healthStatus = await service.healthCheck()
      expect(healthStatus.status).toBe('healthy')
    })

    it('should fail initialization with invalid config', async () => {
      const invalidConfig = { ...config, apiKey: '' }
      const invalidService = new AICodeGenerationService(invalidConfig)
      
      jest.spyOn(invalidService as any, 'testConnection').mockRejectedValue(new Error('Invalid API key'))
      
      await expect(invalidService.initialize()).rejects.toThrow()
    })
  })

  describe('code generation', () => {
    beforeEach(async () => {
      jest.spyOn(service as any, 'testConnection').mockResolvedValue(undefined)
      await service.initialize()
    })

    it('should generate AMPScript code with proper context', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a personalization block for email greeting',
        language: 'ampscript',
        conversationHistory: []
      }

      // Mock the AI service call
      jest.spyOn(service as any, 'callAIService').mockResolvedValue({
        content: 'Generated AMPScript code with proper syntax',
        codeBlocks: [{
          language: 'ampscript',
          code: '%%=ProperCase(Field("FirstName"))=%%',
          explanation: 'Personalizes greeting with proper case first name'
        }],
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop'
      })

      const response = await service.generateCode(request)

      expect(response.response).toContain('Generated AMPScript code')
      expect(response.codeBlocks).toHaveLength(1)
      expect(response.codeBlocks[0].language).toBe('ampscript')
      expect(response.codeBlocks[0].code).toContain('%%=')
    })

    it('should generate SSJS code with SFMC context', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a data extension lookup function',
        language: 'ssjs',
        conversationHistory: []
      }

      jest.spyOn(service as any, 'callAIService').mockResolvedValue({
        content: 'Generated SSJS code with Platform.Load',
        codeBlocks: [{
          language: 'ssjs',
          code: 'Platform.Load("Core", "1");\nvar de = DataExtension.Init("CustomerData");',
          explanation: 'Initializes data extension for customer lookup'
        }],
        usage: { promptTokens: 60, completionTokens: 120, totalTokens: 180 },
        model: 'gpt-4',
        finishReason: 'stop'
      })

      const response = await service.generateCode(request)

      expect(response.codeBlocks[0].code).toContain('Platform.Load')
      expect(response.codeBlocks[0].code).toContain('DataExtension.Init')
    })

    it('should generate SQL optimized for SFMC', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a query to find active subscribers from last 30 days',
        language: 'sql',
        conversationHistory: []
      }

      jest.spyOn(service as any, 'callAIService').mockResolvedValue({
        content: 'Generated SFMC-optimized SQL query',
        codeBlocks: [{
          language: 'sql',
          code: 'SELECT TOP 1000 EmailAddress, FirstName FROM Subscribers WHERE Status = \'Active\' AND CreatedDate >= DATEADD(DAY, -30, GETDATE())',
          explanation: 'Queries active subscribers with date filtering'
        }],
        usage: { promptTokens: 70, completionTokens: 140, totalTokens: 210 },
        model: 'gpt-4',
        finishReason: 'stop'
      })

      const response = await service.generateCode(request)

      expect(response.codeBlocks[0].code).toContain('TOP 1000')
      expect(response.codeBlocks[0].code).toContain('DATEADD')
    })

    it('should handle conversation history', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Improve the previous code',
        language: 'ampscript',
        conversationHistory: [
          {
            id: '1',
            role: 'user',
            content: 'Create a simple greeting',
            timestamp: Date.now()
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Here is a basic greeting: Hello!',
            timestamp: Date.now()
          }
        ]
      }

      jest.spyOn(service as any, 'callAIService').mockResolvedValue({
        content: 'Improved greeting with personalization',
        codeBlocks: [{
          language: 'ampscript',
          code: '%%=Concat("Hello ", ProperCase(Field("FirstName")), "!")=%%',
          explanation: 'Enhanced greeting with personalization'
        }],
        usage: { promptTokens: 80, completionTokens: 100, totalTokens: 180 },
        model: 'gpt-4',
        finishReason: 'stop'
      })

      const response = await service.generateCode(request)

      expect(response.codeBlocks[0].code).toContain('ProperCase')
      expect(response.codeBlocks[0].code).toContain('Concat')
    })
  })

  describe('code analysis', () => {
    beforeEach(async () => {
      jest.spyOn(service as any, 'testConnection').mockResolvedValue(undefined)
      await service.initialize()
    })

    it('should analyze AMPScript code for errors', async () => {
      const request: DebugRequest = {
        code: '%%=Field("FirstName")=%%',
        language: 'ampscript',
        conversationHistory: []
      }

      jest.spyOn(service as any, 'callAIService').mockResolvedValue({
        content: 'Code analysis: The AMPScript syntax is correct',
        codeBlocks: [],
        usage: { promptTokens: 40, completionTokens: 80, totalTokens: 120 },
        model: 'gpt-4',
        finishReason: 'stop'
      })

      const response = await service.analyzeCode(request)

      expect(response.analysis).toContain('analysis')
      expect(response.errors).toBeDefined()
      expect(response.optimizations).toBeDefined()
    })

    it('should provide optimization suggestions', async () => {
      const request: DebugRequest = {
        code: 'SELECT * FROM Subscribers',
        language: 'sql',
        conversationHistory: []
      }

      jest.spyOn(service as any, 'callAIService').mockResolvedValue({
        content: 'Analysis: Query could be optimized by specifying columns and adding TOP clause',
        codeBlocks: [{
          language: 'sql',
          code: 'SELECT TOP 1000 EmailAddress, FirstName FROM Subscribers',
          explanation: 'Optimized version with specific columns and row limit'
        }],
        usage: { promptTokens: 50, completionTokens: 90, totalTokens: 140 },
        model: 'gpt-4',
        finishReason: 'stop'
      })

      const response = await service.analyzeCode(request)

      expect(response.analysis).toContain('optimized')
      expect(response.fixedCode).toContain('TOP 1000')
    })
  })

  describe('error handling', () => {
    it('should handle AI service errors gracefully', async () => {
      jest.spyOn(service as any, 'testConnection').mockResolvedValue(undefined)
      await service.initialize()

      const request: CodeGenerationRequest = {
        prompt: 'Generate code',
        language: 'ampscript',
        conversationHistory: []
      }

      jest.spyOn(service as any, 'callAIService').mockRejectedValue(new Error('AI service unavailable'))

      await expect(service.generateCode(request)).rejects.toThrow()
    })

    it('should require initialization before use', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Generate code',
        language: 'ampscript',
        conversationHistory: []
      }

      await expect(service.generateCode(request)).rejects.toThrow('Service not initialized')
    })
  })

  describe('SFMC language validation', () => {
    beforeEach(async () => {
      jest.spyOn(service as any, 'testConnection').mockResolvedValue(undefined)
      await service.initialize()
    })

    it('should validate generated AMPScript code', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create invalid AMPScript',
        language: 'ampscript',
        conversationHistory: []
      }

      jest.spyOn(service as any, 'callAIService').mockResolvedValue({
        content: 'Generated code with validation',
        codeBlocks: [{
          language: 'ampscript',
          code: '%%=InvalidFunction()=%%',
          explanation: 'Code with invalid function'
        }],
        usage: { promptTokens: 30, completionTokens: 60, totalTokens: 90 },
        model: 'gpt-4',
        finishReason: 'stop'
      })

      // Mock validation to return errors
      jest.spyOn(service['languageValidators'], 'validate').mockResolvedValue({
        isValid: false,
        errors: [{
          line: 1,
          message: 'Unknown function: InvalidFunction',
          rule: 'ampscript-unknown-function',
          severity: 'error'
        }],
        warnings: [],
        suggestions: []
      })

      const response = await service.generateCode(request)

      // Service should still return response but log validation warnings
      expect(response.codeBlocks).toHaveLength(1)
    })
  })
})