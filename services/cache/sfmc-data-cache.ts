import { CacheManager, CacheOptions } from './cache-manager';
import { Logger } from '../../utils/logging/logger';
import { DataExtension, SFMCAsset } from '../../types/sfmc';

export interface SFMCCacheEntry<T = any> {
  data: T;
  lastModified: string;
  etag?: string;
  instanceId: string;
  endpoint: string;
}

export class SFMCDataCache {
  private cacheManager: CacheManager;
  private logger: Logger;
  private readonly NAMESPACE = 'sfmc_data';
  private readonly DEFAULT_TTL = 15 * 60; // 15 minutes
  private readonly LONG_TTL = 60 * 60; // 1 hour for static data
  private readonly SHORT_TTL = 5 * 60; // 5 minutes for frequently changing data

  constructor() {
    this.cacheManager = new CacheManager();
    this.logger = new Logger('SFMCDataCache');
  }

  async getDataExtensions(instanceId: string, forceRefresh: boolean = false): Promise<DataExtension[] | null> {
    if (forceRefresh) {
      await this.invalidateDataExtensions(instanceId);
      return null;
    }

    try {
      const cacheKey = `data_extensions:${instanceId}`;
      const cached = await this.cacheManager.get<SFMCCacheEntry<DataExtension[]>>(cacheKey, {
        namespace: this.NAMESPACE
      });

      if (cached) {
        this.logger.debug('SFMC data extensions cache hit', { instanceId });
        return cached.data;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get cached data extensions', error);
      return null;
    }
  }

  async cacheDataExtensions(instanceId: string, dataExtensions: DataExtension[], lastModified?: string): Promise<void> {
    try {
      const cacheKey = `data_extensions:${instanceId}`;
      const cacheEntry: SFMCCacheEntry<DataExtension[]> = {
        data: dataExtensions,
        lastModified: lastModified || new Date().toISOString(),
        instanceId,
        endpoint: 'data/v1/customobjectdata/key'
      };

      await this.cacheManager.set(cacheKey, cacheEntry, {
        namespace: this.NAMESPACE,
        ttl: this.DEFAULT_TTL
      });

      this.logger.info('SFMC data extensions cached', { instanceId, count: dataExtensions.length });
    } catch (error) {
      this.logger.error('Failed to cache data extensions', error);
    }
  }

  async getAsset(instanceId: string, assetId: string, assetType: string): Promise<SFMCAsset | null> {
    try {
      const cacheKey = `asset:${instanceId}:${assetType}:${assetId}`;
      const cached = await this.cacheManager.get<SFMCCacheEntry<SFMCAsset>>(cacheKey, {
        namespace: this.NAMESPACE
      });

      if (cached) {
        this.logger.debug('SFMC asset cache hit', { instanceId, assetId, assetType });
        return cached.data;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get cached asset', error);
      return null;
    }
  }

  async cacheAsset(instanceId: string, asset: SFMCAsset, lastModified?: string): Promise<void> {
    try {
      const cacheKey = `asset:${instanceId}:${asset.type}:${asset.assetId}`;
      const cacheEntry: SFMCCacheEntry<SFMCAsset> = {
        data: asset,
        lastModified: lastModified || asset.lastModified.toISOString(),
        instanceId,
        endpoint: `asset/v1/content/assets/${asset.assetId}`
      };

      // Use different TTL based on asset type
      let ttl = this.DEFAULT_TTL;
      if (asset.type === 'cloudpage') {
        ttl = this.SHORT_TTL; // Cloud pages change frequently
      } else if (asset.type === 'dataextension') {
        ttl = this.LONG_TTL; // Data extensions are more static
      }

      await this.cacheManager.set(cacheKey, cacheEntry, {
        namespace: this.NAMESPACE,
        ttl
      });

      this.logger.info('SFMC asset cached', { instanceId, assetId: asset.assetId, type: asset.type });
    } catch (error) {
      this.logger.error('Failed to cache asset', error);
    }
  }

  async getAuthToken(instanceId: string): Promise<string | null> {
    try {
      const cacheKey = `auth_token:${instanceId}`;
      const cached = await this.cacheManager.get<SFMCCacheEntry<string>>(cacheKey, {
        namespace: this.NAMESPACE
      });

      if (cached) {
        this.logger.debug('SFMC auth token cache hit', { instanceId });
        return cached.data;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get cached auth token', error);
      return null;
    }
  }

  async cacheAuthToken(instanceId: string, token: string, expiresIn: number): Promise<void> {
    try {
      const cacheKey = `auth_token:${instanceId}`;
      const cacheEntry: SFMCCacheEntry<string> = {
        data: token,
        lastModified: new Date().toISOString(),
        instanceId,
        endpoint: 'v2/token'
      };

      // Use token expiry time minus buffer for TTL
      const ttl = Math.max(expiresIn - 300, 60); // 5 minute buffer, minimum 1 minute

      await this.cacheManager.set(cacheKey, cacheEntry, {
        namespace: this.NAMESPACE,
        ttl
      });

      this.logger.info('SFMC auth token cached', { instanceId, expiresIn: ttl });
    } catch (error) {
      this.logger.error('Failed to cache auth token', error);
    }
  }

  async invalidateInstance(instanceId: string): Promise<number> {
    try {
      const pattern = `*:${instanceId}:*`;
      const deletedCount = await this.cacheManager.invalidatePattern(pattern, {
        namespace: this.NAMESPACE
      });
      
      this.logger.info(`Invalidated ${deletedCount} SFMC cache entries for instance: ${instanceId}`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to invalidate instance cache', error);
      return 0;
    }
  }

  async invalidateDataExtensions(instanceId: string): Promise<void> {
    try {
      const cacheKey = `data_extensions:${instanceId}`;
      await this.cacheManager.delete(cacheKey, {
        namespace: this.NAMESPACE
      });
      
      this.logger.info('Invalidated data extensions cache', { instanceId });
    } catch (error) {
      this.logger.error('Failed to invalidate data extensions cache', error);
    }
  }

  async invalidateAsset(instanceId: string, assetId: string, assetType: string): Promise<void> {
    try {
      const cacheKey = `asset:${instanceId}:${assetType}:${assetId}`;
      await this.cacheManager.delete(cacheKey, {
        namespace: this.NAMESPACE
      });
      
      this.logger.info('Invalidated asset cache', { instanceId, assetId, assetType });
    } catch (error) {
      this.logger.error('Failed to invalidate asset cache', error);
    }
  }

  async invalidateAuthToken(instanceId: string): Promise<void> {
    try {
      const cacheKey = `auth_token:${instanceId}`;
      await this.cacheManager.delete(cacheKey, {
        namespace: this.NAMESPACE
      });
      
      this.logger.info('Invalidated auth token cache', { instanceId });
    } catch (error) {
      this.logger.error('Failed to invalidate auth token cache', error);
    }
  }

  async warmupCache(instanceId: string, endpoints: string[]): Promise<void> {
    this.logger.info('Starting SFMC cache warmup', { instanceId, endpoints });
    
    // This would typically trigger background requests to populate the cache
    // For now, we'll just log the intent
    for (const endpoint of endpoints) {
      this.logger.debug('Would warmup cache for endpoint', { instanceId, endpoint });
    }
  }

  async getCacheHealth(): Promise<{
    totalEntries: number;
    hitRate: number;
    memoryUsage: string;
    expiredEntries: number;
  }> {
    try {
      const stats = await this.cacheManager.getStats();
      
      return {
        totalEntries: stats.totalKeys,
        hitRate: stats.hitRate,
        memoryUsage: stats.memoryUsage,
        expiredEntries: 0 // Would need to implement expired entry tracking
      };
    } catch (error) {
      this.logger.error('Failed to get SFMC cache health', error);
      return {
        totalEntries: 0,
        hitRate: 0,
        memoryUsage: 'Unknown',
        expiredEntries: 0
      };
    }
  }

  async cleanup(): Promise<void> {
    await this.cacheManager.cleanup();
  }
}