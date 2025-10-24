// Unified Cache Manager - Consolidates analytics and Redis caching
import Redis from "ioredis"

export interface CacheConfig {
  host?: string
  port?: number
  password?: string
  ttl?: number
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

// In-memory cache fallback
class InMemoryCache {
  private cache: Map<string, CacheEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(startCleanup = true) {
    if (startCleanup) {
      this.cleanupInterval = setInterval(
        () => {
          this.cleanup()
        },
        5 * 60 * 1000,
      )
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    if (entry.metadata) {
      entry.metadata.hits++
      entry.metadata.lastAccessedAt = Date.now()
    }

    return entry.value as T
  }

  async set<T = any>(key: string, value: T, ttl = 300): Promise<void> {
    const expiresAt = Date.now() + ttl * 1000
    this.cache.set(key, {
      key,
      value,
      expiresAt,
      metadata: {
        createdAt: Date.now(),
        hits: 0,
        lastAccessedAt: Date.now(),
      },
    })
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key)
  }

  async deletePattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"))
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

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  async ttl(key: string): Promise<number> {
    const entry = this.cache.get(key)
    if (!entry) return -2

    const remaining = Math.floor((entry.expiresAt - Date.now()) / 1000)
    return remaining > 0 ? remaining : -1
  }

  async keys(pattern = "*"): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"))
    const matchingKeys: string[] = []

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        const entry = this.cache.get(key)
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

export class CacheManager {
  private config: CacheConfig
  private inMemoryCache: InMemoryCache
  private redisClient: any = null
  private isRedisAvailable = false

  constructor(config: CacheConfig = {}) {
    this.config = {
      host: config.host || process.env.REDIS_HOST || "localhost",
      port: config.port || Number.parseInt(process.env.REDIS_PORT || "6379"),
      password: config.password || process.env.REDIS_PASSWORD,
      ttl: config.ttl || 300,
      enabled: config.enabled !== false,
    }

    this.inMemoryCache = new InMemoryCache(false)

    if (process.env.REDIS_URL || process.env.NODE_ENV === "production") {
      try {
        this.redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6380")
        this.isRedisAvailable = true
      } catch (error) {
        this.isRedisAvailable = false
      }
    }
  }

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
      return null
    }
  }

  async set<T = any>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled) return

    const cacheTtl = ttl || this.config.ttl || 300

    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.setex(key, cacheTtl, JSON.stringify(value))
      } else {
        await this.inMemoryCache.set(key, value, cacheTtl)
      }
    } catch (error) {
      // Silently fail
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const result = await this.redisClient.del(key)
        return result > 0
      } else {
        return await this.inMemoryCache.delete(key)
      }
    } catch (error) {
      return false
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        const keys = await this.redisClient.keys(pattern)
        if (keys.length > 0) {
          return await this.redisClient.del(...keys)
        }
        return 0
      } else {
        return await this.inMemoryCache.deletePattern(pattern)
      }
    } catch (error) {
      return 0
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        return (await this.redisClient.exists(key)) > 0
      } else {
        return await this.inMemoryCache.exists(key)
      }
    } catch (error) {
      return false
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        return await this.redisClient.ttl(key)
      } else {
        return await this.inMemoryCache.ttl(key)
      }
    } catch (error) {
      return -2
    }
  }

  async keys(pattern = "*"): Promise<string[]> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        return await this.redisClient.keys(pattern)
      } else {
        return await this.inMemoryCache.keys(pattern)
      }
    } catch (error) {
      return []
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redisClient) {
        await this.redisClient.flushdb()
      } else {
        await this.inMemoryCache.clear()
      }
    } catch (error) {
      // Silently fail
    }
  }

  destroy(): void {
    if (this.redisClient) {
      this.redisClient.quit()
    }
    this.inMemoryCache.destroy()
  }
}

// Singleton instance
const cacheManager = new CacheManager({
  enabled: process.env.CACHE_ENABLED !== "false",
  ttl: Number.parseInt(process.env.CACHE_TTL || "300"),
})

export { cacheManager }

// Cache keys for analytics
export const CacheKeys = {
  RUNS_SUMMARY: "runs:summary",
  RUNS_BY_CONNECTION: (connectionId: string) => `runs:connection:${connectionId}`,
  CONNECTIONS_HEALTH: "connections:health",
  CONNECTIONS_PERFORMANCE: "connections:performance",
  SCHEDULES_STATUS: "schedules:status",
  SCHEDULES_PERFORMANCE: "schedules:performance",
  SYSTEM_METRICS: "system:metrics",
  SYSTEM_STATUS: "system:status",
  SUCCESS_RATE_HISTORY: "success_rate:history",
} as const

// TTL values for different data types
export const CacheTTL = {
  REAL_TIME: 60,
  FREQUENT: 300,
  STANDARD: 900,
  SLOW_CHANGING: 3600,
} as const

// Cache-aside pattern helper
export async function cacheAside<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
  const cached = await cacheManager.get<T>(key)
  if (cached !== null) {
    return cached
  }

  const data = await fetcher()
  await cacheManager.set(key, data, ttl)

  return data
}
