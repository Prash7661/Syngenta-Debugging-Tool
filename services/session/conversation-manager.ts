import { createClient, RedisClientType } from 'redis';
import { ConversationHistory, Message } from '../../types/session';
import { ErrorFactory } from '../../utils/errors/error-factory';
import { Logger } from '../../utils/logging/logger';

export class ConversationManager {
  private redisClient: RedisClientType;
  private logger: Logger;
  private readonly CONVERSATION_PREFIX = 'conversation:';
  private readonly MESSAGE_PREFIX = 'message:';
  private readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private readonly MAX_MESSAGES_PER_CONVERSATION = 100;

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.logger = new Logger('ConversationManager');
    this.initializeRedisConnection();
  }

  private async initializeRedisConnection(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.logger.info('Redis connection established for ConversationManager');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw ErrorFactory.createInternalServerError('Redis connection failed');
    }
  }

  async getConversationHistory(sessionId: string): Promise<ConversationHistory> {
    try {
      const conversationKey = `${this.CONVERSATION_PREFIX}${sessionId}`;
      const historyData = await this.redisClient.get(conversationKey);

      if (!historyData) {
        return this.createEmptyConversationHistory();
      }

      const history: ConversationHistory = JSON.parse(historyData);
      
      // Load recent messages
      const messageKeys = history.messageIds?.slice(-20) || []; // Get last 20 messages
      const messages = await this.getMessages(messageKeys);
      
      return {
        ...history,
        messages
      };
    } catch (error) {
      this.logger.error(`Failed to get conversation history for session: ${sessionId}`, error);
      return this.createEmptyConversationHistory();
    }
  }

  async addMessage(sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    try {
      const messageId = this.generateMessageId();
      const fullMessage: Message = {
        ...message,
        id: messageId,
        timestamp: Date.now()
      };

      // Store the message
      await this.storeMessage(fullMessage);

      // Update conversation history
      const conversationKey = `${this.CONVERSATION_PREFIX}${sessionId}`;
      const historyData = await this.redisClient.get(conversationKey);
      
      let history: ConversationHistory;
      if (historyData) {
        history = JSON.parse(historyData);
      } else {
        history = this.createEmptyConversationHistory();
      }

      // Add message ID to history
      if (!history.messageIds) {
        history.messageIds = [];
      }
      
      history.messageIds.push(messageId);
      history.totalMessages = history.messageIds.length;
      history.lastUpdated = new Date();

      // Trim old messages if exceeding limit
      if (history.messageIds.length > this.MAX_MESSAGES_PER_CONVERSATION) {
        const removedMessageIds = history.messageIds.splice(0, history.messageIds.length - this.MAX_MESSAGES_PER_CONVERSATION);
        await this.deleteMessages(removedMessageIds);
      }

      // Store updated history
      await this.redisClient.setEx(conversationKey, this.DEFAULT_TTL, JSON.stringify(history));

      this.logger.info(`Message added to conversation: ${sessionId}`);
      return fullMessage;
    } catch (error) {
      this.logger.error(`Failed to add message to conversation: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Failed to add message');
    }
  }

  async clearConversationHistory(sessionId: string): Promise<void> {
    try {
      const conversationKey = `${this.CONVERSATION_PREFIX}${sessionId}`;
      const historyData = await this.redisClient.get(conversationKey);

      if (historyData) {
        const history: ConversationHistory = JSON.parse(historyData);
        
        // Delete all messages
        if (history.messageIds) {
          await this.deleteMessages(history.messageIds);
        }

        // Delete conversation history
        await this.redisClient.del(conversationKey);
      }

      this.logger.info(`Conversation history cleared for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to clear conversation history for session: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Failed to clear conversation history');
    }
  }

  async getRecentMessages(sessionId: string, limit: number = 10): Promise<Message[]> {
    try {
      const history = await this.getConversationHistory(sessionId);
      const recentMessageIds = history.messageIds?.slice(-limit) || [];
      return await this.getMessages(recentMessageIds);
    } catch (error) {
      this.logger.error(`Failed to get recent messages for session: ${sessionId}`, error);
      return [];
    }
  }

  async searchMessages(sessionId: string, query: string, limit: number = 20): Promise<Message[]> {
    try {
      const history = await this.getConversationHistory(sessionId);
      const allMessageIds = history.messageIds || [];
      const messages = await this.getMessages(allMessageIds);

      const filteredMessages = messages.filter(message => 
        message.content.toLowerCase().includes(query.toLowerCase()) ||
        (message.metadata?.codeBlocks?.some(block => 
          block.code.toLowerCase().includes(query.toLowerCase())
        ))
      );

      return filteredMessages.slice(-limit);
    } catch (error) {
      this.logger.error(`Failed to search messages for session: ${sessionId}`, error);
      return [];
    }
  }

  private async storeMessage(message: Message): Promise<void> {
    try {
      const messageKey = `${this.MESSAGE_PREFIX}${message.id}`;
      const messageData = JSON.stringify(message);
      
      await this.redisClient.setEx(messageKey, this.DEFAULT_TTL, messageData);
    } catch (error) {
      this.logger.error(`Failed to store message: ${message.id}`, error);
      throw ErrorFactory.createInternalServerError('Message storage failed');
    }
  }

  private async getMessages(messageIds: string[]): Promise<Message[]> {
    if (messageIds.length === 0) {
      return [];
    }

    try {
      const messageKeys = messageIds.map(id => `${this.MESSAGE_PREFIX}${id}`);
      const messageDataArray = await this.redisClient.mGet(messageKeys);
      
      const messages: Message[] = [];
      for (const messageData of messageDataArray) {
        if (messageData) {
          try {
            messages.push(JSON.parse(messageData));
          } catch (parseError) {
            this.logger.warn('Failed to parse message data', parseError);
          }
        }
      }

      return messages.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      this.logger.error('Failed to get messages', error);
      return [];
    }
  }

  private async deleteMessages(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    try {
      const messageKeys = messageIds.map(id => `${this.MESSAGE_PREFIX}${id}`);
      await this.redisClient.del(messageKeys);
    } catch (error) {
      this.logger.error('Failed to delete messages', error);
    }
  }

  private createEmptyConversationHistory(): ConversationHistory {
    return {
      messages: [],
      messageIds: [],
      lastUpdated: new Date(),
      totalMessages: 0
    };
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  async cleanup(): Promise<void> {
    try {
      await this.redisClient.quit();
      this.logger.info('Redis connection closed for ConversationManager');
    } catch (error) {
      this.logger.error('Failed to close Redis connection', error);
    }
  }
}