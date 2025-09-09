import { BaseService } from '../base/base-service'
import { 
  AICodeGenerationRequest, 
  AICodeGenerationResponse, 
  AIAnalysisRequest, 
  AIAnalysisResponse,
  AIServiceConfig,
  AIContext,
  AIMessage
} from '../../types/ai'
import { 
  CodeLanguage, 
  CodeBlock, 
  DebugAnalysis,
  Message
} from '../../types/models'
import { 
  CodeGenerationRequest, 
  CodeGenerationResponse, 
  DebugRequest, 
  DebugResponse,
  IAICodeGenerationService 
} from '../../types/services'
import { AIServiceHttpClient } from '../../utils/http/client'
import { RetryManager } from '../../utils/errors/retry'
import { CircuitBreaker } from '../../utils/errors/circuit-breaker'
import { ErrorFactory } from '../../utils/errors/error-factory'
import { SFMCContextProvider } from './sfmc-context-provider'
import { LanguageValidators } from './language-validators'
import { ConversationManager } from './conversation-manager'
import { TemplateManager } from './template-manager'
import { DocumentationGenerator } from './documentation-generator'
import { AIResponseCache } from '../cache/ai-response-cache'

export class AICodeGenerationService extends BaseService implements IAICodeGenerationService {
  private httpClient: AIServiceHttpClient
  private circuitBreaker: CircuitBreaker
  private sfmcContextProvider: SFMCContextProvider
  private languageValidators: LanguageValidators
  private conversationManager: ConversationManager
  private templateManager: TemplateManager
  private documentationGenerator: DocumentationGenerator
  private aiResponseCache: AIResponseCache
  private config: AIServiceConfig

  constructor(config: AIServiceConfig) {
    super('AICodeGenerationService')
    this.config = config
    this.httpClient = new AIServiceHttpClient(config.apiKey, config.provider)
    this.circuitBreaker = new CircuitBreaker('ai_service')
    this.sfmcContextProvider = new SFMCContextProvider()
    this.languageValidators = new LanguageValidators()
    this.conversationManager = new ConversationManager()
    this.templateManager = new TemplateManager()
    this.documentationGenerator = new DocumentationGenerator()
    this.aiResponseCache = new AIResponseCache()
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing AI Code Generation Service')
    
    try {
      // Test API connection
      await this.testConnection()
      this.isInitialized = true
      this.logger.info('AI Code Generation Service initialized successfully')
    } catch (error) {
      this.logger.error('Failed to initialize AI Code Generation Service', error)
      throw ErrorFactory.createAIServiceError(
        'Failed to initialize AI service',
        this.config.provider,
        this.config.model
      )
    }
  }

  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    if (!this.isInitialized) {
      throw ErrorFactory.createAIServiceError('Service not initialized')
    }

    try {
      // Check cache first
      const cachedResponse = await this.aiResponseCache.getCachedResponse(request)
      if (cachedResponse) {
        return cachedResponse
      }

      // Build enhanced AI request with SFMC context
      const aiRequest = await this.buildAIRequest(request)
      
      // Execute with circuit breaker and retry logic
      const aiResponse = await this.circuitBreaker.execute(async () => {
        return RetryManager.aiServiceCall(async () => {
          return this.callAIService(aiRequest)
        })
      })

      // Parse and validate response
      const response = this.parseCodeGenerationResponse(aiResponse, request.language)
      
      // Validate generated code if it's SFMC-specific
      if (this.isSFMCLanguage(request.language)) {
        await this.validateSFMCCode(response, request.language)
      }

      // Cache the response
      await this.aiResponseCache.cacheResponse(request, response, this.config.model)

      return response
    } catch (error) {
      this.logger.error('Code generation failed', { error, request })
      throw this.handleAIServiceError(error)
    }
  }

  async analyzeCode(request: DebugRequest): Promise<DebugResponse> {
    if (!this.isInitialized) {
      throw ErrorFactory.createAIServiceError('Service not initialized')
    }

    try {
      // Build analysis request with SFMC-specific context
      const aiRequest = await this.buildAnalysisRequest(request)
      
      // Execute analysis with circuit breaker
      const aiResponse = await this.circuitBreaker.execute(async () => {
        return RetryManager.aiServiceCall(async () => {
          return this.callAIService(aiRequest)
        })
      })

      // Parse analysis response
      const analysis = this.parseAnalysisResponse(aiResponse, request.language)
      
      // Add SFMC-specific validation if applicable
      if (this.isSFMCLanguage(request.language)) {
        await this.enhanceWithSFMCAnalysis(analysis, request)
      }

      return {
        analysis: analysis.content,
        errors: analysis.debugAnalysis?.errors || [],
        fixedCode: analysis.fixedCode,
        optimizations: analysis.debugAnalysis?.suggestions || [],
        performanceScore: analysis.debugAnalysis?.performance?.maintainabilityIndex || 0
      }
    } catch (error) {
      this.logger.error('Code analysis failed', { error, request })
      throw this.handleAIServiceError(error)
    }
  }

  private async buildAIRequest(request: CodeGenerationRequest): Promise<AICodeGenerationRequest> {
    const context: AIContext = {
      previousMessages: this.convertMessages(request.conversationHistory || []),
      sfmcContext: await this.sfmcContextProvider.getSFMCContext(request.language),
      userPreferences: {
        codingStyle: 'professional',
        verbosity: 'detailed',
        includeComments: true
      }
    }

    // Build language-specific prompt
    const enhancedPrompt = await this.buildLanguageSpecificPrompt(
      request.prompt, 
      request.language, 
      context
    )

    return {
      prompt: enhancedPrompt,
      language: request.language,
      context,
      temperature: 0.1, // Lower temperature for more consistent code generation
      maxTokens: this.config.maxTokens,
      model: this.config.model
    }
  }

  private async buildAnalysisRequest(request: DebugRequest): Promise<AIAnalysisRequest> {
    const context: AIContext = {
      previousMessages: this.convertMessages(request.conversationHistory || []),
      codeContext: request.code,
      sfmcContext: await this.sfmcContextProvider.getSFMCContext(request.language)
    }

    return {
      code: request.code,
      language: request.language,
      analysisType: ['syntax', 'performance', 'security', 'best_practices'],
      context
    }
  }

  private async buildLanguageSpecificPrompt(
    prompt: string, 
    language?: CodeLanguage, 
    context?: AIContext
  ): Promise<string> {
    let enhancedPrompt = prompt

    if (language && this.isSFMCLanguage(language)) {
      const sfmcContext = context?.sfmcContext
      
      switch (language) {
        case 'ampscript':
          enhancedPrompt = `${prompt}

IMPORTANT: Generate AMPScript code following these guidelines:
- Use proper AMPScript syntax with %%= delimiters for output and %% for processing
- Include proper error handling with TreatAsContent() where appropriate
- Use SFMC functions like Lookup(), LookupRows(), InsertData(), etc.
- Follow SFMC naming conventions for variables and functions
- Include comments explaining complex logic
- Ensure code is optimized for SFMC's processing environment
${sfmcContext?.functions ? `- Available SFMC functions: ${sfmcContext.functions.join(', ')}` : ''}
${sfmcContext?.dataExtensions ? `- Available Data Extensions: ${sfmcContext.dataExtensions.join(', ')}` : ''}`
          break

        case 'ssjs':
          enhancedPrompt = `${prompt}

IMPORTANT: Generate Server-Side JavaScript (SSJS) code for Salesforce Marketing Cloud:
- Use SFMC SSJS Core and Platform libraries (Platform.Load, Platform.Function, etc.)
- Include proper error handling with try-catch blocks
- Use SFMC-specific objects like DataExtension, WSProxy, HTTP
- Follow SFMC SSJS best practices for performance
- Include logging for debugging purposes
- Ensure compatibility with SFMC's JavaScript engine
${sfmcContext?.functions ? `- Available SFMC SSJS functions: ${sfmcContext.functions.join(', ')}` : ''}
${sfmcContext?.dataExtensions ? `- Available Data Extensions: ${sfmcContext.dataExtensions.join(', ')}` : ''}`
          break

        case 'sql':
          enhancedPrompt = `${prompt}

IMPORTANT: Generate SQL optimized for Salesforce Marketing Cloud:
- Use SFMC SQL syntax and functions (DATEADD, DATEDIFF, etc.)
- Optimize queries for Data Extension performance
- Include proper JOIN syntax for SFMC data model
- Use appropriate data types and field references
- Follow SFMC SQL best practices for large datasets
- Include comments for complex queries
${sfmcContext?.dataExtensions ? `- Available Data Extensions: ${sfmcContext.dataExtensions.join(', ')}` : ''}`
          break
      }
    }

    return enhancedPrompt
  }

  private async callAIService(request: AICodeGenerationRequest): Promise<AICodeGenerationResponse> {
    const payload = this.buildAPIPayload(request)
    
    const response = await this.httpClient.post('/chat/completions', payload)
    
    if (!response.choices || response.choices.length === 0) {
      throw ErrorFactory.createAIServiceError('No response from AI service')
    }

    const choice = response.choices[0]
    const content = choice.message?.content || ''

    return {
      content,
      codeBlocks: this.extractCodeBlocks(content),
      usage: response.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      model: response.model || request.model || 'unknown',
      finishReason: choice.finish_reason || 'stop'
    }
  }

  private buildAPIPayload(request: AICodeGenerationRequest): any {
    const messages: any[] = [
      {
        role: 'system',
        content: this.getSystemPrompt(request.language)
      }
    ]

    // Add conversation history
    if (request.context?.previousMessages) {
      messages.push(...request.context.previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })))
    }

    // Add current prompt
    messages.push({
      role: 'user',
      content: request.prompt
    })

    return {
      model: request.model || this.config.model,
      messages,
      temperature: request.temperature || this.config.defaultTemperature,
      max_tokens: request.maxTokens || this.config.maxTokens
    }
  }

  private getSystemPrompt(language?: CodeLanguage): string {
    const basePrompt = `You are an expert developer assistant specializing in Salesforce Marketing Cloud (SFMC) development. You provide accurate, well-documented code solutions with proper error handling and best practices.`

    if (!language || !this.isSFMCLanguage(language)) {
      return basePrompt
    }

    const languagePrompts = {
      ampscript: `${basePrompt}

You specialize in AMPScript development for SFMC. Always:
- Use proper AMPScript syntax and delimiters
- Include error handling and validation
- Follow SFMC best practices for performance
- Provide clear explanations of AMPScript functions used
- Consider email rendering and personalization contexts`,

      ssjs: `${basePrompt}

You specialize in Server-Side JavaScript (SSJS) for SFMC. Always:
- Use SFMC Core and Platform libraries correctly
- Include proper error handling and logging
- Follow SFMC SSJS performance best practices
- Use appropriate SFMC objects and methods
- Consider data processing and API integration contexts`,

      sql: `${basePrompt}

You specialize in SQL for SFMC Data Extensions. Always:
- Use SFMC-compatible SQL syntax and functions
- Optimize for Data Extension performance
- Include proper data type handling
- Follow SFMC SQL limitations and best practices
- Consider data segmentation and automation contexts`
    }

    return languagePrompts[language as keyof typeof languagePrompts] || basePrompt
  }

  private extractCodeBlocks(content: string): CodeBlock[] {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
    const blocks: CodeBlock[] = []
    let match

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        explanation: this.extractExplanation(content, match.index)
      })
    }

    return blocks
  }

  private extractExplanation(content: string, codeIndex: number): string | undefined {
    // Extract explanation text that appears before the code block
    const beforeCode = content.substring(0, codeIndex)
    const lines = beforeCode.split('\n')
    const lastFewLines = lines.slice(-3).join('\n').trim()
    
    return lastFewLines.length > 10 ? lastFewLines : undefined
  }

  private parseCodeGenerationResponse(
    aiResponse: AICodeGenerationResponse, 
    language?: CodeLanguage
  ): CodeGenerationResponse {
    return {
      response: aiResponse.content,
      codeBlocks: aiResponse.codeBlocks,
      suggestions: this.extractSuggestions(aiResponse.content),
      executionTime: 0 // Will be set by the calling layer
    }
  }

  private parseAnalysisResponse(
    aiResponse: AICodeGenerationResponse, 
    language: CodeLanguage
  ): { content: string; debugAnalysis?: DebugAnalysis; fixedCode?: string } {
    const content = aiResponse.content
    
    // Extract structured analysis from AI response
    const debugAnalysis = this.extractDebugAnalysis(content, language)
    const fixedCode = this.extractFixedCode(content)

    return {
      content,
      debugAnalysis,
      fixedCode
    }
  }

  private extractSuggestions(content: string): string[] {
    // Extract suggestions from AI response
    const suggestionPatterns = [
      /(?:suggestion|recommend|consider|tip):\s*(.+)/gi,
      /(?:you (?:might|could|should)):\s*(.+)/gi
    ]

    const suggestions: string[] = []
    
    suggestionPatterns.forEach(pattern => {
      let match
      while ((match = pattern.exec(content)) !== null) {
        suggestions.push(match[1].trim())
      }
    })

    return suggestions.slice(0, 5) // Limit to 5 suggestions
  }

  private extractDebugAnalysis(content: string, language: CodeLanguage): DebugAnalysis | undefined {
    // This would parse structured analysis from AI response
    // For now, return a basic structure
    return {
      errors: [],
      warnings: [],
      suggestions: [],
      performance: {
        complexity: 1,
        maintainabilityIndex: 80,
        linesOfCode: 0
      },
      bestPractices: []
    }
  }

  private extractFixedCode(content: string): string | undefined {
    // Look for "fixed" or "corrected" code blocks
    const fixedCodeRegex = /(?:fixed|corrected|improved)\s+code:?\s*```\w*\n([\s\S]*?)```/i
    const match = fixedCodeRegex.exec(content)
    return match ? match[1].trim() : undefined
  }

  private async validateSFMCCode(
    response: CodeGenerationResponse, 
    language?: CodeLanguage
  ): Promise<void> {
    if (!language || !this.isSFMCLanguage(language)) return

    for (const codeBlock of response.codeBlocks) {
      if (codeBlock.language === language) {
        const validation = await this.languageValidators.validate(codeBlock.code, language)
        if (!validation.isValid) {
          this.logger.warn('Generated code validation failed', { 
            language, 
            errors: validation.errors 
          })
        }
      }
    }
  }

  private async enhanceWithSFMCAnalysis(
    analysis: { content: string; debugAnalysis?: DebugAnalysis }, 
    request: DebugRequest
  ): Promise<void> {
    if (!this.isSFMCLanguage(request.language)) return

    const validation = await this.languageValidators.validate(request.code, request.language)
    
    if (!validation.isValid && analysis.debugAnalysis) {
      // Add validation errors to the analysis
      validation.errors.forEach(error => {
        analysis.debugAnalysis!.errors.push({
          line: error.line || 1,
          column: error.column || 1,
          severity: 'error',
          message: error.message,
          rule: error.rule || 'sfmc-validation'
        })
      })
    }
  }

  private isSFMCLanguage(language?: CodeLanguage): boolean {
    return language === 'ampscript' || language === 'ssjs' || language === 'sql'
  }

  private convertMessages(messages: Message[]): AIMessage[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp
    }))
  }

  private async testConnection(): Promise<void> {
    try {
      const testRequest: AICodeGenerationRequest = {
        prompt: 'Test connection',
        temperature: 0.1,
        maxTokens: 10
      }
      
      await this.callAIService(testRequest)
    } catch (error) {
      throw ErrorFactory.createAIServiceError(
        'AI service connection test failed',
        this.config.provider
      )
    }
  }

  private handleAIServiceError(error: any): Error {
    if (error.type === 'AI_SERVICE_ERROR') {
      return error
    }
    
    return ErrorFactory.createAIServiceError(
      error.message || 'AI service error',
      this.config.provider,
      this.config.model
    )
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down AI Code Generation Service')
    this.isInitialized = false
  }

  async getCodeTemplates(language?: CodeLanguage, category?: string): Promise<any[]> {
    if (!this.isInitialized) {
      throw ErrorFactory.createAIServiceError('Service not initialized')
    }

    try {
      const searchOptions: any = {}
      if (language) searchOptions.language = language
      if (category) searchOptions.category = category

      return await this.templateManager.searchTemplates(searchOptions)
    } catch (error) {
      this.logger.error('Failed to get code templates', { error, language, category })
      throw this.handleAIServiceError(error)
    }
  }

  async renderTemplate(templateId: string, variables: Record<string, any>): Promise<string> {
    if (!this.isInitialized) {
      throw ErrorFactory.createAIServiceError('Service not initialized')
    }

    try {
      const rendered = await this.templateManager.renderTemplate(templateId, {
        variables,
        includeComments: true,
        formatCode: true
      })

      if (!rendered) {
        throw ErrorFactory.createAIServiceError(`Template not found: ${templateId}`)
      }

      return rendered
    } catch (error) {
      this.logger.error('Failed to render template', { error, templateId })
      throw this.handleAIServiceError(error)
    }
  }

  async generateDocumentation(
    code: string, 
    language: CodeLanguage, 
    options?: any
  ): Promise<string> {
    if (!this.isInitialized) {
      throw ErrorFactory.createAIServiceError('Service not initialized')
    }

    try {
      return await this.documentationGenerator.generateDocumentation(code, language, options)
    } catch (error) {
      this.logger.error('Failed to generate documentation', { error, language })
      throw this.handleAIServiceError(error)
    }
  }

  async getConversationHistory(sessionId: string): Promise<any> {
    if (!this.isInitialized) {
      throw ErrorFactory.createAIServiceError('Service not initialized')
    }

    try {
      return await this.conversationManager.getConversationHistory(sessionId)
    } catch (error) {
      this.logger.error('Failed to get conversation history', { error, sessionId })
      throw this.handleAIServiceError(error)
    }
  }

  async clearConversation(sessionId: string): Promise<void> {
    if (!this.isInitialized) {
      throw ErrorFactory.createAIServiceError('Service not initialized')
    }

    try {
      await this.conversationManager.clearConversation(sessionId)
    } catch (error) {
      this.logger.error('Failed to clear conversation', { error, sessionId })
      throw this.handleAIServiceError(error)
    }
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }> {
    if (!this.isInitialized) {
      return { status: 'unhealthy', details: 'Service not initialized' }
    }

    try {
      await this.testConnection()
      return { status: 'healthy' }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        details: { error: error.message } 
      }
    }
  }
}