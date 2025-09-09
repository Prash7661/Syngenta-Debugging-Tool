import { createClient, RedisClientType } from 'redis';
import { EncryptionService } from '../crypto/encryption-service';
import { UserSession, UserPreferences, ConversationHistory, EncryptedCredentials } from '../../types/session';
import { ErrorFactory } from '../../utils/errors/error-factory';
import { Logger } from '../../utils/logging/logger';

export class SessionManager {
  private redisClient: RedisClientType;
  private encryptionService: EncryptionService;
  private logger: Logger;
  private readonly SESSION_PREFIX = 'session:';
  private readonly CONVERSATION_PREFIX = 'conversation:';
  private readonly PREFERENCES_PREFIX = 'preferences:';
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours in seconds

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.encryptionService = new EncryptionService();
    this.logger = new Logger('SessionManager');
    this.initializeRedisConnection();
  }

  private async initializeRedisConnection(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.logger.info('Redis connection established');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw ErrorFactory.createInternalServerError('Redis connection failed');
    }
  }

  async createSession(userId?: string): Promise<UserSession> {
    const sessionId = this.generateSessionId();
    const session: UserSession = {
      sessionId,
      userId,
      preferences: this.getDefaultPreferences(),
      conversationHistory: {
        messages: [],
        lastUpdated: new Date(),
        totalMessages: 0
      },
      createdAt: new Date(),
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + this.DEFAULT_TTL * 1000)
    };

    await this.storeSession(session);
    this.logger.info(`Session created: ${sessionId}`);
    return session;
  }

  async getSession(sessionId: string): Promise<UserSession | null> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const sessionData = await this.redisClient.get(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      const session: UserSession = JSON.parse(sessionData);
      
      // Check if session is expired
      if (new Date() > new Date(session.expiresAt)) {
        await this.deleteSession(sessionId);
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      await this.storeSession(session);

      return session;
    } catch (error) {
      this.logger.error(`Failed to get session: ${sessionId}`, error);
      return null;
    }
  }

  async updateSession(session: UserSession): Promise<void> {
    session.lastActivity = new Date();
    await this.storeSession(session);
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      const conversationKey = `${this.CONVERSATION_PREFIX}${sessionId}`;
      const preferencesKey = `${this.PREFERENCES_PREFIX}${sessionId}`;

      await Promise.all([
        this.redisClient.del(sessionKey),
        this.redisClient.del(conversationKey),
        this.redisClient.del(preferencesKey)
      ]);

      this.logger.info(`Session deleted: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to delete session: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Session deletion failed');
    }
  }

  async storeEncryptedCredentials(sessionId: string, credentials: any): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw ErrorFactory.createNotFoundError('Session not found');
      }

      const encryptedCredentials: EncryptedCredentials = {
        encryptedData: await this.encryptionService.encrypt(JSON.stringify(credentials)),
        encryptionVersion: '1.0',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      session.sfmcCredentials = encryptedCredentials;
      await this.storeSession(session);
      
      this.logger.info(`Credentials stored for session: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to store credentials for session: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Credential storage failed');
    }
  }

  async getDecryptedCredentials(sessionId: string): Promise<any | null> {
    try {
      const session = await this.getSession(sessionId);
      if (!session?.sfmcCredentials) {
        return null;
      }

      const { encryptedData, expiresAt } = session.sfmcCredentials;
      
      // Check if credentials are expired
      if (new Date() > new Date(expiresAt)) {
        await this.clearCredentials(sessionId);
        return null;
      }

      const decryptedData = await this.encryptionService.decrypt(encryptedData);
      return JSON.parse(decryptedData);
    } catch (error) {
      this.logger.error(`Failed to decrypt credentials for session: ${sessionId}`, error);
      return null;
    }
  }

  async clearCredentials(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (session) {
        delete session.sfmcCredentials;
        await this.storeSession(session);
        this.logger.info(`Credentials cleared for session: ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to clear credentials for session: ${sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Credential clearing failed');
    }
  }

  private async storeSession(session: UserSession): Promise<void> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${session.sessionId}`;
      const sessionData = JSON.stringify(session);
      
      await this.redisClient.setEx(sessionKey, this.DEFAULT_TTL, sessionData);
    } catch (error) {
      this.logger.error(`Failed to store session: ${session.sessionId}`, error);
      throw ErrorFactory.createInternalServerError('Session storage failed');
    }
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      defaultLanguage: 'ampscript',
      debugLevel: 'advanced',
      theme: 'system',
      autoSave: true,
      codeFormatting: {
        indentSize: 2,
        insertFinalNewline: true,
        trimTrailingWhitespace: true
      }
    };
  }

  async cleanup(): Promise<void> {
    try {
      await this.redisClient.quit();
      this.logger.info('Redis connection closed');
    } catch (error) {
      this.logger.error('Failed to close Redis connection', error);
    }
  }
}