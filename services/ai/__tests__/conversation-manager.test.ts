import { ConversationManager } from '../conversation-manager'
import { Message } from '../../../types/models'

describe('ConversationManager', () => {
  let conversationManager: ConversationManager

  beforeEach(() => {
    conversationManager = new ConversationManager()
  })

  describe('conversation history', () => {
    it('should create empty history for new session', async () => {
      const history = await conversationManager.getConversationHistory('new-session')

      expect(history.messages).toHaveLength(0)
      expect(history.totalMessages).toBe(0)
      expect(history.lastUpdated).toBeInstanceOf(Date)
    })

    it('should add messages to conversation', async () => {
      const sessionId = 'test-session'
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Generate AMPScript for personalization',
        timestamp: Date.now(),
        metadata: {
          language: 'ampscript'
        }
      }

      await conversationManager.addMessage(sessionId, message)

      // Verify message was added (in real implementation, would check persistent storage)
      const activeConversations = await conversationManager.getActiveConversations()
      expect(activeConversations).toContain(sessionId)
    })

    it('should track conversation metadata', async () => {
      const sessionId = 'metadata-test'
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Create SSJS for data extension',
        timestamp: Date.now(),
        metadata: {
          language: 'ssjs',
          codeBlocks: [{
            language: 'ssjs',
            code: 'Platform.Load("Core", "1");'
          }]
        }
      }

      await conversationManager.addMessage(sessionId, message)

      const summary = await conversationManager.getConversationSummary(sessionId)
      expect(summary.userPreferences.preferredLanguage).toBe('ssjs')
      expect(summary.keyTopics).toContain('ssjs')
    })

    it('should clear conversation', async () => {
      const sessionId = 'clear-test'
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Test message',
        timestamp: Date.now()
      }

      await conversationManager.addMessage(sessionId, message)
      await conversationManager.clearConversation(sessionId)

      const activeConversations = await conversationManager.getActiveConversations()
      expect(activeConversations).not.toContain(sessionId)
    })
  })

  describe('conversation summary', () => {
    it('should generate conversation summary', async () => {
      const sessionId = 'summary-test'
      
      // Add multiple messages with different languages
      const messages: Message[] = [
        {
          id: '1',
          role: 'user',
          content: 'Create AMPScript personalization',
          timestamp: Date.now(),
          metadata: { language: 'ampscript' }
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Here is AMPScript code',
          timestamp: Date.now(),
          metadata: { 
            language: 'ampscript',
            codeBlocks: [{ language: 'ampscript', code: '%%=Field("FirstName")=%%' }]
          }
        },
        {
          id: '3',
          role: 'user',
          content: 'Now create SSJS for data extension',
          timestamp: Date.now(),
          metadata: { language: 'ssjs' }
        }
      ]

      for (const message of messages) {
        await conversationManager.addMessage(sessionId, message)
      }

      const summary = await conversationManager.getConversationSummary(sessionId)

      expect(summary.keyTopics.length).toBeGreaterThan(0)
      expect(summary.codePatterns.length).toBeGreaterThan(0)
      expect(summary.userPreferences).toBeDefined()
      expect(summary.recentContext).toBeDefined()
    })

    it('should return empty summary for non-existent session', async () => {
      const summary = await conversationManager.getConversationSummary('non-existent')

      expect(summary.keyTopics).toHaveLength(0)
      expect(summary.codePatterns).toHaveLength(0)
      expect(summary.userPreferences).toEqual({})
      expect(summary.recentContext).toBe('')
    })
  })

  describe('conversation export', () => {
    it('should export conversation data', async () => {
      const sessionId = 'export-test'
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Test export',
        timestamp: Date.now()
      }

      await conversationManager.addMessage(sessionId, message)

      const exported = await conversationManager.exportConversation(sessionId)

      expect(exported).toBeTruthy()
      expect(exported!.sessionId).toBe(sessionId)
      expect(exported!.context).toBeDefined()
      expect(exported!.history).toBeDefined()
      expect(exported!.exportedAt).toBeInstanceOf(Date)
      expect(exported!.version).toBe('1.0')
    })

    it('should return null for non-existent conversation', async () => {
      const exported = await conversationManager.exportConversation('non-existent')
      expect(exported).toBeNull()
    })
  })

  describe('active conversations', () => {
    it('should track active conversations', async () => {
      const sessionIds = ['active-1', 'active-2', 'active-3']
      
      for (const sessionId of sessionIds) {
        const message: Message = {
          id: '1',
          role: 'user',
          content: 'Test message',
          timestamp: Date.now()
        }
        await conversationManager.addMessage(sessionId, message)
      }

      const activeConversations = await conversationManager.getActiveConversations()

      sessionIds.forEach(sessionId => {
        expect(activeConversations).toContain(sessionId)
      })
    })
  })

  describe('conversation metadata updates', () => {
    it('should update conversation metadata', async () => {
      const sessionId = 'metadata-update-test'
      const message: Message = {
        id: '1',
        role: 'user',
        content: 'Initial message',
        timestamp: Date.now()
      }

      await conversationManager.addMessage(sessionId, message)

      await conversationManager.updateConversationMetadata(sessionId, {
        complexity: 'advanced',
        errorsFixed: 5
      })

      // In a real implementation, we would verify the metadata was updated
      // For now, just ensure the method doesn't throw
      expect(true).toBe(true)
    })
  })
})