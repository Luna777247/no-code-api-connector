/**
 * API Route Tests: Health Endpoint
 * Tests the /api/health endpoint for system health checks
 */

import { GET } from '@/app/api/health/route'
import { createMockRequest, setupTestDatabase, cleanupTestDatabase, clearTestCollections } from './setup'

describe('Health API Route', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await clearTestCollections()
  })

  describe('GET /api/health', () => {
    it('should return healthy status when all services are available', async () => {
      const response = await GET()

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('healthy')
      expect(data.timestamp).toBeDefined()
      expect(data.responseTime).toBeGreaterThanOrEqual(0)
      expect(data.services).toBeDefined()
      expect(data.services.mongodb.status).toBe('healthy')
      expect(data.services.redis.status).toBe('healthy')
      expect(data.services.api.status).toBe('healthy')
      expect(data.system).toBeDefined()
      expect(data.version).toBeDefined()
      expect(data.environment).toBeDefined()
    })

    it('should include system metrics in response', async () => {
      const response = await GET()

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.system.uptime).toBeGreaterThan(0)
      expect(data.system.memory.used).toBeGreaterThan(0)
      expect(data.system.memory.total).toBeGreaterThan(0)
      expect(data.system.node.version).toBeDefined()
      expect(data.system.node.platform).toBeDefined()
      expect(data.system.node.arch).toBeDefined()
    })

    it('should include service response times', async () => {
      const response = await GET()

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.services.mongodb.responseTime).toBeGreaterThanOrEqual(0)
      expect(data.services.redis.responseTime).toBeGreaterThanOrEqual(0)
      expect(data.services.api.responseTime).toBeGreaterThanOrEqual(0)
    })

    it('should return degraded status when MongoDB is unavailable', async () => {
      // Mock MongoDB failure by disconnecting
      const { getDb } = await import('@/lib/mongo')
      const originalGetDb = getDb

      // Temporarily mock getDb to throw error
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockImplementationOnce(() => {
        throw new Error('MongoDB connection failed')
      })

      const response = await GET()

      expect(response.status).toBe(503)

      const data = await response.json()
      expect(data.status).toBe('degraded')
      expect(data.services.mongodb.status).toBe('unhealthy')

      // Restore original function
      jest.restoreAllMocks()
    })

    it('should handle unexpected errors gracefully', async () => {
      // Mock a critical failure
      const originalProcess = process
      jest.spyOn(process, 'memoryUsage').mockImplementationOnce(() => {
        throw new Error('Memory usage check failed')
      })

      const response = await GET()

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.status).toBe('error')
      expect(data.error).toBe('Health check failed')
      expect(data.services.api.status).toBe('error')

      // Restore original process
      jest.restoreAllMocks()
    })

    it('should return proper content type', async () => {
      const response = await GET()

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should include version information', async () => {
      const response = await GET()

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.version).toBeDefined()
      expect(typeof data.version).toBe('string')
    })

    it('should include environment information', async () => {
      const response = await GET()

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.environment).toBeDefined()
      expect(['development', 'production', 'test'].includes(data.environment)).toBe(true)
    })
  })
})