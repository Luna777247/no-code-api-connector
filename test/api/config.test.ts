/**
 * API Route Tests: Config Endpoint
 * Tests the /api/config endpoint for system configuration retrieval and updates
 */

import { GET, PUT } from '@/app/api/config/route'
import { createMockRequest, setupTestDatabase, cleanupTestDatabase, clearTestCollections } from './setup'

describe('Config API Route', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await clearTestCollections()
  })

  describe('GET /api/config', () => {
    it('should return complete system configuration', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.timestamp).toBeDefined()
      expect(data.system).toBeDefined()
      expect(data.api).toBeDefined()
      expect(data.database).toBeDefined()
      expect(data.security).toBeDefined()
      expect(data.environment).toBeDefined()
      expect(data.metadata).toBeDefined()
    })

    it('should return system configuration when category=system', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config?category=system')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.category).toBe('system')
      expect(data.config.version).toBeDefined()
      expect(data.config.environment).toBeDefined()
      expect(data.config.platform).toBeDefined()
      expect(data.config.runtime).toBeDefined()
      expect(data.metadata.category).toBe('system')
    })

    it('should return API configuration when category=api', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config?category=api')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.category).toBe('api')
      expect(data.config.endpoints).toBeDefined()
      expect(data.config.features).toBeDefined()
      expect(data.config.authentication).toBeDefined()
    })

    it('should return database configuration when category=database', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config?category=database')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.category).toBe('database')
      expect(data.config.type).toBe('MongoDB')
      expect(data.config.collections).toBeDefined()
      expect(data.config.indexes).toBeDefined()
    })

    it('should return security configuration when category=security', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config?category=security')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.category).toBe('security')
      expect(data.config.cors).toBeDefined()
      expect(data.config.headers).toBeDefined()
      expect(data.config.encryption).toBeDefined()
    })

    it('should return environment configuration when category=environment', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config?category=environment')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.category).toBe('environment')
      expect(data.config.NODE_ENV).toBeDefined()
      expect(data.config.PORT).toBeDefined()
    })

    it('should include secrets when includeSecrets=true', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config?includeSecrets=true')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.metadata.includeSecrets).toBe(true)
      expect(data.security.encryption.secrets).toBe('visible')
      expect(data.environment.DATABASE_URL).toBeDefined()
    })

    it('should hide secrets by default', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.metadata.includeSecrets).toBe(false)
      expect(data.security.encryption.secrets).toBe('hidden')
      expect(data.environment.DATABASE_URL).toBeUndefined()
    })

    it('should return error for invalid category', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config?category=invalid')
      const response = await GET(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Invalid category')
      expect(data.validCategories).toEqual(['system', 'api', 'database', 'security', 'environment'])
    })

    it('should include system metrics in response', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.system.runtime.uptime).toBeGreaterThan(0)
      expect(data.system.runtime.memory.used).toBeGreaterThan(0)
      expect(data.system.platform.node).toBeDefined()
      expect(data.system.platform.timezone).toBeDefined()
    })

    it('should include API features configuration', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.api.features.connections.enabled).toBe(true)
      expect(data.api.features.runs.enabled).toBe(true)
      expect(data.api.features.schedules.enabled).toBe(true)
      expect(data.api.features.mappings.enabled).toBe(true)
    })

    it('should handle database connection errors gracefully', async () => {
      // Mock database failure
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockImplementationOnce(() => {
        throw new Error('Database connection failed')
      })

      const request = createMockRequest('GET', 'http://localhost:3000/api/config')
      const response = await GET(request)

      expect(response.status).toBe(200) // Should still return config even with DB error

      const data = await response.json()
      expect(data.database.status).toBe('error')
      expect(data.database.error).toBe('Connection failed')

      jest.restoreAllMocks()
    })

    it('should return proper content type', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config')
      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should include metadata in response', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/config')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.metadata.generatedAt).toBeDefined()
      expect(data.metadata.format).toBe('json')
      expect(data.metadata.category).toBe('all')
      expect(data.metadata.configVersion).toBe('1.0')
    })
  })

  describe('PUT /api/config', () => {
    it('should update API configuration successfully', async () => {
      const updateData = {
        category: 'api',
        settings: {
          endpoints: {
            timeout: 60000,
            maxRetries: 5
          }
        }
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/config', updateData)
      const response = await PUT(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.category).toBe('api')
      expect(data.updatedSettings).toEqual(updateData.settings)
      expect(data.appliedAt).toBeDefined()
    })

    it('should update features configuration successfully', async () => {
      const updateData = {
        category: 'features',
        settings: {
          connections: { maxConnections: 200 },
          runs: { maxConcurrent: 20 }
        }
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/config', updateData)
      const response = await PUT(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.category).toBe('features')
      expect(data.updatedSettings).toEqual(updateData.settings)
    })

    it('should return error for missing category', async () => {
      const updateData = {
        settings: { someSetting: 'value' }
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/config', updateData)
      const response = await PUT(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Category and settings are required')
      expect(data.requiredFields).toEqual(['category', 'settings'])
    })

    it('should return error for missing settings', async () => {
      const updateData = {
        category: 'api'
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/config', updateData)
      const response = await PUT(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Category and settings are required')
    })

    it('should return error for invalid category', async () => {
      const updateData = {
        category: 'invalidCategory',
        settings: { someSetting: 'value' }
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/config', updateData)
      const response = await PUT(request)

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBe('Invalid configuration category')
      expect(data.validCategories).toEqual(['api', 'features', 'rateLimit'])
    })

    it('should handle malformed JSON gracefully', async () => {
      // Create a request with invalid JSON body
      const request = createMockRequest('PUT', 'http://localhost:3000/api/config')
      // Mock the json() method to throw an error
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await PUT(request)

      expect(response.status).toBe(500)

      const data = await response.json()
      expect(data.error).toBe('Failed to update configuration')
    })

    it('should include simulation note in response', async () => {
      const updateData = {
        category: 'api',
        settings: { timeout: 45000 }
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/config', updateData)
      const response = await PUT(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.message).toContain('simulated')
      expect(data.note).toContain('production')
    })
  })
})