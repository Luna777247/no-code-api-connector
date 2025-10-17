import { GET } from '@/app/api/runs/route'
import { createMockRequest, setupTestDatabase, cleanupTestDatabase, clearTestCollections, getTestDb } from './setup'

// Mock the getDb function to use test database
jest.mock('@/lib/mongo', () => ({
  getDb: jest.fn()
}))

import { getDb } from '@/lib/mongo'
import { GET as getRun, DELETE as deleteRun } from '@/app/api/runs/[id]/route'

describe('/api/runs', () => {
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

  describe('GET /api/runs', () => {
    it('should return empty result when no runs exist', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/runs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.runs).toEqual([])
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      })
      expect(data.summary).toEqual({
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        runningRuns: 0
      })
    })

    it('should return runs with default pagination', async () => {
      const db = getTestDb()

      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      await db.collection('api_runs').insertMany([
        {
          _id: 'run1' as any,
          runId: 'run1',
          connectionId: 'conn1',
          status: 'success',
          startedAt: now,
          completedAt: now,
          duration: 10000,
          recordsProcessed: 150,
          recordsLoaded: 148,
          errorCount: 2
        },
        {
          _id: 'run2' as any,
          runId: 'run2',
          connectionId: 'conn2',
          status: 'failed',
          startedAt: yesterday,
          completedAt: yesterday,
          duration: 5000,
          recordsProcessed: 0,
          recordsLoaded: 0,
          errorCount: 1
        }
      ])

      const request = createMockRequest('GET', 'http://localhost:3000/api/runs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.runs).toHaveLength(2)
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        pages: 1
      })
      expect(data.summary).toEqual({
        totalRuns: 2,
        successfulRuns: 1,
        failedRuns: 1,
        runningRuns: 0
      })
      // Should be sorted by startedAt descending (newest first)
      expect(data.runs[0].runId).toBe('run1')
      expect(data.runs[1].runId).toBe('run2')
    })

    it('should filter runs by status', async () => {
      const db = getTestDb()

      await db.collection('api_runs').insertMany([
        { _id: 'run1' as any, runId: 'run1', connectionId: 'conn1', status: 'success', startedAt: new Date() },
        { _id: 'run2' as any, runId: 'run2', connectionId: 'conn2', status: 'failed', startedAt: new Date() },
        { _id: 'run3' as any, runId: 'run3', connectionId: 'conn3', status: 'running', startedAt: new Date() }
      ])

      const request = createMockRequest('GET', 'http://localhost:3000/api/runs?status=success')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.runs).toHaveLength(1)
      expect(data.runs[0].runId).toBe('run1')
      expect(data.summary.successfulRuns).toBe(1)
    })

    it('should filter runs by connectionId', async () => {
      const db = getTestDb()

      await db.collection('api_runs').insertMany([
        { _id: 'run1' as any, runId: 'run1', connectionId: 'conn1', status: 'success', startedAt: new Date() },
        { _id: 'run2' as any, runId: 'run2', connectionId: 'conn1', status: 'failed', startedAt: new Date() },
        { _id: 'run3' as any, runId: 'run3', connectionId: 'conn2', status: 'success', startedAt: new Date() }
      ])

      const request = createMockRequest('GET', 'http://localhost:3000/api/runs?connectionId=conn1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.runs).toHaveLength(2)
      expect(data.runs.map((r: any) => r.runId)).toEqual(['run1', 'run2'])
    })

    it('should filter runs by date range', async () => {
      const db = getTestDb()

      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      await db.collection('api_runs').insertMany([
        { _id: 'run1' as any, runId: 'run1', connectionId: 'conn1', status: 'success', startedAt: now },
        { _id: 'run2' as any, runId: 'run2', connectionId: 'conn2', status: 'failed', startedAt: yesterday },
        { _id: 'run3' as any, runId: 'run3', connectionId: 'conn3', status: 'success', startedAt: lastWeek }
      ])

      const startDate = yesterday.toISOString().split('T')[0]
      const endDate = now.toISOString().split('T')[0]

      const request = createMockRequest('GET', `http://localhost:3000/api/runs?startDate=${startDate}&endDate=${endDate}`)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.runs).toHaveLength(2)
      expect(data.runs.map((r: any) => r.runId)).toEqual(['run1', 'run2'])
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
          startedAt: new Date()
        })
      }
      await db.collection('api_runs').insertMany(runs)

      // Page 1, limit 2
      const request1 = createMockRequest('GET', 'http://localhost:3000/api/runs?page=1&limit=2')
      const response1 = await GET(request1)
      const data1 = await response1.json()

      expect(response1.status).toBe(200)
      expect(data1.runs).toHaveLength(2)
      expect(data1.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        pages: 3
      })

      // Page 2, limit 2
      const request2 = createMockRequest('GET', 'http://localhost:3000/api/runs?page=2&limit=2')
      const response2 = await GET(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.runs).toHaveLength(2)
      expect(data2.pagination.page).toBe(2)
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('GET', 'http://localhost:3000/api/runs')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch runs')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })

  describe('GET /api/runs/:id', () => {
    it('should return run when found in database', async () => {
      const db = getTestDb()

      const testDate = new Date('2024-01-15T10:30:00Z')
      await db.collection('api_runs').insertOne({
        _id: 'test-run-123' as any,
        runId: 'test-run-123',
        connectionId: 'conn-123',
        status: 'success',
        startedAt: testDate,
        completedAt: new Date(testDate.getTime() + 600000),
        duration: 600000,
        recordsProcessed: 100,
        recordsLoaded: 98,
        errorCount: 2
      })

      const mockRequest = createMockRequest('GET', 'http://localhost:3000/api/runs/test-run-123')
      const response = await getRun(mockRequest, { params: Promise.resolve({ id: 'test-run-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.runId).toBe('test-run-123')
      expect(data.connectionId).toBe('conn-123')
      expect(data.status).toBe('success')
      expect(data.recordsProcessed).toBe(100)
    })

    it('should return mock data when run not found', async () => {
      const mockRequest = createMockRequest('GET', 'http://localhost:3000/api/runs/nonexistent')
      const response = await getRun(mockRequest, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('nonexistent')
      expect(data.connectionId).toBe('conn_123')
      expect(data.status).toBe('success')
      expect(data.totalRequests).toBe(10)
      expect(data.successfulRequests).toBe(10)
      expect(data.failedRequests).toBe(0)
      expect(data.recordsExtracted).toBe(100)
      expect(data.recordsLoaded).toBe(100)
      expect(data.logs).toHaveLength(4)
      expect(data.metrics).toBeDefined()
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const mockRequest = createMockRequest('GET', 'http://localhost:3000/api/runs/test')
      const response = await getRun(mockRequest, { params: Promise.resolve({ id: 'test' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch run')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })

  describe('DELETE /api/runs/:id', () => {
    it('should delete completed run successfully', async () => {
      const db = getTestDb()

      await db.collection('api_runs').insertOne({
        _id: 'delete-test-run' as any,
        runId: 'delete-test-run',
        connectionId: 'conn-test',
        status: 'success',
        startedAt: new Date(),
        completedAt: new Date()
      })

      // Add some related logs
      await db.collection('api_run_logs').insertMany([
        { _id: 'log1' as any, runId: 'delete-test-run', message: 'Test log 1', timestamp: new Date() },
        { _id: 'log2' as any, runId: 'delete-test-run', message: 'Test log 2', timestamp: new Date() }
      ])

      const mockRequest = createMockRequest('DELETE', 'http://localhost:3000/api/runs/delete-test-run')
      const response = await deleteRun(mockRequest, { params: { id: 'delete-test-run' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Run deleted successfully')
      expect(data.runId).toBe('delete-test-run')
      expect(data.deletedRecords.runs).toBe(1)
      expect(data.deletedRecords.logs).toBe(2)

      // Verify run is deleted
      const deletedRun = await db.collection('api_runs').findOne({ runId: 'delete-test-run' })
      expect(deletedRun).toBeNull()

      // Verify logs are deleted
      const deletedLogs = await db.collection('api_run_logs').find({ runId: 'delete-test-run' }).toArray()
      expect(deletedLogs).toHaveLength(0)
    })

    it('should return 404 for non-existent run', async () => {
      const mockRequest = createMockRequest('DELETE', 'http://localhost:3000/api/runs/nonexistent')
      const response = await deleteRun(mockRequest, { params: { id: 'nonexistent' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Run not found')
    })

    it('should prevent deletion of running processes', async () => {
      const db = getTestDb()

      await db.collection('api_runs').insertOne({
        _id: 'running-run' as any,
        runId: 'running-run',
        connectionId: 'conn-test',
        status: 'running',
        startedAt: new Date()
      })

      const mockRequest = createMockRequest('DELETE', 'http://localhost:3000/api/runs/running-run')
      const response = await deleteRun(mockRequest, { params: { id: 'running-run' } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete running process. Stop the run first.')

      // Verify run still exists
      const run = await db.collection('api_runs').findOne({ runId: 'running-run' })
      expect(run).toBeTruthy()
    })

    it('should handle database errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = getDb
      ;(getDb as jest.MockedFunction<typeof getDb>).mockRejectedValue(new Error('Database connection failed'))

      const mockRequest = createMockRequest('DELETE', 'http://localhost:3000/api/runs/test')
      const response = await deleteRun(mockRequest, { params: { id: 'test' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete run')

      // Restore original mock
      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(getTestDb())
    })
  })
})