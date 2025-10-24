interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class FetchCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private pendingRequests = new Map<string, Promise<unknown>>()

  /**
   * Fetch with automatic caching and request deduplication
   * @param url - The URL to fetch
   * @param options - Fetch options and cache settings
   * @returns Cached or fresh data
   */
  async fetch<T>(
    url: string,
    options: {
      method?: string
      body?: string
      headers?: Record<string, string>
      cacheTTL?: number // Time to live in milliseconds (default: 5 minutes)
      skipCache?: boolean
    } = {},
  ): Promise<T> {
    const { method = "GET", cacheTTL = 5 * 60 * 1000, skipCache = false } = options

    const cacheKey = `${method}:${url}`

    // Check if data is in cache and still valid
    if (!skipCache && method === "GET") {
      const cached = this.cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data as T
      }
    }

    // Check if request is already pending (deduplication)
    if (method === "GET" && this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey) as Promise<T>
    }

    // Create new request
    const requestPromise = this.executeRequest<T>(url, options)

    // Store pending request for deduplication
    if (method === "GET") {
      this.pendingRequests.set(cacheKey, requestPromise)
    }

    try {
      const data = await requestPromise

      // Cache successful GET requests
      if (method === "GET") {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: cacheTTL,
        })
      }

      return data
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey)
    }
  }

  private async executeRequest<T>(
    url: string,
    options: {
      method?: string
      body?: string
      headers?: Record<string, string>
    },
  ): Promise<T> {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...(options.body && { body: options.body }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json() as Promise<T>
  }

  /**
   * Clear cache for a specific URL or all cache
   */
  clearCache(url?: string): void {
    if (url) {
      this.cache.delete(`GET:${url}`)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
    }
  }
}

// Export singleton instance
export const fetchCache = new FetchCache()

/**
 * Optimized fetch wrapper with error handling
 */
export async function fetchWithErrorHandling<T>(
  url: string,
  options: {
    method?: string
    body?: string
    headers?: Record<string, string>
    cacheTTL?: number
    skipCache?: boolean
    timeout?: number
  } = {},
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { timeout = 30000, ...fetchOptions } = options

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      method: fetchOptions.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      ...(fetchOptions.body && { body: fetchOptions.body }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = (await response.json()) as T
    return { data, error: null }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    return { data: null, error: err }
  }
}
