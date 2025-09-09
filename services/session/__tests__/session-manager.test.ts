import { SessionManager } from '../session-manager';
import { UserSession } from '../../../types/session';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    mGet: jest.fn(),
    quit: jest.fn()
  }))
}));

// Mock encryption service
jest.mock('../../crypto/encryption-service', () => ({
  EncryptionService: jest.fn(() => ({
    encrypt: jest.fn((data) => Promise.resolve(`encrypted_${data}`)),
    decrypt: jest.fn((data) => Promise.resolve(data.replace('encrypted_', '')))
  }))
}));

// Mock logger
jest.mock('../../../utils/logging/logger', () => ({
  Logger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }))
}));

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockRedisClient: any;

  beforeEach(() => {
    const { createClient } = require('redis');
    mockRedisClient = createClient();
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session with default preferences', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      const session = await sessionManager.createSession();

      expect(session).toMatchObject({
        sessionId: expect.stringMatching(/^sess_/),
        preferences: {
          defaultLanguage: 'ampscript',
          debugLevel: 'advanced',
          theme: 'system',
          autoSave: true
        },
        conversationHistory: {
          messages: [],
          totalMessages: 0
        }
      });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^session:/),
        24 * 60 * 60,
        expect.any(String)
      );
    });

    it('should create a session with userId when provided', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');
      const userId = 'user123';

      const session = await sessionManager.createSession(userId);

      expect(session.userId).toBe(userId);
    });
  });

  describe('getSession', () => {
    it('should return session when it exists and is not expired', async () => {
      const mockSession: UserSession = {
        sessionId: 'sess_123',
        preferences: {
          defaultLanguage: 'ampscript',
          debugLevel: 'advanced',
          theme: 'system',
          autoSave: true,
          codeFormatting: {
            indentSize: 2,
            insertFinalNewline: true,
            trimTrailingWhitespace: true
          }
        },
        conversationHistory: {
          messages: [],
          lastUpdated: new Date(),
          totalMessages: 0
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
      mockRedisClient.setEx.mockResolvedValue('OK');

      const session = await sessionManager.getSession('sess_123');

      expect(session).toBeTruthy();
      expect(session?.sessionId).toBe('sess_123');
      expect(mockRedisClient.get).toHaveBeenCalledWith('session:sess_123');
    });

    it('should return null when session does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const session = await sessionManager.getSession('nonexistent');

      expect(session).toBeNull();
    });

    it('should delete and return null when session is expired', async () => {
      const expiredSession: UserSession = {
        sessionId: 'sess_expired',
        preferences: {
          defaultLanguage: 'ampscript',
          debugLevel: 'advanced',
          theme: 'system',
          autoSave: true,
          codeFormatting: {
            indentSize: 2,
            insertFinalNewline: true,
            trimTrailingWhitespace: true
          }
        },
        conversationHistory: {
          messages: [],
          lastUpdated: new Date(),
          totalMessages: 0
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredSession));
      mockRedisClient.del.mockResolvedValue(1);

      const session = await sessionManager.getSession('sess_expired');

      expect(session).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledTimes(3); // session, conversation, preferences
    });
  });

  describe('storeEncryptedCredentials', () => {
    it('should encrypt and store credentials', async () => {
      const mockSession: UserSession = {
        sessionId: 'sess_123',
        preferences: {
          defaultLanguage: 'ampscript',
          debugLevel: 'advanced',
          theme: 'system',
          autoSave: true,
          codeFormatting: {
            indentSize: 2,
            insertFinalNewline: true,
            trimTrailingWhitespace: true
          }
        },
        conversationHistory: {
          messages: [],
          lastUpdated: new Date(),
          totalMessages: 0
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
      mockRedisClient.setEx.mockResolvedValue('OK');

      const credentials = { clientId: 'test', clientSecret: 'secret' };
      await sessionManager.storeEncryptedCredentials('sess_123', credentials);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'session:sess_123',
        24 * 60 * 60,
        expect.stringContaining('encrypted_')
      );
    });

    it('should throw error when session not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      await expect(
        sessionManager.storeEncryptedCredentials('nonexistent', {})
      ).rejects.toThrow();
    });
  });

  describe('getDecryptedCredentials', () => {
    it('should decrypt and return credentials when valid', async () => {
      const mockSession: UserSession = {
        sessionId: 'sess_123',
        sfmcCredentials: {
          encryptedData: 'encrypted_{"clientId":"test","clientSecret":"secret"}',
          encryptionVersion: '1.0',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        preferences: {
          defaultLanguage: 'ampscript',
          debugLevel: 'advanced',
          theme: 'system',
          autoSave: true,
          codeFormatting: {
            indentSize: 2,
            insertFinalNewline: true,
            trimTrailingWhitespace: true
          }
        },
        conversationHistory: {
          messages: [],
          lastUpdated: new Date(),
          totalMessages: 0
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));

      const credentials = await sessionManager.getDecryptedCredentials('sess_123');

      expect(credentials).toEqual({
        clientId: 'test',
        clientSecret: 'secret'
      });
    });

    it('should return null when credentials are expired', async () => {
      const mockSession: UserSession = {
        sessionId: 'sess_123',
        sfmcCredentials: {
          encryptedData: 'encrypted_data',
          encryptionVersion: '1.0',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() - 1000) // Expired
        },
        preferences: {
          defaultLanguage: 'ampscript',
          debugLevel: 'advanced',
          theme: 'system',
          autoSave: true,
          codeFormatting: {
            indentSize: 2,
            insertFinalNewline: true,
            trimTrailingWhitespace: true
          }
        },
        conversationHistory: {
          messages: [],
          lastUpdated: new Date(),
          totalMessages: 0
        },
        createdAt: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockSession));
      mockRedisClient.setEx.mockResolvedValue('OK');

      const credentials = await sessionManager.getDecryptedCredentials('sess_123');

      expect(credentials).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session and related data', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await sessionManager.deleteSession('sess_123');

      expect(mockRedisClient.del).toHaveBeenCalledWith([
        'session:sess_123',
        'conversation:sess_123',
        'preferences:sess_123'
      ]);
    });
  });
});