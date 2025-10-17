import { GET, POST } from '@/app/api/mappings/route'
import { createMockRequest, setupTestDatabase, cleanupTestDatabase, clearTestCollections, getTestDb } from './setup'

// Mock the getDb function to use test database
jest.mock('@/lib/mongo', () => ({
  getDb: jest.fn()
}))

import { getDb } from '@/lib/mongo'
import { GET as getMapping, PUT as updateMapping, DELETE as deleteMapping } from '@/app/api/mappings/[id]/route'

describe('/api/mappings', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    await clearTestCollections()
    // Mock getDb to return test database
    ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
  })

  describe('GET /api/mappings', () => {
    it('should return empty result when no mappings exist', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/mappings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mappings).toEqual([])
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      })
      expect(data.filters).toEqual({
        connectionId: null
      })
    })

    it('should return mappings with default pagination', async () => {
      const db = getTestDb()

      await db.collection('api_field_mappings').insertMany([
        {
          _id: 'mapping1' as any,
          mappingId: 'mapping1',
          connectionId: 'conn1',
          name: 'User Data Mapping',
          description: 'Map user data fields',
          mappings: [
            {
              sourcePath: '$.data[*].id',
              targetField: 'user_id',
              dataType: 'string',
              required: true
            }
          ],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 10
        },
        {
          _id: 'mapping2' as any,
          mappingId: 'mapping2',
          connectionId: 'conn2',
          name: 'Product Data Mapping',
          description: 'Map product data fields',
          mappings: [
            {
              sourcePath: '$.products[*].sku',
              targetField: 'product_sku',
              dataType: 'string',
              required: true
            }
          ],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 5
        }
      ])

      const request = createMockRequest('GET', 'http://localhost:3000/api/mappings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mappings).toHaveLength(2)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1
      })
    })

    it('should filter mappings by connectionId', async () => {
      const db = getTestDb()

      await db.collection('api_field_mappings').insertMany([
        {
          _id: 'mapping1' as any,
          mappingId: 'mapping1',
          connectionId: 'conn1',
          name: 'Mapping 1',
          mappings: [{ sourcePath: '$.data.id', targetField: 'id', dataType: 'string', required: true }],
          isActive: true,
          createdAt: new Date()
        },
        {
          _id: 'mapping2' as any,
          mappingId: 'mapping2',
          connectionId: 'conn2',
          name: 'Mapping 2',
          mappings: [{ sourcePath: '$.data.name', targetField: 'name', dataType: 'string', required: true }],
          isActive: true,
          createdAt: new Date()
        }
      ])

      const request = createMockRequest('GET', 'http://localhost:3000/api/mappings?connectionId=conn1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mappings).toHaveLength(1)
      expect(data.mappings[0].connectionId).toBe('conn1')
      expect(data.filters.connectionId).toBe('conn1')
    })

    it('should handle pagination correctly', async () => {
      const db = getTestDb()

      // Insert 5 mappings
      const mappings = []
      for (let i = 1; i <= 5; i++) {
        mappings.push({
          _id: `mapping${i}` as any,
          mappingId: `mapping${i}`,
          connectionId: `conn${i}`,
          name: `Mapping ${i}`,
          mappings: [{ sourcePath: `$.data.field${i}`, targetField: `field${i}`, dataType: 'string', required: true }],
          isActive: true,
          createdAt: new Date()
        })
      }
      await db.collection('api_field_mappings').insertMany(mappings)

      // Page 1, limit 2
      const request1 = createMockRequest('GET', 'http://localhost:3000/api/mappings?page=1&limit=2')
      const response1 = await GET(request1)
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1.mappings).toHaveLength(2)
      expect(data1.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        pages: 3
      })

      // Page 2, limit 2
      const request2 = createMockRequest('GET', 'http://localhost:3000/api/mappings?page=2&limit=2')
      const response2 = await GET(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.mappings).toHaveLength(2)
      expect(data2.pagination.page).toBe(2)
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/mappings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch field mappings')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })

  describe('POST /api/mappings', () => {
    it('should create a new field mapping successfully', async () => {
      const mappingData = {
        name: 'Test Mapping',
        connectionId: 'conn123',
        description: 'A test field mapping',
        mappings: [
          {
            sourcePath: '$.data[*].id',
            targetField: 'user_id',
            dataType: 'string',
            required: true,
            defaultValue: null,
            transformation: null
          },
          {
            sourcePath: '$.data[*].name',
            targetField: 'full_name',
            dataType: 'string',
            required: false,
            defaultValue: 'Unknown',
            transformation: 'trim'
          }
        ]
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/mappings', mappingData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Test Mapping')
      expect(data.connectionId).toBe('conn123')
      expect(data.mappings).toHaveLength(2)
      expect(data.isActive).toBe(true)
      expect(data.usageCount).toBe(0)
      expect(data.mappingId).toBeDefined()
    })

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test Mapping'
        // Missing connectionId and mappings
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/mappings', invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })

    it('should validate mapping structure', async () => {
      const invalidData = {
        name: 'Test Mapping',
        connectionId: 'conn123',
        mappings: [
          {
            sourcePath: '$.data.id'
            // Missing targetField and dataType
          }
        ]
      }

      const request = createMockRequest('POST', 'http://localhost:3000/api/mappings', invalidData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid mapping structure')
    })

    it('should handle database errors gracefully', async () => {
      const mappingData = {
        name: 'Test Mapping',
        connectionId: 'conn123',
        mappings: [
          {
            sourcePath: '$.data.id',
            targetField: 'user_id',
            dataType: 'string',
            required: true
          }
        ]
      }

      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('POST', 'http://localhost:3000/api/mappings', mappingData)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create field mapping')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })

  describe('GET /api/mappings/:id', () => {
    it('should return mapping when found in database', async () => {
      const db = getTestDb()

      const testMapping = {
        _id: 'mapping1' as any,
        mappingId: 'mapping1',
        connectionId: 'conn1',
        name: 'Test Mapping',
        description: 'A test mapping',
        mappings: [
          {
            sourcePath: '$.data.id',
            targetField: 'user_id',
            dataType: 'string',
            required: true
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 5
      }

      await db.collection('api_field_mappings').insertOne(testMapping)

      const request = createMockRequest('GET', 'http://localhost:3000/api/mappings/mapping1')
      const response = await getMapping(request, { params: { id: 'mapping1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mappingId).toBe('mapping1')
      expect(data.name).toBe('Test Mapping')
      expect(data.mappings).toHaveLength(1)
    })

    it('should return mock data when mapping not found', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/mappings/nonexistent')
      const response = await getMapping(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('nonexistent')
      expect(data.mappings).toBeDefined()
      expect(Array.isArray(data.mappings)).toBe(true)
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/mappings/test')
      const response = await getMapping(request, { params: { id: 'test' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch field mapping')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })

  describe('PUT /api/mappings/:id', () => {
    it('should update existing mapping successfully', async () => {
      const db = getTestDb()

      const existingMapping = {
        _id: 'mapping1' as any,
        mappingId: 'mapping1',
        connectionId: 'conn1',
        name: 'Original Mapping',
        description: 'Original description',
        mappings: [
          {
            sourcePath: '$.data.id',
            targetField: 'user_id',
            dataType: 'string',
            required: true
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 5
      }

      await db.collection('api_field_mappings').insertOne(existingMapping)

      const updateData = {
        name: 'Updated Mapping',
        description: 'Updated description',
        isActive: false
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/mappings/mapping1', updateData)
      const response = await updateMapping(request, { params: { id: 'mapping1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Updated Mapping')
      expect(data.description).toBe('Updated description')
      expect(data.isActive).toBe(false)
      expect(data.updatedAt).toBeDefined()
    })

    it('should create new mapping if not exists (upsert)', async () => {
      const updateData = {
        name: 'New Mapping',
        connectionId: 'conn123',
        description: 'Created via upsert',
        mappings: [
          {
            sourcePath: '$.data.id',
            targetField: 'user_id',
            dataType: 'string',
            required: true
          }
        ]
      }

      const request = createMockRequest('PUT', 'http://localhost:3000/api/mappings/new-mapping', updateData)
      const response = await updateMapping(request, { params: { id: 'new-mapping' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mappingId).toBe('new-mapping')
      expect(data.name).toBe('New Mapping')
      expect(data.connectionId).toBe('conn123')
    })

    it('should handle database errors gracefully', async () => {
      const updateData = {
        name: 'Updated Mapping'
      }

      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('PUT', 'http://localhost:3000/api/mappings/test', updateData)
      const response = await updateMapping(request, { params: { id: 'test' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update field mapping')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })

  describe('DELETE /api/mappings/:id', () => {
    it('should delete existing mapping successfully', async () => {
      const db = getTestDb()

      const testMapping = {
        _id: 'mapping1' as any,
        mappingId: 'mapping1',
        connectionId: 'conn1',
        name: 'Test Mapping',
        mappings: [
          {
            sourcePath: '$.data.id',
            targetField: 'user_id',
            dataType: 'string',
            required: true
          }
        ],
        isActive: true,
        createdAt: new Date()
      }

      await db.collection('api_field_mappings').insertOne(testMapping)

      const request = createMockRequest('DELETE', 'http://localhost:3000/api/mappings/mapping1')
      const response = await deleteMapping(request, { params: { id: 'mapping1' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toContain('deleted successfully')

      // Verify mapping is deleted
      const deletedMapping = await db.collection('api_field_mappings').findOne({ mappingId: 'mapping1' })
      expect(deletedMapping).toBeNull()
    })

    it('should return 404 for non-existent mapping', async () => {
      const request = createMockRequest('DELETE', 'http://localhost:3000/api/mappings/nonexistent')
      const response = await deleteMapping(request, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Field mapping not found')
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('DELETE', 'http://localhost:3000/api/mappings/test')
      const response = await deleteMapping(request, { params: { id: 'test' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete field mapping')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })
})