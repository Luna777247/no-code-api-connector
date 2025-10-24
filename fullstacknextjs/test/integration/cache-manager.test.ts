import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { CacheManager, cacheAside } from "@/lib/cache-manager"

describe("CacheManager Integration Tests", () => {
  let cacheManager: CacheManager

  beforeEach(() => {
    cacheManager = new CacheManager({ enabled: true, ttl: 300 })
  })

  afterEach(async () => {
    await cacheManager.clear()
  })

  describe("set and get", () => {
    it("should store and retrieve values", async () => {
      const key = "test:key"
      const value = { id: 1, name: "Test" }

      await cacheManager.set(key, value)
      const retrieved = await cacheManager.get(key)

      expect(retrieved).toEqual(value)
    })

    it("should return null for non-existent keys", async () => {
      const retrieved = await cacheManager.get("non:existent")
      expect(retrieved).toBeNull()
    })

    it("should respect TTL", async () => {
      const key = "test:ttl"
      const value = { data: "test" }

      await cacheManager.set(key, value, 1) // 1 second TTL

      // Should exist immediately
      let retrieved = await cacheManager.get(key)
      expect(retrieved).toEqual(value)

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100))

      // Should be expired
      retrieved = await cacheManager.get(key)
      expect(retrieved).toBeNull()
    })
  })

  describe("delete", () => {
    it("should delete cached values", async () => {
      const key = "test:delete"
      await cacheManager.set(key, { data: "test" })

      let exists = await cacheManager.exists(key)
      expect(exists).toBe(true)

      await cacheManager.delete(key)

      exists = await cacheManager.exists(key)
      expect(exists).toBe(false)
    })
  })

  describe("deletePattern", () => {
    it("should delete values matching a pattern", async () => {
      await cacheManager.set("analytics:runs", { count: 10 })
      await cacheManager.set("analytics:connections", { count: 5 })
      await cacheManager.set("other:data", { count: 1 })

      const deleted = await cacheManager.deletePattern("analytics:*")

      expect(deleted).toBeGreaterThan(0)
      expect(await cacheManager.get("analytics:runs")).toBeNull()
      expect(await cacheManager.get("other:data")).not.toBeNull()
    })
  })

  describe("cacheAside", () => {
    it("should use cache-aside pattern", async () => {
      let fetchCount = 0
      const fetcher = async () => {
        fetchCount++
        return { id: 1, name: "Test" }
      }

      // First call should fetch
      const result1 = await cacheAside("test:aside", fetcher)
      expect(result1).toEqual({ id: 1, name: "Test" })
      expect(fetchCount).toBe(1)

      // Second call should use cache
      const result2 = await cacheAside("test:aside", fetcher)
      expect(result2).toEqual({ id: 1, name: "Test" })
      expect(fetchCount).toBe(1) // Should not increment
    })
  })

  describe("keys", () => {
    it("should retrieve keys matching a pattern", async () => {
      await cacheManager.set("user:1", { id: 1 })
      await cacheManager.set("user:2", { id: 2 })
      await cacheManager.set("post:1", { id: 1 })

      const userKeys = await cacheManager.keys("user:*")

      expect(userKeys).toContain("user:1")
      expect(userKeys).toContain("user:2")
      expect(userKeys).not.toContain("post:1")
    })
  })
})
