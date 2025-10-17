import { GET } from '@/app/api/data/route'
import { createMockRequest, setupTestDatabase, cleanupTestDatabase, clearTestCollections, getTestDb } from './setup'

// Mock the getDb function to use test database
jest.mock('@/lib/mongo', () => ({
  getDb: jest.fn()
}))

import { getDb } from '@/lib/mongo'

describe('/api/data', () => {
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

  describe('GET /api/data', () => {
    it('should return empty result when no data exists', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/data')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
      expect(data.summary).toEqual({
        timeRange: '7d',
        totalRuns: 0,
        currentPage: 1,
        totalPages: 0,
        recordsShown: 0,
        totalRecords: 0,
        estimatedDataSize: '0KB'
      })
      expect(data.statistics).toEqual({
        totalRuns: 0,
        totalRecords: 0,
        avgExecutionTime: 0,
        avgRecordsPerRun: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0
      })
      expect(data.connectionBreakdown).toEqual([])
    })

    it('should return data with default parameters', async () => {
      const db = getTestDb()

      // Insert test runs with data
      await db.collection('api_runs').insertMany([
        {
          _id: 'run1' as any,
          runId: 'run1',
          connectionId: 'conn1',
          status: 'success',
          startedAt: new Date(),
          completedAt: new Date(),
          recordsProcessed: 100,
          executionTime: 5000,
          dataPreview: [
            { id: 1, name: 'Test 1' },
            { id: 2, name: 'Test 2' }
          ],
          transformedData: [
            { user_id: 1, full_name: 'Test 1' },
            { user_id: 2, full_name: 'Test 2' }
          ]
        },
        {
          _id: 'run2' as any,
          runId: 'run2',
          connectionId: 'conn2',
          status: 'success',
          startedAt: new Date(),
          completedAt: new Date(),
          recordsProcessed: 50,
          executionTime: 3000,
          dataPreview: [
            { id: 3, name: 'Test 3' }
          ],
          transformedData: [
            { user_id: 3, full_name: 'Test 3' }
          ]
        }
      ])

      const request = createMockRequest('GET', 'http://localhost:3000/api/data')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(2)
      expect(data.summary.totalRuns).toBe(2)
      expect(data.summary.totalRecords).toBe(150)
      expect(data.statistics.totalRuns).toBe(2)
      expect(data.statistics.totalRecords).toBe(150)
      expect(data.connectionBreakdown).toHaveLength(2)
    })

    it('should filter data by connectionId', async () => {
      const db = getTestDb()

      await db.collection('api_runs').insertMany([
        {
          _id: 'run1' as any,
          runId: 'run1',
          connectionId: 'conn1',
          status: 'success',
          startedAt: new Date(),
          recordsProcessed: 100,
          dataPreview: [{ id: 1, name: 'Test 1' }],
          transformedData: [{ user_id: 1, full_name: 'Test 1' }]
        },
        {
          _id: 'run2' as any,
          runId: 'run2',
          connectionId: 'conn2',
          status: 'success',
          startedAt: new Date(),
          recordsProcessed: 50,
          dataPreview: [{ id: 2, name: 'Test 2' }],
          transformedData: [{ user_id: 2, full_name: 'Test 2' }]
        }
      ])

      const request = createMockRequest('GET', 'http://localhost:3000/api/data?connectionId=conn1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].connectionId).toBe('conn1')
      expect(data.summary.totalRecords).toBe(100)
    })

    it('should filter data by time range', async () => {
      const db = getTestDb()
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      await db.collection('api_runs').insertMany([
        {
          _id: 'run1' as any,
          runId: 'run1',
          connectionId: 'conn1',
          status: 'success',
          startedAt: now,
          recordsProcessed: 100,
          dataPreview: [{ id: 1, name: 'Recent' }],
          transformedData: [{ user_id: 1, full_name: 'Recent' }]
        },
        {
          _id: 'run2' as any,
          runId: 'run2',
          connectionId: 'conn2',
          status: 'success',
          startedAt: twoHoursAgo,
          recordsProcessed: 50,
          dataPreview: [{ id: 2, name: 'Old' }],
          transformedData: [{ user_id: 2, full_name: 'Old' }]
        }
      ])

      const request = createMockRequest('GET', 'http://localhost:3000/api/data?timeRange=1h')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].runId).toBe('run1')
    })

    it('should handle pagination correctly', async () => {
      const db = getTestDb()

      // Insert 5 runs
      const runs = []
      for (let i = 1; i <= 5; i++) {
        runs.push({
          _id: `run${i}` as any,
          runId: `run${i}`,
          connectionId: `conn${i}`,
          status: 'success',
          startedAt: new Date(),
          recordsProcessed: 20,
          dataPreview: [{ id: i, name: `Test ${i}` }],
          transformedData: [{ user_id: i, full_name: `Test ${i}` }]
        })
      }
      await db.collection('api_runs').insertMany(runs)

      // Page 1, limit 2
      const request1 = createMockRequest('GET', 'http://localhost:3000/api/data?limit=2&skip=0')
      const response1 = await GET(request1)
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1.data).toHaveLength(2)
      expect(data1.summary.currentPage).toBe(1)
      expect(data1.summary.totalPages).toBe(3)

      // Page 2, limit 2
      const request2 = createMockRequest('GET', 'http://localhost:3000/api/data?limit=2&skip=2')
      const response2 = await GET(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.data).toHaveLength(2)
      expect(data2.summary.currentPage).toBe(2)
    })

    it('should return detailed format when requested', async () => {
      const db = getTestDb()

      await db.collection('api_runs').insertOne({
        _id: 'run1' as any,
        runId: 'run1',
        connectionId: 'conn1',
        status: 'success',
        startedAt: new Date(),
        recordsProcessed: 100,
        dataPreview: [{ id: 1, name: 'Test 1' }],
        transformedData: [
          { user_id: 1, full_name: 'Test 1', email: 'test@example.com' },
          { user_id: 2, full_name: 'Test 2', email: 'test2@example.com' }
        ]
      })

      const request = createMockRequest('GET', 'http://localhost:3000/api/data?format=detailed')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].transformedData).toBeDefined()
      expect(data.data[0].transformedData).toHaveLength(2)
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/data')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch data')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })

    it('should validate limit parameter (max 100)', async () => {
      const db = getTestDb()

      // Insert 150 runs
      const runs = []
      for (let i = 1; i <= 150; i++) {
        runs.push({
          _id: `run${i}` as any,
          runId: `run${i}`,
          connectionId: `conn${i}`,
          status: 'success',
          startedAt: new Date(),
          recordsProcessed: 1,
          dataPreview: [{ id: i, name: `Test ${i}` }],
          transformedData: [{ user_id: i, full_name: `Test ${i}` }]
        })
      }
      await db.collection('api_runs').insertMany(runs)

      const request = createMockRequest('GET', 'http://localhost:3000/api/data?limit=150')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(100) // Should be limited to 100
      expect(data.summary.recordsShown).toBe(100)
    })
  })
})