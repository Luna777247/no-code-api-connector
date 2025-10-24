import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { WorkflowOrchestrator, type WorkflowConfig } from "@/lib/workflow-orchestrator"
import { cacheManager } from "@/lib/cache-manager"

describe("WorkflowOrchestrator Integration Tests", () => {
  let orchestrator: WorkflowOrchestrator

  beforeEach(() => {
    orchestrator = new WorkflowOrchestrator()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await cacheManager.clear()
  })

  describe("executeWorkflow", () => {
    it("should execute a simple workflow with JSON response", async () => {
      const config: WorkflowConfig = {
        connectionId: "test-conn-1",
        apiConfig: {
          baseUrl: "https://api.example.com/data",
          method: "GET",
          headers: { Authorization: "Bearer test-token" },
        },
        parameters: [{ name: "limit", type: "query", mode: "list", values: ["10"] }],
        fieldMappings: [
          { sourcePath: "id", targetField: "id", dataType: "string" },
          { sourcePath: "name", targetField: "name", dataType: "string" },
        ],
        options: {
          enableCaching: false,
          enableLineageTracking: false,
          enableAuditLog: false,
        },
      }

      // Mock fetch
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: () => Promise.resolve([{ id: "1", name: "Test" }]),
          text: () => Promise.resolve(""),
        } as Response),
      )

      const result = await orchestrator.executeWorkflow(config)

      expect(result.status).toBe("success")
      expect(result.totalRequests).toBeGreaterThan(0)
      expect(result.successfulRequests).toBeGreaterThan(0)
      expect(result.recordsExtracted).toBeGreaterThan(0)
    })

    it("should handle API errors gracefully", async () => {
      const config: WorkflowConfig = {
        connectionId: "test-conn-2",
        apiConfig: {
          baseUrl: "https://api.example.com/error",
          method: "GET",
        },
        parameters: [],
        fieldMappings: [],
        options: {
          maxRetries: 1,
          enableCaching: false,
          enableLineageTracking: false,
          enableAuditLog: false,
        },
      }

      // Mock fetch to fail
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          headers: new Map(),
          text: () => Promise.resolve("Server error"),
        } as Response),
      )

      const result = await orchestrator.executeWorkflow(config)

      expect(result.status).toBe("failed")
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it("should support caching for GET requests", async () => {
      const config: WorkflowConfig = {
        connectionId: "test-conn-3",
        apiConfig: {
          baseUrl: "https://api.example.com/cached",
          method: "GET",
        },
        parameters: [],
        fieldMappings: [],
        options: {
          enableCaching: true,
          enableLineageTracking: false,
          enableAuditLog: false,
        },
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: () => Promise.resolve([{ id: "1" }]),
          text: () => Promise.resolve(""),
        } as Response),
      )

      // First execution
      const result1 = await orchestrator.executeWorkflow(config)
      expect(result1.status).toBe("success")

      // Second execution should use cache
      const result2 = await orchestrator.executeWorkflow(config)
      expect(result2.status).toBe("success")

      // Fetch should be called only once due to caching
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it("should handle binary responses", async () => {
      const config: WorkflowConfig = {
        connectionId: "test-conn-4",
        apiConfig: {
          baseUrl: "https://api.example.com/image",
          method: "GET",
        },
        parameters: [],
        fieldMappings: [],
        expectBinary: true,
        options: {
          enableCaching: false,
          enableLineageTracking: false,
          enableAuditLog: false,
        },
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

      const result = await orchestrator.executeWorkflow(config)

      expect(result.status).toBe("success")
      expect(result.recordsExtracted).toBeGreaterThan(0)
    })

    it("should validate data according to validation rules", async () => {
      const config: WorkflowConfig = {
        connectionId: "test-conn-5",
        apiConfig: {
          baseUrl: "https://api.example.com/data",
          method: "GET",
        },
        parameters: [],
        fieldMappings: [{ sourcePath: "email", targetField: "email", dataType: "string" }],
        validationRules: [
          {
            field: "email",
            type: "email",
            required: true,
          },
        ],
        options: {
          enableCaching: false,
          enableLineageTracking: false,
          enableAuditLog: false,
        },
      }

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          headers: new Map([["content-type", "application/json"]]),
          json: () => Promise.resolve([{ email: "test@example.com" }]),
          text: () => Promise.resolve(""),
        } as Response),
      )

      const result = await orchestrator.executeWorkflow(config)

      expect(result.status).toBe("success")
      expect(result.recordsLoaded).toBeGreaterThan(0)
    })
  })
})
