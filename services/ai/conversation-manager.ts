import { Message, ConversationHistory, UserSession, CodeLanguage } from '../../types/models'
import { Logger } from '../../utils/errors/error-handler'

export interface ConversationContext {
  sessionId: string
  userId?: string
  currentLanguage?: CodeLanguage
  codeContext?: string
  lastActivity: Date
  metadata: ConversationMetadata
}

export interface ConversationMetadata {
  totalMessages: number
  codeBlocksGenerated: number
  errorsFixed: number
  languagesUsed: CodeLanguage[]
  topics: string[]
  complexity: 'beginner' | 'intermediate' | 'advanced'
}

export interface ConversationSummary {
  keyTopics: string[]
  codePatterns: string[]
  userPreferences: {
    preferredLanguage?: CodeLanguage
    codingStyle?: string
    verbosity?: 'concise' | 'detailed' | 'verbose'
  }
  recentContext: string
}

export class ConversationManager {
  private logger = new Logger('ConversationManager')
  private conversations = new Map<string, ConversationContext>()
  private readonly MAX_MESSAGES_IN_MEMORY = 50
  private readonly CONTEXT_WINDOW_SIZE = 10

  constructor() {
    // Clean up old conversations periodically
    setInterval(() => this.cleanupOldConversations(), 60000) // Every minute
  }

  async getConversationHistory(sessionId: string): Promise<ConversationHistory> {
    const context = this.conversations.get(sessionId)
    
    if (!context) {
      return this.createEmptyHistory()
    }

    // In a real implementation, this would fetch from persistent storage
    // For now, we'll return a basic structure
    return {
      messages: [],
      totalMessages: context.metadata.totalMessages,
      lastUpdated: context.lastActivity
    }
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    let context = this.conversations.get(sessionId)
    
    if (!context) {
      context = this.createNewContext(sessionId)
      this.conversations.set(sessionId, context)
    }

    // Update context metadata
    context.metadata.totalMessages++
    context.lastActivity = new Date()
    
    // Extract language from message metadata
    if (message.metadata?.language) {
      context.currentLanguage = message.metadata.language
      if (!context.metadata.languagesUsed.includes(message.metadata.language)) {
        context.metadata.languagesUsed.push(message.metadata.language)
      }
    }

    // Extract topics and patterns
    this.extractTopicsFromMessage(message, context)
    
    // Update code context if message contains code
    if (message.metadata?.codeBlocks && message.metadata.codeBlocks.length > 0) {
      context.metadata.codeBlocksGenerated += message.metadata.codeBlocks.length
      context.codeContext = this.buildCodeContext(message.metadata.codeBlocks)
    }

    // In a real implementation, persist to storage here
    await this.persistMessage(sessionId, message)
    
    this.logger.info('Message added to conversation', { 
      sessionId, 
      messageId: message.id,
      totalMessages: context.metadata.totalMessages 
    })
  }

  async getRecentMessages(sessionId: string, count: number = this.CONTEXT_WINDOW_SIZE): Promise<Message[]> {
    // In a real implementation, this would fetch from persistent storage
    // For now, return empty array as placeholder
    return []
  }

  async getConversationSummary(sessionId: string): Promise<ConversationSummary> {
    const context = this.conversations.get(sessionId)
    
    if (!context) {
      return this.createEmptySummary()
    }

    const recentMessages = await this.getRecentMessages(sessionId, 5)
    
    return {
      keyTopics: context.metadata.topics.slice(0, 5),
      codePatterns: this.extractCodePatterns(context),
      userPreferences: {
        preferredLanguage: this.getPreferredLanguage(context),
        codingStyle: this.inferCodingStyle(context),
        verbosity: this.inferVerbosity(context)
      },
      recentContext: this.buildRecentContext(recentMessages)
    }
  }

  async clearConversation(sessionId: string): Promise<void> {
    this.conversations.delete(sessionId)
    
    // In a real implementation, also clear from persistent storage
    await this.clearPersistedConversation(sessionId)
    
    this.logger.info('Conversation cleared', { sessionId })
  }

  async updateConversationMetadata(
    sessionId: string, 
    updates: Partial<ConversationMetadata>
  ): Promise<void> {
    const context = this.conversations.get(sessionId)
    
    if (context) {
      Object.assign(context.metadata, updates)
      context.lastActivity = new Date()
    }
  }

  async getActiveConversations(): Promise<string[]> {
    const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
    
    return Array.from(this.conversations.entries())
      .filter(([_, context]) => context.lastActivity > activeThreshold)
      .map(([sessionId, _]) => sessionId)
  }

  async exportConversation(sessionId: string): Promise<ConversationExport | null> {
    const context = this.conversations.get(sessionId)
    const history = await this.getConversationHistory(sessionId)
    
    if (!context) {
      return null
    }

    return {
      sessionId,
      context,
      history,
      exportedAt: new Date(),
      version: '1.0'
    }
  }

  private createNewContext(sessionId: string): ConversationContext {
    return {
      sessionId,
      lastActivity: new Date(),
      metadata: {
        totalMessages: 0,
        codeBlocksGenerated: 0,
        errorsFixed: 0,
        languagesUsed: [],
        topics: [],
        complexity: 'beginner'
      }
    }
  }

  private createEmptyHistory(): ConversationHistory {
    return {
      messages: [],
      totalMessages: 0,
      lastUpdated: new Date()
    }
  }

  private createEmptySummary(): ConversationSummary {
    return {
      keyTopics: [],
      codePatterns: [],
      userPreferences: {},
      recentContext: ''
    }
  }

  private extractTopicsFromMessage(message: Message, context: ConversationContext): void {
    const content = message.content.toLowerCase()
    
    // Extract SFMC-related topics
    const sfmcTopics = [
      'ampscript', 'ssjs', 'data extension', 'email', 'journey', 'automation',
      'personalization', 'cloud page', 'content builder', 'mobile connect'
    ]

    sfmcTopics.forEach(topic => {
      if (content.includes(topic) && !context.metadata.topics.includes(topic)) {
        context.metadata.topics.push(topic)
      }
    })

    // Limit topics to prevent memory bloat
    if (context.metadata.topics.length > 20) {
      context.metadata.topics = context.metadata.topics.slice(-20)
    }
  }

  private buildCodeContext(codeBlocks: any[]): string {
    return codeBlocks
      .map(block => `${block.language}: ${block.code.substring(0, 200)}`)
      .join('\n---\n')
  }

  private extractCodePatterns(context: ConversationContext): string[] {
    const patterns: string[] = []
    
    // Based on languages used and topics, suggest common patterns
    if (context.metadata.languagesUsed.includes('ampscript')) {
      patterns.push('AMPScript personalization', 'Data lookups', 'Email content blocks')
    }
    
    if (context.metadata.languagesUsed.includes('ssjs')) {
      patterns.push('SSJS data processing', 'API integrations', 'Cloud page logic')
    }
    
    if (context.metadata.languagesUsed.includes('sql')) {
      patterns.push('Data extension queries', 'Segmentation', 'Reporting queries')
    }

    return patterns.slice(0, 5)
  }

  private getPreferredLanguage(context: ConversationContext): CodeLanguage | undefined {
    const languageCounts = new Map<CodeLanguage, number>()
    
    context.metadata.languagesUsed.forEach(lang => {
      languageCounts.set(lang, (languageCounts.get(lang) || 0) + 1)
    })

    let maxCount = 0
    let preferredLanguage: CodeLanguage | undefined

    languageCounts.forEach((count, language) => {
      if (count > maxCount) {
        maxCount = count
        preferredLanguage = language
      }
    })

    return preferredLanguage
  }

  private inferCodingStyle(context: ConversationContext): string {
    // Simple heuristic based on conversation complexity and topics
    if (context.metadata.complexity === 'advanced') {
      return 'enterprise'
    } else if (context.metadata.codeBlocksGenerated > 10) {
      return 'professional'
    } else {
      return 'standard'
    }
  }

  private inferVerbosity(context: ConversationContext): 'concise' | 'detailed' | 'verbose' {
    // Simple heuristic based on message patterns
    if (context.metadata.totalMessages > 20) {
      return 'concise' // User seems experienced
    } else if (context.metadata.topics.includes('beginner')) {
      return 'verbose'
    } else {
      return 'detailed'
    }
  }

  private buildRecentContext(messages: Message[]): string {
    return messages
      .slice(-3) // Last 3 messages
      .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}`)
      .join('\n')
  }

  private async persistMessage(sessionId: string, message: Message): Promise<void> {
    // In a real implementation, this would save to database/cache
    // For now, just log the action
    this.logger.debug('Message persisted', { sessionId, messageId: message.id })
  }

  private async clearPersistedConversation(sessionId: string): Promise<void> {
    // In a real implementation, this would clear from database/cache
    this.logger.debug('Persisted conversation cleared', { sessionId })
  }

  private cleanupOldConversations(): void {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days
    
    for (const [sessionId, context] of this.conversations.entries()) {
      if (context.lastActivity < cutoffTime) {
        this.conversations.delete(sessionId)
        this.logger.debug('Old conversation cleaned up', { sessionId })
      }
    }
  }
}

export interface ConversationExport {
  sessionId: string
  context: ConversationContext
  history: ConversationHistory
  exportedAt: Date
  version: string
}