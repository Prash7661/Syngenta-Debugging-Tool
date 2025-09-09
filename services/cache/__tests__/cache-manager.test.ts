import { CacheManager } from '../cache-manager';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    mGet: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    multi: jest.fn(() => ({
      setEx: jest.fn(),
      exec: jest.fn()
    })),
    info: jest.fn(),
    dbSize: jest.fn(),
    quit: jest.fn()
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

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let mockRedisClient: any;

  beforeEach(() => {
    const { createClient } = require('redis');
    mockRedisClient = createClient();
    cacheManager = new CacheManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached data when key exists and not expired', async () => {
      const testData = { message: 'test data' };
      const cacheEntry = {
        data: testData,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000, // 1 minute from now
        version: '1.0'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await cacheManager.get('test-key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('cache:test-key');
    });

    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheManager.get('nonexistent-key');

      expect(result).toBeNull();
    });

    it('should return null and delete expired entries', async () => {
      const expiredEntry = {
        data: { message: 'expired data' },
        createdAt: Date.now() - 120000, // 2 minutes ago
        expiresAt: Date.now() - 60000, // 1 minute ago (expired)
        version: '1.0'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(expiredEntry));
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheManager.get('expired-key');

      expect(result).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:expired-key');
    });

    it('should use custom namespace when provided', async () => {
      const testData = { message: 'test data' };
      const cacheEntry = {
        data: testData,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60000,
        version: '1.0'
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cacheEntry));

      const result = await cacheManager.get('test-key', { namespace: 'custom' });

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('custom:test-key');
    });
  });

  describe('set', () => {
    it('should store data with default TTL', async () => {
      const testData = { message: 'test data' };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheManager.set('test-key', testData);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'cache:test-key',
        3600, // Default TTL (1 hour)
        expect.stringContaining('"data":{"message":"test data"}')
      );
    });

    it('should store data with custom TTL', async () => {
      const testData = { message: 'test data' };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheManager.set('test-key', testData, { ttl: 300 });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'cache:test-key',
        300,
        expect.any(String)
      );
    });

    it('should use custom namespace when provided', async () => {
      const testData = { message: 'test data' };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheManager.set('test-key', testData, { namespace: 'custom' });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'custom:test-key',
        3600,
        expect.any(String)
      );
    });
  });

  describe('delete', () => {
    it('should delete cache entry', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheManager.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('cache:test-key');
    });

    it('should use custom namespace when provided', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheManager.delete('test-key', { namespace: 'custom' });

      expect(mockRedisClient.del).toHaveBeenCalledWith('custom:test-key');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await cacheManager.exists('test-key');

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('cache:test-key');
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await cacheManager.exists('nonexistent-key');

      expect(result).toBe(false);
    });
  });

  describe('invalidatePattern', () => {
    it('should delete all keys matching pattern', async () => {
      const matchingKeys = ['cache:test:1', 'cache:test:2', 'cache:test:3'];
      mockRedisClient.keys.mockResolvedValue(matchingKeys);
      mockRedisClient.del.mockResolvedValue(3);

      const deletedCount = await cacheManager.invalidatePattern('test:*');

      expect(deletedCount).toBe(3);
      expect(mockRedisClient.keys).toHaveBeenCalledWith('cache:test:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(matchingKeys);
    });

    it('should return 0 when no keys match pattern', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const deletedCount = await cacheManager.invalidatePattern('nonexistent:*');

      expect(deletedCount).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('getMultiple', () => {
    it('should return multiple cache entries', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const cacheEntries = [
        JSON.stringify({
          data: { value: 1 },
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          version: '1.0'
        }),
        JSON.stringify({
          data: { value: 2 },
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000,
          version: '1.0'
        }),
        null // key3 doesn't exist
      ];

      mockRedisClient.mGet.mockResolvedValue(cacheEntries);

      const result = await cacheManager.getMultiple(keys);

      expect(result.size).toBe(3);
      expect(result.get('key1')).toEqual({ value: 1 });
      expect(result.get('key2')).toEqual({ value: 2 });
      expect(result.get('key3')).toBeNull();
    });

    it('should handle expired entries', async () => {
      const keys = ['expired-key'];
      const expiredEntry = JSON.stringify({
        data: { value: 'expired' },
        createdAt: Date.now() - 120000,
        expiresAt: Date.now() - 60000, // Expired
        version: '1.0'
      });

      mockRedisClient.mGet.mockResolvedValue([expiredEntry]);
      mockRedisClient.del.mockResolvedValue(1);

      const result = await cacheManager.getMultiple(keys);

      expect(result.get('expired-key')).toBeNull();
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });

  describe('setMultiple', () => {
    it('should set multiple cache entries', async () => {
      const entries = new Map([
        ['key1', { value: 1 }],
        ['key2', { value: 2 }]
      ]);

      const mockPipeline = {
        setEx: jest.fn(),
        exec: jest.fn().mockResolvedValue([])
      };
      mockRedisClient.multi.mockReturnValue(mockPipeline);

      await cacheManager.setMultiple(entries);

      expect(mockPipeline.setEx).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      mockRedisClient.info.mockResolvedValue('used_memory_human:1.5M\r\n');
      mockRedisClient.dbSize.mockResolvedValue(100);

      const stats = await cacheManager.getStats();

      expect(stats).toEqual({
        totalKeys: 100,
        memoryUsage: '1.5M',
        hitRate: 0
      });
    });
  });
});