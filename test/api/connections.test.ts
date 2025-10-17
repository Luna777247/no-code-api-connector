import { GET, POST } from '@/app/api/connections/route'
import { createMockRequest, setupTestDatabase, cleanupTestDatabase, clearTestCollections, getTestDb } from './setup'
import { NextRequest } from 'next/server'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient, Db, ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongo'

// Mock the getDb function to use test database
jest.mock('@/lib/mongo', () => ({
  getDb: jest.fn()
}))

import { GET as getConnection, PUT as updateConnection, DELETE as deleteConnection } from '@/app/api/connections/[id]/route'

describe('/api/connections', () => {
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

  describe('GET /api/connections', () => {
    it('should return empty array when no connections exist', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return connections sorted by createdAt descending', async () => {
      const db = getTestDb()

      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      await db.collection('api_connections').insertMany([
        {
          _id: 'conn1' as any,
          connectionId: 'conn1',
          name: 'Connection 1',
          isActive: true,
          createdAt: lastWeek,
          apiConfig: { baseUrl: 'https://api1.com', method: 'GET' }
        },
        {
          _id: 'conn2' as any,
          connectionId: 'conn2',
          name: 'Connection 2',
          isActive: true,
          createdAt: now,
          apiConfig: { baseUrl: 'https://api2.com', method: 'POST' }
        },
        {
          _id: 'conn3' as any,
          connectionId: 'conn3',
          name: 'Connection 3',
          isActive: false,
          createdAt: yesterday,
          apiConfig: { baseUrl: 'https://api3.com', method: 'PUT' }
        }
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(3)

      // Should be sorted by createdAt descending (newest first)
      expect(data[0].connectionId).toBe('conn2') // newest
      expect(data[1].connectionId).toBe('conn3') // yesterday
      expect(data[2].connectionId).toBe('conn1') // last week
    })

    it('should limit results to 50 connections', async () => {
      const db = getTestDb()

      const connections = []
      for (let i = 1; i <= 55; i++) {
        connections.push({
          _id: `conn${i}` as any,
          connectionId: `conn${i}`,
          name: `Connection ${i}`,
          isActive: true,
          createdAt: new Date(),
          apiConfig: { baseUrl: `https://api${i}.com`, method: 'GET' }
        })
      }

      await db.collection('api_connections').insertMany(connections)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(50)
    })

    it('should transform connection data correctly', async () => {
      const db = getTestDb()

      const testDate = new Date('2024-01-15T10:30:00Z')
      await db.collection('api_connections').insertOne({
        _id: 'test-conn' as any,
        connectionId: 'test-conn',
        name: 'Test Connection',
        description: 'A test connection',
        isActive: true,
        createdAt: testDate,
        lastRun: testDate,
        totalRuns: 25,
        successRate: 80,
        apiConfig: {
          baseUrl: 'https://api.example.com',
          method: 'POST'
        }
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)

      const conn = data[0]
      expect(conn.id).toBe('test-conn')
      expect(conn.connectionId).toBe('test-conn')
      expect(conn.name).toBe('Test Connection')
      expect(conn.description).toBe('A test connection')
      expect(conn.baseUrl).toBe('https://api.example.com')
      expect(conn.method).toBe('POST')
      expect(conn.isActive).toBe(true)
      expect(conn.lastRun).toBe(testDate.toISOString())
      expect(conn.totalRuns).toBe(25)
      expect(conn.successRate).toBe(80)
      expect(conn.createdAt).toBe(testDate.toISOString())
    })

    it('should provide default values for missing fields', async () => {
      const db = getTestDb()

      await db.collection('api_connections').insertOne({
        _id: 'minimal-conn' as any,
        connectionId: 'minimal-conn',
        createdAt: new Date()
        // Missing most fields
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)

      const conn = data[0]
      expect(conn.name).toBe('minimal-conn') // Uses connectionId as fallback
      expect(conn.description).toBe('API Connection') // Default
      expect(conn.baseUrl).toBe('') // Default
      expect(conn.method).toBe('GET') // Default
      expect(conn.isActive).toBe(true) // Default (isActive !== false)
      expect(conn.totalRuns).toBe(0) // Default
      expect(conn.successRate).toBe(100) // Default
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })

  describe('POST /api/connections', () => {
    it('should create a new connection successfully', async () => {
      const connectionData = {
        name: 'New Test Connection',
        description: 'A connection for testing',
        baseUrl: 'https://api.test.com',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }

      const mockRequest = createMockRequest('POST', 'http://localhost:3000/api/connections', connectionData)
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Test Connection')
      expect(data.description).toBe('A connection for testing')
      expect(data.baseUrl).toBe('https://api.test.com')
      expect(data.method).toBe('POST')
      expect(data.isActive).toBe(true)
      expect(data.createdAt).toBeDefined()
      expect(data.id).toBeDefined()
    })

    it('should handle invalid JSON gracefully', async () => {
      const mockRequest = createMockRequest('POST', 'http://localhost:3000/api/connections', 'invalid json')
      // Override the json() method to throw
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create connection')
    })

    it('should create connection with minimal data', async () => {
      const minimalData = { name: 'Minimal Connection' }

      const mockRequest = createMockRequest('POST', 'http://localhost:3000/api/connections', minimalData)
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Minimal Connection')
      expect(data.isActive).toBe(true)
      expect(data.createdAt).toBeDefined()
      expect(data.id).toBeDefined()
    })
  })

  describe('GET /api/connections/:id', () => {
    it('should return connection when found in database', async () => {
      const db = getTestDb()

      const testDate = new Date('2024-01-15T10:30:00Z')
      await db.collection('api_connections').insertOne({
        _id: 'test-conn-123' as any,
        connectionId: 'test-conn-123',
        name: 'Test Connection 123',
        description: 'Database connection',
        isActive: true,
        createdAt: testDate,
        apiConfig: {
          baseUrl: 'https://api.example.com',
          method: 'GET'
        }
      })

      const mockRequest = createMockRequest('GET', 'http://localhost:3000/api/connections/test-conn-123')
      const response = await getConnection(mockRequest, { params: Promise.resolve({ id: 'test-conn-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data._id).toBe('test-conn-123')
      expect(data.connectionId).toBe('test-conn-123')
      expect(data.name).toBe('Test Connection 123')
      expect(data.isActive).toBe(true)
    })

    it('should return mock data when connection not found', async () => {
      const mockRequest = createMockRequest('GET', 'http://localhost:3000/api/connections/nonexistent')
      const response = await getConnection(mockRequest, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('nonexistent')
      expect(data.name).toBe('Connection nonexistent')
      expect(data.description).toBe('Sample connection for testing')
      expect(data.baseUrl).toBe('https://api.example.com/data')
      expect(data.method).toBe('GET')
      expect(data.isActive).toBe(true)
      expect(data.createdAt).toBeDefined()
      expect(data.lastRun).toBeDefined()
      expect(data.totalRuns).toBe(10)
      expect(data.successRate).toBe(95.5)
      expect(data.avgResponseTime).toBe(250)
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const mockRequest = createMockRequest('GET', 'http://localhost:3000/api/connections/test')
      const response = await getConnection(mockRequest, { params: Promise.resolve({ id: 'test' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch connection')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })

  describe('PUT /api/connections/:id', () => {
    it('should update existing connection successfully', async () => {
      const db = getTestDb()

      await db.collection('api_connections').insertOne({
        _id: 'update-test' as any,
        connectionId: 'update-test',
        name: 'Original Name',
        isActive: true,
        createdAt: new Date('2024-01-01')
      })

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        isActive: false
      }

      const mockRequest = createMockRequest('PUT', 'http://localhost:3000/api/connections/update-test', updateData)
      const response = await updateConnection(mockRequest, { params: Promise.resolve({ id: 'update-test' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.connectionId).toBe('update-test')
      expect(data.name).toBe('Updated Name')
      expect(data.description).toBe('Updated description')
      expect(data.isActive).toBe(false)
      expect(data.updatedAt).toBeDefined()
    })

    it('should create new connection if not exists (upsert)', async () => {
      const newConnectionData = {
        name: 'New Connection',
        description: 'Created via upsert',
        isActive: true
      }

      const mockRequest = createMockRequest('PUT', 'http://localhost:3000/api/connections/new-upsert-conn', newConnectionData)
      const response = await updateConnection(mockRequest, { params: Promise.resolve({ id: 'new-upsert-conn' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.connectionId).toBe('new-upsert-conn')
      expect(data.name).toBe('New Connection')
      expect(data.description).toBe('Created via upsert')
      expect(data.isActive).toBe(true)
      expect(data.createdAt).toBeDefined()
      expect(data.updatedAt).toBeDefined()
    })

    it('should handle invalid JSON gracefully', async () => {
      const mockRequest = createMockRequest('PUT', 'http://localhost:3000/api/connections/test', 'invalid json')
      mockRequest.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'))

      const response = await updateConnection(mockRequest, { params: Promise.resolve({ id: 'test' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update connection')
    })
  })

  describe('DELETE /api/connections/:id', () => {
    it('should delete existing connection successfully', async () => {
      const db = getTestDb()

      await db.collection('api_connections').insertOne({
        _id: 'delete-test' as any,
        connectionId: 'delete-test',
        name: 'Connection to Delete',
        isActive: true,
        createdAt: new Date()
      })

      const mockRequest = createMockRequest('DELETE', 'http://localhost:3000/api/connections/delete-test')
      const response = await deleteConnection(mockRequest, { params: Promise.resolve({ id: 'delete-test' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Connection deleted successfully')
      expect(data.connectionId).toBe('delete-test')
      expect(data.relatedRuns).toBe(0)
      expect(data.warning).toBeNull()

      // Verify connection is deleted
      const deletedConn = await db.collection('api_connections').findOne({ connectionId: 'delete-test' })
      expect(deletedConn).toBeNull()
    })

    it('should return 404 for non-existent connection', async () => {
      const mockRequest = createMockRequest('DELETE', 'http://localhost:3000/api/connections/nonexistent')
      const response = await deleteConnection(mockRequest, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Connection not found')
    })

    it('should warn about related runs when deleting', async () => {
      const db = getTestDb()

      await db.collection('api_connections').insertOne({
        _id: 'conn-with-runs' as any,
        connectionId: 'conn-with-runs',
        name: 'Connection with Runs',
        isActive: true,
        createdAt: new Date()
      })

      // Add some related runs
      await db.collection('api_runs').insertMany([
        { connectionId: 'conn-with-runs', status: 'success', startedAt: new Date() },
        { connectionId: 'conn-with-runs', status: 'failed', startedAt: new Date() },
        { connectionId: 'conn-with-runs', status: 'success', startedAt: new Date() }
      ])

      const mockRequest = createMockRequest('DELETE', 'http://localhost:3000/api/connections/conn-with-runs')
      const response = await deleteConnection(mockRequest, { params: Promise.resolve({ id: 'conn-with-runs' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.relatedRuns).toBe(3)
      expect(data.warning).toBe('3 related runs still exist')
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const mockRequest = createMockRequest('DELETE', 'http://localhost:3000/api/connections/test')
      const response = await deleteConnection(mockRequest, { params: Promise.resolve({ id: 'test' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete connection')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })
})