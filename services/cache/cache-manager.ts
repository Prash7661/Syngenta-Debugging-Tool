import { createClient, RedisClientType } from 'redis';
import { Logger } from '../../utils/logging/logger';
import { ErrorFactory } from '../../utils/errors/error-factory';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string;
  compress?: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  createdAt: number;
  expiresAt: number;
  version: string;
  metadata?: Record<string, any>;
}

export class CacheManager {
  private redisClient: RedisClientType;
  private logger: Logger;
  private readonly DEFAULT_TTL = 60 * 60; // 1 hour
  private readonly DEFAULT_NAMESPACE = 'cache';

  constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });
    this.logger = new Logger('CacheManager');
    this.initializeRedisConnection();
  }

  private async initializeRedisConnection(): Promise<void> {
    try {
      await this.redisClient.connect();
      this.logger.info('Redis connection established for CacheManager');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      throw ErrorFactory.createInternalServerError('Redis connection failed');
    }
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const cachedData = await this.redisClient.get(fullKey);

      if (!cachedData) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cachedData);

      // Check if entry is expired
      if (Date.now() > entry.expiresAt) {
        await this.delete(key, options);
        return null;
      }

      this.logger.debug(`Cache hit for key: ${fullKey}`);
      return entry.data;
    } catch (error) {
      this.logger.error(`Failed to get cache entry: ${key}`, error);
      return null;
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.DEFAULT_TTL;
      const fullKey = this.buildKey(key, options.namespace);
      
      const entry: CacheEntry<T> = {
        data,
        createdAt: Date.now(),
        expiresAt: Date.now() + (ttl * 1000),
        version: '1.0',
        metadata: options
      };

      const serializedEntry = JSON.stringify(entry);
      await this.redisClient.setEx(fullKey, ttl, serializedEntry);

      this.logger.debug(`Cache set for key: ${fullKey}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Failed to set cache entry: ${key}`, error);
      throw ErrorFactory.createInternalServerError('Cache set failed');
    }
  }

  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      await this.redisClient.del(fullKey);
      this.logger.debug(`Cache deleted for key: ${fullKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache entry: ${key}`, error);
    }
  }

  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key, options.namespace);
      const exists = await this.redisClient.exists(fullKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache existence: ${key}`, error);
      return false;
    }
  }

  async invalidatePattern(pattern: string, options: CacheOptions = {}): Promise<number> {
    try {
      const fullPattern = this.buildKey(pattern, options.namespace);
      const keys = await this.redisClient.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await this.redisClient.del(keys);
      this.logger.info(`Invalidated ${deletedCount} cache entries matching pattern: ${fullPattern}`);
      return deletedCount;
    } catch (error) {
      this.logger.error(`Failed to invalidate cache pattern: ${pattern}`, error);
      return 0;
    }
  }

  async getMultiple<T>(keys: string[], options: CacheOptions = {}): Promise<Map<string, T | null>> {
    try {
      const fullKeys = keys.map(key => this.buildKey(key, options.namespace));
      const cachedData = await this.redisClient.mGet(fullKeys);
      
      const result = new Map<string, T | null>();
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const data = cachedData[i];
        
        if (data) {
          try {
            const entry: CacheEntry<T> = JSON.parse(data);
            
            // Check if entry is expired
            if (Date.now() <= entry.expiresAt) {
              result.set(key, entry.data);
            } else {
              result.set(key, null);
              // Clean up expired entry
              await this.delete(key, options);
            }
          } catch (parseError) {
            this.logger.warn(`Failed to parse cached data for key: ${key}`, parseError);
            result.set(key, null);
          }
        } else {
          result.set(key, null);
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to get multiple cache entries', error);
      return new Map();
    }
  }

  async setMultiple<T>(entries: Map<string, T>, options: CacheOptions = {}): Promise<void> {
    try {
      const pipeline = this.redisClient.multi();
      const ttl = options.ttl || this.DEFAULT_TTL;

      for (const [key, data] of entries) {
        const fullKey = this.buildKey(key, options.namespace);
        const entry: CacheEntry<T> = {
          data,
          createdAt: Date.now(),
          expiresAt: Date.now() + (ttl * 1000),
          version: '1.0',
          metadata: options
        };

        const serializedEntry = JSON.stringify(entry);
        pipeline.setEx(fullKey, ttl, serializedEntry);
      }

      await pipeline.exec();
      this.logger.debug(`Set ${entries.size} cache entries`);
    } catch (error) {
      this.logger.error('Failed to set multiple cache entries', error);
      throw ErrorFactory.createInternalServerError('Multiple cache set failed');
    }
  }

  async getStats(): Promise<{
    totalKeys: number;
    memoryUsage: string;
    hitRate: number;
  }> {
    try {
      const info = await this.redisClient.info('memory');
      const keyCount = await this.redisClient.dbSize();
      
      // Parse memory usage from info string
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        totalKeys: keyCount,
        memoryUsage,
        hitRate: 0 // Would need to implement hit/miss tracking for accurate rate
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Unknown',
        hitRate: 0
      };
    }
  }

  private buildKey(key: string, namespace?: string): string {
    const ns = namespace || this.DEFAULT_NAMESPACE;
    return `${ns}:${key}`;
  }

  async cleanup(): Promise<void> {
    try {
      await this.redisClient.quit();
      this.logger.info('Redis connection closed for CacheManager');
    } catch (error) {
      this.logger.error('Failed to close Redis connection', error);
    }
  }
}