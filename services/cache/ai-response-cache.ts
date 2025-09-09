import { CacheManager, CacheOptions } from './cache-manager';
import { Logger } from '../../utils/logging/logger';
import { CodeGenerationRequest, CodeGenerationResponse } from '../../types/ai';
import crypto from 'crypto';

export interface AIResponseCacheEntry {
  request: CodeGenerationRequest;
  response: CodeGenerationResponse;
  generatedAt: number;
  model: string;
  version: string;
}

export class AIResponseCache {
  private cacheManager: CacheManager;
  private logger: Logger;
  private readonly NAMESPACE = 'ai_responses';
  private readonly DEFAULT_TTL = 24 * 60 * 60; // 24 hours
  private readonly MAX_CACHE_SIZE = 10000; // Maximum number of cached responses

  constructor() {
    this.cacheManager = new CacheManager();
    this.logger = new Logger('AIResponseCache');
  }

  async getCachedResponse(request: CodeGenerationRequest): Promise<CodeGenerationResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.cacheManager.get<AIResponseCacheEntry>(cacheKey, {
        namespace: this.NAMESPACE
      });

      if (!cached) {
        this.logger.debug('AI response cache miss', { cacheKey });
        return null;
      }

      // Validate that the cached request matches the current request
      if (!this.requestsMatch(request, cached.request)) {
        this.logger.debug('AI response cache key collision, requests do not match');
        return null;
      }

      this.logger.info('AI response cache hit', { cacheKey });
      return cached.response;
    } catch (error) {
      this.logger.error('Failed to get cached AI response', error);
      return null;
    }
  }

  async cacheResponse(request: CodeGenerationRequest, response: CodeGenerationResponse, model: string = 'gpt-4'): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      
      const cacheEntry: AIResponseCacheEntry = {
        request: this.sanitizeRequest(request),
        response,
        generatedAt: Date.now(),
        model,
        version: '1.0'
      };

      const options: CacheOptions = {
        namespace: this.NAMESPACE,
        ttl: this.calculateTTL(request, response)
      };

      await this.cacheManager.set(cacheKey, cacheEntry, options);
      this.logger.info('AI response cached', { cacheKey, model });

      // Cleanup old entries if cache is getting too large
      await this.cleanupOldEntries();
    } catch (error) {
      this.logger.error('Failed to cache AI response', error);
    }
  }

  async invalidateByPattern(pattern: string): Promise<number> {
    try {
      const deletedCount = await this.cacheManager.invalidatePattern(pattern, {
        namespace: this.NAMESPACE
      });
      this.logger.info(`Invalidated ${deletedCount} AI response cache entries`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to invalidate AI response cache', error);
      return 0;
    }
  }

  async invalidateByLanguage(language: string): Promise<number> {
    return await this.invalidateByPattern(`*:${language}:*`);
  }

  async invalidateByUser(userId: string): Promise<number> {
    return await this.invalidateByPattern(`*:user:${userId}:*`);
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    hitRate: number;
    memoryUsage: string;
    oldestEntry: number;
    newestEntry: number;
  }> {
    try {
      const stats = await this.cacheManager.getStats();
      
      // Additional AI-specific stats would require tracking hits/misses
      return {
        totalEntries: stats.totalKeys,
        hitRate: stats.hitRate,
        memoryUsage: stats.memoryUsage,
        oldestEntry: 0, // Would need to track this
        newestEntry: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to get AI cache stats', error);
      return {
        totalEntries: 0,
        hitRate: 0,
        memoryUsage: 'Unknown',
        oldestEntry: 0,
        newestEntry: 0
      };
    }
  }

  private generateCacheKey(request: CodeGenerationRequest): string {
    // Create a deterministic cache key based on request content
    const keyData = {
      prompt: request.prompt.trim().toLowerCase(),
      language: request.language || 'auto',
      context: request.context ? JSON.stringify(request.context) : null,
      // Don't include conversation history in cache key as it makes caching less effective
      // conversationHistory: request.conversationHistory?.slice(-3) // Only last 3 messages
    };

    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    
    return `${request.language || 'auto'}:${hash.substring(0, 16)}`;
  }

  private requestsMatch(request1: CodeGenerationRequest, request2: CodeGenerationRequest): boolean {
    return (
      request1.prompt.trim().toLowerCase() === request2.prompt.trim().toLowerCase() &&
      (request1.language || 'auto') === (request2.language || 'auto') &&
      JSON.stringify(request1.context || {}) === JSON.stringify(request2.context || {})
    );
  }

  private sanitizeRequest(request: CodeGenerationRequest): CodeGenerationRequest {
    // Remove sensitive or unnecessary data before caching
    return {
      prompt: request.prompt,
      language: request.language,
      context: request.context,
      // Don't cache conversation history or images for privacy
      conversationHistory: [],
      image: undefined
    };
  }

  private calculateTTL(request: CodeGenerationRequest, response: CodeGenerationResponse): number {
    // Adjust TTL based on request/response characteristics
    let ttl = this.DEFAULT_TTL;

    // Longer TTL for simple, generic requests
    if (request.prompt.length < 100) {
      ttl *= 2;
    }

    // Shorter TTL for complex, specific requests
    if (request.prompt.length > 500 || request.conversationHistory.length > 10) {
      ttl /= 2;
    }

    // Shorter TTL for responses with errors or warnings
    if (response.response.includes('error') || response.response.includes('warning')) {
      ttl /= 4;
    }

    return Math.max(ttl, 60 * 60); // Minimum 1 hour
  }

  private async cleanupOldEntries(): Promise<void> {
    try {
      const stats = await this.getCacheStats();
      
      if (stats.totalEntries > this.MAX_CACHE_SIZE) {
        // In a real implementation, you'd want to implement LRU eviction
        // For now, we'll just log that cleanup is needed
        this.logger.warn(`AI response cache size (${stats.totalEntries}) exceeds maximum (${this.MAX_CACHE_SIZE})`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old cache entries', error);
    }
  }

  async cleanup(): Promise<void> {
    await this.cacheManager.cleanup();
  }
}