/**
 * Analytics Caching Helper
 * Provides Redis-based caching for analytics API endpoints to improve Metabase performance
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string; // Cache key prefix
}

// Mock Redis implementation for development (fallback when Redis is not available)
class MockRedis {
  private cache = new Map<string, { data: string; expires: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  async setex(key: string, ttl: number, value: string): Promise<void> {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + (ttl * 1000)
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

// Initialize Redis client (real Redis for production, MockRedis for development)
let redis: any;

try {
  if (process.env.REDIS_URL || process.env.NODE_ENV === 'production') {
    // Use real Redis in production or when REDIS_URL is available
    const Redis = require('ioredis');
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');
    console.log('[v0] Connected to Redis for analytics caching');
  } else {
    // Use MockRedis in development
    redis = new MockRedis();
    console.log('[v0] Using MockRedis for analytics caching (development mode)');
  }
} catch (error) {
  console.warn('[v0] Redis connection failed, falling back to MockRedis:', error);
  redis = new MockRedis();
}

/**
 * Get cached analytics data or fetch fresh data if cache miss
 */
export async function getCachedAnalytics<T>(
  key: string, 
  dataFetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 300, prefix = 'analytics:' } = options;
  const cacheKey = `${prefix}${key}`;

  try {
    // Try to get from cache
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      console.log(`[v0] Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    console.log(`[v0] Cache miss for ${cacheKey}, fetching fresh data`);
    
    // Fetch fresh data
    const data = await dataFetcher();
    
    // Store in cache
    await redis.setex(cacheKey, ttl, JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error(`[v0] Cache error for ${cacheKey}:`, error);
    // Fallback to direct data fetch
    return dataFetcher();
  }
}

/**
 * Invalidate cache for a specific pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    console.log(`[v0] Invalidating cache pattern: ${pattern}`);
    // In a real Redis implementation, you would use SCAN with pattern matching
    // For now, this is a placeholder
    await redis.del(pattern);
  } catch (error) {
    console.error(`[v0] Cache invalidation error:`, error);
  }
}

/**
 * Cache keys for different analytics endpoints
 */
export const CacheKeys = {
  RUNS_SUMMARY: 'runs:summary',
  RUNS_BY_CONNECTION: (connectionId: string) => `runs:connection:${connectionId}`,
  CONNECTIONS_HEALTH: 'connections:health',
  CONNECTIONS_PERFORMANCE: 'connections:performance',
  SCHEDULES_STATUS: 'schedules:status',
  SCHEDULES_PERFORMANCE: 'schedules:performance',
  SYSTEM_METRICS: 'system:metrics'
} as const;

/**
 * TTL values for different types of data
 */
export const CacheTTL = {
  REAL_TIME: 60,      // 1 minute - for live dashboards
  FREQUENT: 300,      // 5 minutes - for frequently accessed data  
  STANDARD: 900,      // 15 minutes - for standard analytics
  SLOW_CHANGING: 3600 // 1 hour - for configuration data
} as const;