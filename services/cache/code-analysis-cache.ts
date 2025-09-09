import { CacheManager, CacheOptions } from './cache-manager';
import { Logger } from '../../utils/logging/logger';
import { CodeAnalysisResult, DebugRequest, DebugResponse } from '../../types/debugging';
import crypto from 'crypto';

export interface CodeAnalysisCacheEntry {
  request: DebugRequest;
  result: CodeAnalysisResult;
  analyzedAt: number;
  version: string;
  analysisLevel: string;
}

export class CodeAnalysisCache {
  private cacheManager: CacheManager;
  private logger: Logger;
  private readonly NAMESPACE = 'code_analysis';
  private readonly DEFAULT_TTL = 60 * 60; // 1 hour
  private readonly LONG_TTL = 24 * 60 * 60; // 24 hours for static analysis
  private readonly SHORT_TTL = 15 * 60; // 15 minutes for performance analysis

  constructor() {
    this.cacheManager = new CacheManager();
    this.logger = new Logger('CodeAnalysisCache');
  }

  async getCachedAnalysis(request: DebugRequest): Promise<CodeAnalysisResult | null> {
    try {
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.cacheManager.get<CodeAnalysisCacheEntry>(cacheKey, {
        namespace: this.NAMESPACE
      });

      if (!cached) {
        this.logger.debug('Code analysis cache miss', { cacheKey });
        return null;
      }

      // Validate that the cached request matches the current request
      if (!this.requestsMatch(request, cached.request)) {
        this.logger.debug('Code analysis cache key collision, requests do not match');
        return null;
      }

      this.logger.info('Code analysis cache hit', { cacheKey, language: request.language });
      return cached.result;
    } catch (error) {
      this.logger.error('Failed to get cached code analysis', error);
      return null;
    }
  }

  async cacheAnalysis(request: DebugRequest, result: CodeAnalysisResult): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(request);
      
      const cacheEntry: CodeAnalysisCacheEntry = {
        request: this.sanitizeRequest(request),
        result,
        analyzedAt: Date.now(),
        version: '1.0',
        analysisLevel: request.analysisLevel
      };

      const options: CacheOptions = {
        namespace: this.NAMESPACE,
        ttl: this.calculateTTL(request, result)
      };

      await this.cacheManager.set(cacheKey, cacheEntry, options);
      this.logger.info('Code analysis cached', { 
        cacheKey, 
        language: request.language, 
        analysisLevel: request.analysisLevel 
      });
    } catch (error) {
      this.logger.error('Failed to cache code analysis', error);
    }
  }

  async getCachedDebugResponse(request: DebugRequest): Promise<DebugResponse | null> {
    try {
      const cacheKey = this.generateDebugCacheKey(request);
      const cached = await this.cacheManager.get<DebugResponse>(cacheKey, {
        namespace: `${this.NAMESPACE}_debug`
      });

      if (cached) {
        this.logger.info('Debug response cache hit', { cacheKey });
        return cached;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to get cached debug response', error);
      return null;
    }
  }

  async cacheDebugResponse(request: DebugRequest, response: DebugResponse): Promise<void> {
    try {
      const cacheKey = this.generateDebugCacheKey(request);
      
      const options: CacheOptions = {
        namespace: `${this.NAMESPACE}_debug`,
        ttl: this.calculateDebugTTL(request, response)
      };

      await this.cacheManager.set(cacheKey, response, options);
      this.logger.info('Debug response cached', { 
        cacheKey, 
        language: request.language,
        hasErrors: response.errors.length > 0
      });
    } catch (error) {
      this.logger.error('Failed to cache debug response', error);
    }
  }

  async invalidateByLanguage(language: string): Promise<number> {
    try {
      const pattern = `${language}:*`;
      const deletedCount = await this.cacheManager.invalidatePattern(pattern, {
        namespace: this.NAMESPACE
      });
      
      this.logger.info(`Invalidated ${deletedCount} code analysis cache entries for language: ${language}`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to invalidate language cache', error);
      return 0;
    }
  }

  async invalidateByAnalysisLevel(analysisLevel: string): Promise<number> {
    try {
      const pattern = `*:${analysisLevel}:*`;
      const deletedCount = await this.cacheManager.invalidatePattern(pattern, {
        namespace: this.NAMESPACE
      });
      
      this.logger.info(`Invalidated ${deletedCount} code analysis cache entries for analysis level: ${analysisLevel}`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to invalidate analysis level cache', error);
      return 0;
    }
  }

  async getAnalysisStats(): Promise<{
    totalAnalyses: number;
    byLanguage: Record<string, number>;
    byAnalysisLevel: Record<string, number>;
    averageAnalysisTime: number;
    cacheHitRate: number;
  }> {
    try {
      const stats = await this.cacheManager.getStats();
      
      // In a real implementation, you'd track these metrics
      return {
        totalAnalyses: stats.totalKeys,
        byLanguage: {
          'sql': 0,
          'ampscript': 0,
          'ssjs': 0,
          'css': 0,
          'html': 0
        },
        byAnalysisLevel: {
          'syntax': 0,
          'performance': 0,
          'security': 0,
          'all': 0
        },
        averageAnalysisTime: 0,
        cacheHitRate: stats.hitRate
      };
    } catch (error) {
      this.logger.error('Failed to get analysis stats', error);
      return {
        totalAnalyses: 0,
        byLanguage: {},
        byAnalysisLevel: {},
        averageAnalysisTime: 0,
        cacheHitRate: 0
      };
    }
  }

  private generateCacheKey(request: DebugRequest): string {
    // Create a deterministic cache key based on code content and analysis parameters
    const keyData = {
      code: request.code.trim(),
      language: request.language,
      analysisLevel: request.analysisLevel
    };

    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    
    return `${request.language}:${request.analysisLevel}:${hash.substring(0, 16)}`;
  }

  private generateDebugCacheKey(request: DebugRequest): string {
    // Similar to analysis cache key but for debug responses
    const keyData = {
      code: request.code.trim(),
      language: request.language,
      analysisLevel: request.analysisLevel
    };

    const keyString = JSON.stringify(keyData);
    const hash = crypto.createHash('sha256').update(keyString).digest('hex');
    
    return `debug:${request.language}:${hash.substring(0, 16)}`;
  }

  private requestsMatch(request1: DebugRequest, request2: DebugRequest): boolean {
    return (
      request1.code.trim() === request2.code.trim() &&
      request1.language === request2.language &&
      request1.analysisLevel === request2.analysisLevel
    );
  }

  private sanitizeRequest(request: DebugRequest): DebugRequest {
    // Remove sensitive data before caching
    return {
      code: request.code,
      language: request.language,
      analysisLevel: request.analysisLevel,
      // Don't cache conversation history for privacy
      conversationHistory: []
    };
  }

  private calculateTTL(request: DebugRequest, result: CodeAnalysisResult): number {
    let ttl = this.DEFAULT_TTL;

    // Longer TTL for syntax analysis (code structure doesn't change often)
    if (request.analysisLevel === 'syntax') {
      ttl = this.LONG_TTL;
    }

    // Shorter TTL for performance analysis (may depend on current system state)
    if (request.analysisLevel === 'performance') {
      ttl = this.SHORT_TTL;
    }

    // Shorter TTL if analysis found errors (code might be fixed soon)
    if (result.analysis.syntaxErrors.length > 0 || result.analysis.semanticIssues.length > 0) {
      ttl /= 2;
    }

    // Longer TTL for clean code
    if (result.analysis.syntaxErrors.length === 0 && 
        result.analysis.semanticIssues.length === 0 && 
        result.analysis.performanceIssues.length === 0) {
      ttl *= 2;
    }

    return Math.max(ttl, 5 * 60); // Minimum 5 minutes
  }

  private calculateDebugTTL(request: DebugRequest, response: DebugResponse): number {
    let ttl = this.DEFAULT_TTL;

    // Shorter TTL for responses with errors
    if (response.errors.length > 0) {
      ttl /= 2;
    }

    // Longer TTL for comprehensive analysis
    if (request.analysisLevel === 'all') {
      ttl *= 1.5;
    }

    return Math.max(ttl, 10 * 60); // Minimum 10 minutes
  }

  async cleanup(): Promise<void> {
    await this.cacheManager.cleanup();
  }
}