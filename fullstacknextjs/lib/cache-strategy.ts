/**
 * Cache configuration for different endpoints
 * Defines TTL and cache behavior per endpoint
 */
export const CACHE_CONFIG = {
  // Data endpoints
  DATA: {
    ttl: 2 * 60 * 1000, // 2 minutes
    description: "Data explorer results",
  },
  RUNS: {
    ttl: 3 * 60 * 1000, // 3 minutes
    description: "Run history and details",
  },
  SCHEDULES: {
    ttl: 3 * 60 * 1000, // 3 minutes
    description: "Schedule configurations",
  },
  CONNECTIONS: {
    ttl: 5 * 60 * 1000, // 5 minutes
    description: "Connection configurations",
  },
  MAPPINGS: {
    ttl: 5 * 60 * 1000, // 5 minutes
    description: "Field mappings",
  },

  // Analytics endpoints
  ANALYTICS_RUNS: {
    ttl: 1 * 60 * 1000, // 1 minute
    description: "Run analytics",
  },
  ANALYTICS_SUCCESS_RATE: {
    ttl: 5 * 60 * 1000, // 5 minutes
    description: "Success rate history",
  },
  ANALYTICS_CONNECTIONS: {
    ttl: 5 * 60 * 1000, // 5 minutes
    description: "Connection metrics",
  },

  // System endpoints
  HEALTH: {
    ttl: 30 * 1000, // 30 seconds
    description: "System health status",
  },
  STATUS: {
    ttl: 1 * 60 * 1000, // 1 minute
    description: "System status",
  },
  CONFIG: {
    ttl: 10 * 60 * 1000, // 10 minutes
    description: "System configuration",
  },
} as const

/**
 * Storage optimization strategies
 */
export const STORAGE_OPTIMIZATION = {
  // Limit data returned from APIs
  MAX_RECORDS_PER_PAGE: 50,
  MAX_PREVIEW_RECORDS: 5,
  MAX_DETAILED_RECORDS: 10,

  // Compression settings
  ENABLE_GZIP: true,
  ENABLE_BROTLI: true,

  // Database query optimization
  USE_PROJECTIONS: true, // Only fetch needed fields
  USE_INDEXES: true, // Ensure indexes are used
  BATCH_SIZE: 100, // Batch operations

  // Memory management
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes
} as const

/**
 * Get cache TTL for an endpoint
 */
export function getCacheTTL(endpoint: keyof typeof CACHE_CONFIG): number {
  return CACHE_CONFIG[endpoint].ttl
}

/**
 * Get cache description for monitoring
 */
export function getCacheDescription(endpoint: keyof typeof CACHE_CONFIG): string {
  return CACHE_CONFIG[endpoint].description
}

/**
 * Calculate optimal cache size based on data
 */
export function calculateCacheSize(data: unknown): number {
  return JSON.stringify(data).length
}

/**
 * Check if cache size exceeds limit
 */
export function shouldEvictCache(currentSize: number): boolean {
  return currentSize > STORAGE_OPTIMIZATION.MAX_CACHE_SIZE
}

/**
 * Get cache statistics
 */
export interface CacheStats {
  totalSize: number
  itemCount: number
  hitRate: number
  missRate: number
  avgResponseTime: number
}

/**
 * Cache invalidation patterns
 */
export const CACHE_INVALIDATION = {
  // Invalidate on mutations
  ON_CREATE: ["CONNECTIONS", "SCHEDULES", "MAPPINGS"],
  ON_UPDATE: ["CONNECTIONS", "SCHEDULES", "MAPPINGS", "DATA"],
  ON_DELETE: ["CONNECTIONS", "SCHEDULES", "MAPPINGS", "DATA", "RUNS"],

  // Invalidate related caches
  RELATED_CACHES: {
    CONNECTIONS: ["RUNS", "SCHEDULES", "MAPPINGS", "DATA"],
    SCHEDULES: ["RUNS", "ANALYTICS_RUNS"],
    RUNS: ["DATA", "ANALYTICS_RUNS", "ANALYTICS_SUCCESS_RATE"],
  },
} as const

/**
 * Get related caches to invalidate
 */
export function getRelatedCaches(endpoint: keyof typeof CACHE_INVALIDATION.RELATED_CACHES): string[] {
  return CACHE_INVALIDATION.RELATED_CACHES[endpoint] || []
}
