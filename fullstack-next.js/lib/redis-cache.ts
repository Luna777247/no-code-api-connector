// Redis Cache Manager - Caching layer for API responses and analytics
export interface CacheConfig {
  host?: string
  port?: number
  password?: string
  ttl?: number // Time to live in seconds
  enabled?: boolean
}

export interface CacheEntry<T = any> {
  key: string
  value: T
  expiresAt: number
  metadata?: {
    createdAt: number
    hits: number
    lastAccessedAt: number
  }
}

// In-memory cache fallback when Redis is not available
class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(startCleanup: boolean = true) {
    // Only start cleanup interval if requested (skip in test environments)
    if (startCleanup) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 5 * 60 * 1000)
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    // Update metadata
    if (entry.metadata) {
      entry.metadata.hits++
      entry.metadata.lastAccessedAt = Date.now()
    }

    return entry.value as T
  }

  async set<T = any>(key: string, value: T, ttl: number = 300): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000
    this.cache.set(key, {
      key,
      value,
      expiresAt,
      metadata: {
        createdAt: Date.now(),
        hits: 0,
        lastAccessedAt: Date.now()
      }
    })
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    let deletedCount = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        deletedCount++
      }
    }

    return deletedCount
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key)
    if (!entry) return false
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key)
    if (!entry) return -2 // Key doesn't exist

    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000)
    return remaining > 0 ? remaining : -1 // -1 means expired
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    const matchingKeys: string[] = []

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        const entry = this.cache.get(key)
        // Only return non-expired keys
        if (entry && Date.now() <= entry.expiresAt) {
          matchingKeys.push(key)
        }
      }
    }

    return matchingKeys
  }

  async clear(): Promise<void> {
    this.cache.clear()
  }

  async size(): Promise<number> {
    // Clean up first
    this.cleanup()
    return this.cache.size
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.cache.clear()
  }
}

export class RedisCacheManager {
  private config: CacheConfig
  private inMemoryCache: InMemoryCache
  private redisClient: any = null // TODO: Redis client when available
  private isRedisAvailable: boolean = false

  constructor(config: CacheConfig = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || parseInt(process.env.REDIS_PORT || '6379'),
      password: config.password || process.env.REDIS_PASSWORD,
      ttl: config.ttl || 300, // 5 minutes default
      enabled: config.enabled !== false
    }

    this.inMemoryCache = new InMemoryCache(false) // Disable cleanup interval to avoid Jest open handles
    
    // TODO: Initialize Redis client when available
    // this.initializeRedis()
  }

  // TODO: Initialize Redis connection
  private async initializeRedis(): Promise<void> {
    try {
      // const redis = require('redis')
      // this.redisClient = redis.createClient({
      //   host: this.config.host,
      //   port: this.config.port,
      //   password: this.config.password
      // })
      // await this.redisClient.connect()
      // this.isRedisAvailable = true
      // console.log('[v0] Redis cache connected')
    } catch (error) {
      console.warn('[v0] Redis not available, using in-memory cache:', error)
      this.isRedisAvailable = false
    }
  }

  // Get cached value
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.config.enabled) return null

    try {
      if (this.isRedisAvailable && this.redisClient) {
        const value = await this.redisClient.get(key)
        return value ? JSON.parse(value) : null
      } else {
        return await this.inMemoryCache.get<T>(key)
      }
    } catch (error) {
      console.error('[v0] Cache get error:', error)
      return null
    }
  }

  // Set cached value
  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return

    const cacheTtl = ttl || this.config.ttl || 300

    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.setEx(key, cacheTtl, JSON.stringify(value))
      } else {
        await this.inMemoryCache.set(key, value, cacheTtl)
      }
    } catch (error) {
      console.error('[v0] Cache set error:', error)
    }
  }

  // Delete cached value
  async delete(key: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const result = await this.redisClient.del(key)
        return result > 0
      } else {
        return await this.inMemoryCache.delete(key)
      }
    } catch (error) {
      console.error('[v0] Cache delete error:', error)
      return false
    }
  }

  // Delete by pattern (e.g., "analytics:*")
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const keys = await this.redisClient.keys(pattern)
        if (keys.length > 0) {
          return await this.redisClient.del(keys)
        }
        return 0
      } else {
        return await this.inMemoryCache.deletePattern(pattern)
      }
    } catch (error) {
      console.error('[v0] Cache deletePattern error:', error)
      return 0
    }
  }

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        return (await this.redisClient.exists(key)) > 0
      } else {
        return await this.inMemoryCache.exists(key)
      }
    } catch (error) {
      console.error('[v0] Cache exists error:', error)
      return false
    }
  }

  // Get TTL (time to live) for a key
  async ttl(key: string): Promise<number> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        return await this.redisClient.ttl(key)
      } else {
        return await this.inMemoryCache.ttl(key)
      }
    } catch (error) {
      console.error('[v0] Cache ttl error:', error)
      return -2
    }
  }

  // Get all keys matching pattern
  async keys(pattern: string = '*'): Promise<string[]> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        return await this.redisClient.keys(pattern)
      } else {
        return await this.inMemoryCache.keys(pattern)
      }
    } catch (error) {
      console.error('[v0] Cache keys error:', error)
      return []
    }
  }

  // Clear all cache
  async clear(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.flushDb()
      } else {
        await this.inMemoryCache.clear()
      }
    } catch (error) {
      console.error('[v0] Cache clear error:', error)
    }
  }

  // Get cache statistics
  async stats(): Promise<{
    backend: 'redis' | 'memory'
    enabled: boolean
    keys: number
    config: CacheConfig
  }> {
    try {
      const keys = await this.keys()
      return {
        backend: this.isRedisAvailable ? 'redis' : 'memory',
        enabled: this.config.enabled || false,
        keys: keys.length,
        config: this.config
      }
    } catch (error) {
      console.error('[v0] Cache stats error:', error)
      return {
        backend: 'memory',
        enabled: false,
        keys: 0,
        config: this.config
      }
    }
  }

  // Destroy cache manager
  destroy(): void {
    if (this.redisClient) {
      this.redisClient.quit()
    }
    this.inMemoryCache.destroy()
  }
}

// Singleton instance
const cacheManager = new RedisCacheManager({
  enabled: process.env.CACHE_ENABLED !== 'false',
  ttl: parseInt(process.env.CACHE_TTL || '300')
})

export { cacheManager }

// Helper function for cache-aside pattern
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache
  const cached = await cacheManager.get<T>(key)
  if (cached !== null) {
    console.log(`[v0] Cache hit: ${key}`)
    return cached
  }

  console.log(`[v0] Cache miss: ${key}`)
  
  // Fetch data
  const data = await fetcher()
  
  // Store in cache
  await cacheManager.set(key, data, ttl)
  
  return data
}
