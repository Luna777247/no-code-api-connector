import { describe, it, expect, beforeEach, vi } from "vitest"
import { ApiExecutor, type ApiRequest } from "@/lib/api-executor"

describe("ApiExecutor Integration Tests", () => {
  let executor: ApiExecutor

  beforeEach(() => {
    executor = new ApiExecutor(3, 100)
    vi.clearAllMocks()
  })

  describe("execute", () => {
    it("should successfully execute a GET request", async () => {
      const request: ApiRequest = {
        url: "https://api.example.com/data",
        method: "GET",
        headers: { Authorization: "Bearer token" },
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: () => Promise.resolve({ id: 1, name: "Test" }),
          text: () => Promise.resolve(""),
        } as Response),
      )

      const result = await executor.execute(request)

      expect(result.success).toBe(true)
      expect(result.statusCode).toBe(200)
      expect(result.data).toEqual({ id: 1, name: "Test" })
      expect(result.responseTime).toBeGreaterThan(0)
    })

    it("should handle query parameters", async () => {
      const request: ApiRequest = {
        url: "https://api.example.com/data",
        method: "GET",
        params: { limit: "10", offset: "0" },
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: () => Promise.resolve([]),
          text: () => Promise.resolve(""),
        } as Response),
      )

      const result = await executor.execute(request)

      expect(result.success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("limit=10"), expect.any(Object))
    })

    it("should retry on 429 (rate limit) errors", async () => {
      const request: ApiRequest = {
        url: "https://api.example.com/data",
        method: "GET",
      }

      let callCount = 0
      global.fetch = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 429,
            statusText: "Too Many Requests",
            headers: new Map([["retry-after", "1"]]),
            text: () => Promise.resolve("Rate limited"),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: () => Promise.resolve({ success: true }),
          text: () => Promise.resolve(""),
        } as Response)
      })

      const result = await executor.execute(request)

      expect(result.success).toBe(true)
      expect(callCount).toBeGreaterThan(1)
    })

    it("should not retry on 4xx client errors (except 429)", async () => {
      const request: ApiRequest = {
        url: "https://api.example.com/data",
        method: "GET",
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          headers: new Map(),
          text: () => Promise.resolve("Invalid request"),
        } as Response),
      )

      const result = await executor.execute(request)

      expect(result.success).toBe(false)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it("should detect binary responses", async () => {
      const request: ApiRequest = {
        url: "https://api.example.com/image.png",
        method: "GET",
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "image/png"]]),
          json: () => Promise.reject(new Error("Not JSON")),
          text: () => Promise.resolve(""),
        } as Response),
      )

      const result = await executor.execute(request)

      expect(result.success).toBe(true)
      expect(result.isBinary).toBe(true)
      expect(result.metadata).toBeDefined()
    })
  })

  describe("executeBatch", () => {
    it("should execute multiple requests in parallel", async () => {
      const requests: ApiRequest[] = [
        { url: "https://api.example.com/data1", method: "GET" },
        { url: "https://api.example.com/data2", method: "GET" },
        { url: "https://api.example.com/data3", method: "GET" },
      ]

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: () => Promise.resolve({ id: 1 }),
          text: () => Promise.resolve(""),
        } as Response),
      )

      const results = await executor.executeBatch(requests)

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.success)).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(3)
    })
  })
})
