import { NextRequest, NextResponse } from 'next/server';
import { CacheManager, AIResponseCache, SFMCDataCache, CodeAnalysisCache } from '../../../services/cache';
import { withSession } from '../../../middleware/session-middleware';
import { UserSession } from '../../../types/session';

const cacheManager = new CacheManager();
const aiCache = new AIResponseCache();
const sfmcCache = new SFMCDataCache();
const codeAnalysisCache = new CodeAnalysisCache();

// GET /api/cache - Get cache statistics
export const GET = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';

    let stats: any = {};

    if (type === 'all' || type === 'general') {
      stats.general = await cacheManager.getStats();
    }

    if (type === 'all' || type === 'ai') {
      stats.ai = await aiCache.getCacheStats();
    }

    if (type === 'all' || type === 'sfmc') {
      stats.sfmc = await sfmcCache.getCacheHealth();
    }

    if (type === 'all' || type === 'analysis') {
      stats.analysis = await codeAnalysisCache.getAnalysisStats();
    }

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get cache statistics' },
      { status: 500 }
    );
  }
});

// DELETE /api/cache - Clear cache
export const DELETE = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const body = await request.json();
    const { type, pattern, instanceId, language, analysisLevel } = body;

    let deletedCount = 0;

    switch (type) {
      case 'ai':
        if (language) {
          deletedCount = await aiCache.invalidateByLanguage(language);
        } else if (session.userId) {
          deletedCount = await aiCache.invalidateByUser(session.userId);
        } else if (pattern) {
          deletedCount = await aiCache.invalidateByPattern(pattern);
        }
        break;

      case 'sfmc':
        if (instanceId) {
          deletedCount = await sfmcCache.invalidateInstance(instanceId);
        }
        break;

      case 'analysis':
        if (language) {
          deletedCount = await codeAnalysisCache.invalidateByLanguage(language);
        } else if (analysisLevel) {
          deletedCount = await codeAnalysisCache.invalidateByAnalysisLevel(analysisLevel);
        }
        break;

      case 'all':
        // Clear all cache types - use with caution
        const aiDeleted = await aiCache.invalidateByPattern('*');
        const sfmcDeleted = await sfmcCache.invalidateInstance('*');
        const analysisDeleted = await codeAnalysisCache.invalidateByLanguage('*');
        deletedCount = aiDeleted + sfmcDeleted + analysisDeleted;
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid cache type specified' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        deletedCount,
        type,
        message: `Cleared ${deletedCount} cache entries`
      }
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
});

// POST /api/cache/warmup - Warmup cache
export const POST = withSession(async (request: NextRequest, session: UserSession) => {
  try {
    const body = await request.json();
    const { type, instanceId, endpoints } = body;

    switch (type) {
      case 'sfmc':
        if (!instanceId) {
          return NextResponse.json(
            { success: false, error: 'instanceId is required for SFMC cache warmup' },
            { status: 400 }
          );
        }
        
        const warmupEndpoints = endpoints || [
          'data/v1/customobjectdata/key',
          'asset/v1/content/assets',
          'platform/v1/tokenContext'
        ];
        
        await sfmcCache.warmupCache(instanceId, warmupEndpoints);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid warmup type specified' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        type,
        message: 'Cache warmup initiated'
      }
    });
  } catch (error) {
    console.error('Failed to warmup cache:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to warmup cache' },
      { status: 500 }
    );
  }
});