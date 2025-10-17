// Mock the getDb function to use test database
jest.mock('@/lib/mongo', () => ({
  getDb: jest.fn()
}))
import { getDb } from '@/lib/mongo'
import { GET as getSchedules, POST as createSchedule } from '@/app/api/scheduler/route'
import { GET as getSchedule, PUT as updateSchedule, DELETE as deleteSchedule } from '@/app/api/scheduler/[id]/route'
import { createMockRequest, setupTestDatabase, cleanupTestDatabase, clearTestCollections, getTestDb } from './setup'
describe('/api/scheduler', () => {
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
  beforeEach(async () => {
    // Clear collections before each test
    await clearTestCollections()
  })
  describe('GET /api/scheduler', () => {
    it('should return empty result when no schedules exist', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/scheduler')
      const response = await getSchedules()
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
    it('should return schedules when they exist in database', async () => {
      const db = getTestDb()
      const testSchedules = [
        {
          _id: 'sched1' as any,
          scheduleId: 'sched1',
          connectionId: 'conn1',
          connectionName: 'Test Connection 1',
          cronExpression: '0 0 * * *',
          scheduleType: 'daily',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastRun: new Date(Date.now() - 3600000),
          nextRun: new Date(Date.now() + 86400000),
          totalRuns: 10,
          successfulRuns: 9,
          failedRuns: 1
        },
        {
          _id: 'sched2' as any,
          scheduleId: 'sched2',
          connectionId: 'conn2',
          connectionName: 'Test Connection 2',
          cronExpression: '0 */2 * * *',
          scheduleType: 'custom',
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastRun: null,
          nextRun: null,
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0
        }
      ]
      await db.collection('api_schedules').insertMany(testSchedules)
      const request = createMockRequest('GET', 'http://localhost:3000/api/scheduler')
      const response = await getSchedules()
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      // Check first schedule
      expect(data[0].scheduleId).toBe('sched1')
      expect(data[0].connectionId).toBe('conn1')
      expect(data[0].cronExpression).toBe('0 0 * * *')
      expect(data[0].isActive).toBe(true)
      expect(data[0].totalRuns).toBe(0) // Enrichment counts actual runs from api_runs collection
      // Check second schedule
      expect(data[1].scheduleId).toBe('sched2')
      expect(data[1].connectionId).toBe('conn2')
      expect(data[1].isActive).toBe(false)
      expect(data[1].totalRuns).toBe(0)
    })
    it('should handle database errors gracefully', async () => {
      // Mock database error by disconnecting
      const originalGetDb = jest.requireActual('@/lib/mongo').getDb
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockRejectedValueOnce(new Error('Database connection failed'))
      const request = createMockRequest('GET', 'http://localhost:3000/api/scheduler')
      const response = await getSchedules()
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch schedules')
      // Restore original function
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockImplementation(originalGetDb)
    })
  })
  describe('POST /api/scheduler', () => {
    it('should create a new schedule successfully', async () => {
      const scheduleData = {
        connectionId: 'conn123',
        scheduleType: 'daily',
        cronExpression: '0 0 * * *',
        workflowConfig: {
          sourceEndpoint: 'https://api.example.com/data',
          fieldMappingId: 'mapping1',
          destinationTable: 'users'
        }
      }
      const request = createMockRequest('POST', 'http://localhost:3000/api/scheduler', scheduleData)
      const response = await createSchedule(request)
      const data = await response.json()
      expect(response.status).toBe(201)
      expect(data.connectionId).toBe('conn123')
      expect(data.scheduleType).toBe('daily')
      expect(data.cronExpression).toBe('0 0 * * *')
      expect(data.isActive).toBe(true)
      expect(data.scheduleId).toBeDefined()
      expect(data.createdAt).toBeDefined()
      expect(data.nextRun).toBeDefined()
    })
    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        scheduleType: 'daily'
      }
      const request = createMockRequest('POST', 'http://localhost:3000/api/scheduler', invalidData)
      const response = await createSchedule(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Missing required fields')
    })
    it('should validate cron expression format', async () => {
      const invalidData = {
        connectionId: 'conn123',
        scheduleType: 'daily',
        cronExpression: 'invalid-cron',
        workflowConfig: {}
      }
      const request = createMockRequest('POST', 'http://localhost:3000/api/scheduler', invalidData)
      const response = await createSchedule(request)
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid cron expression')
    })
    it('should handle database errors gracefully', async () => {
      const scheduleData = {
        connectionId: 'conn123',
        scheduleType: 'daily',
        cronExpression: '0 0 * * *',
        workflowConfig: {}
      }
      // Mock database error
      const originalGetDb = jest.requireActual('@/lib/mongo').getDb
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockRejectedValueOnce(new Error('Database connection failed'))
      const request = createMockRequest('POST', 'http://localhost:3000/api/scheduler', scheduleData)
      const response = await createSchedule(request)
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create schedule')
      // Restore original function
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockImplementation(originalGetDb)
    })
  })
  describe('GET /api/scheduler/:id', () => {
    it('should return schedule when found in database', async () => {
      const db = getTestDb()
      const testSchedule = {
        _id: 'sched1' as any,
        scheduleId: 'sched1',
        connectionId: 'conn1',
        connectionName: 'Test Connection',
        cronExpression: '0 0 * * *',
        scheduleType: 'daily',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastRun: new Date(Date.now() - 3600000),
        nextRun: new Date(Date.now() + 86400000),
        totalRuns: 10,
        successfulRuns: 9,
        failedRuns: 1,
        config: {
          retryAttempts: 3,
          timeoutMs: 300000
        }
      }
      await db.collection('api_schedules').insertOne(testSchedule)
      const request = createMockRequest('GET', 'http://localhost:3000/api/scheduler/sched1')
      const response = await getSchedule(request, { params: { id: 'sched1' } })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.scheduleId).toBe('sched1')
      expect(data.connectionId).toBe('conn1')
      expect(data.cronExpression).toBe('0 0 * * *')
      expect(data.isActive).toBe(true)
      expect(data.totalRuns).toBe(10)
      expect(data.config.retryAttempts).toBe(3)
    })
    it('should return 404 when schedule not found', async () => {
      const request = createMockRequest('GET', 'http://localhost:3000/api/scheduler/nonexistent')
      const response = await getSchedule(request, { params: { id: 'nonexistent' } })
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Schedule not found')
    })
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalGetDb = jest.requireActual('@/lib/mongo').getDb
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockRejectedValueOnce(new Error('Database connection failed'))
      const request = createMockRequest('GET', 'http://localhost:3000/api/scheduler/test')
      const response = await getSchedule(request, { params: { id: 'test' } })
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch schedule')
      // Restore original function
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockImplementation(originalGetDb)
    })
  })
  describe('PUT /api/scheduler/:id', () => {
    it('should update existing schedule successfully', async () => {
      const db = getTestDb()
      const testSchedule = {
        _id: 'sched1' as any,
        scheduleId: 'sched1',
        connectionId: 'conn1',
        connectionName: 'Test Connection',
        cronExpression: '0 0 * * *',
        scheduleType: 'daily',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalRuns: 5
      }
      await db.collection('api_schedules').insertOne(testSchedule)
      const updateData = {
        isActive: false,
        cronExpression: '0 */2 * * *',
        scheduleType: 'custom'
      }
      const request = createMockRequest('PUT', 'http://localhost:3000/api/scheduler/sched1', updateData)
      const response = await updateSchedule(request, { params: { id: 'sched1' } })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.scheduleId).toBe('sched1')
      expect(data.isActive).toBe(false)
      expect(data.cronExpression).toBe('0 */2 * * *')
      expect(data.scheduleType).toBe('custom')
      expect(data.updatedAt).toBeDefined()
    })
    it('should create new schedule if not exists (upsert)', async () => {
      const updateData = {
        connectionId: 'conn123',
        connectionName: 'New Connection',
        cronExpression: '0 0 * * *',
        scheduleType: 'daily',
        isActive: true
      }
      const request = createMockRequest('PUT', 'http://localhost:3000/api/scheduler/new-sched', updateData)
      const response = await updateSchedule(request, { params: { id: 'new-sched' } })
      const data = await response.json()
      expect(response.status).toBe(201)
      expect(data.scheduleId).toBe('new-sched')
      expect(data.connectionId).toBe('conn123')
      expect(data.cronExpression).toBe('0 0 * * *')
      expect(data.isActive).toBe(true)
      expect(data.createdAt).toBeDefined()
      expect(data.updatedAt).toBeDefined()
    })
    it('should validate cron expression format', async () => {
      const updateData = {
        cronExpression: 'invalid-cron-format'
      }
      const request = createMockRequest('PUT', 'http://localhost:3000/api/scheduler/test', updateData)
      const response = await updateSchedule(request, { params: { id: 'test' } })
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid cron expression format')
    })
    it('should handle database errors gracefully', async () => {
      const updateData = {
        isActive: false
      }
      // Mock database error
      const originalGetDb = jest.requireActual('@/lib/mongo').getDb
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockRejectedValueOnce(new Error('Database connection failed'))
      const request = createMockRequest('PUT', 'http://localhost:3000/api/scheduler/test', updateData)
      const response = await updateSchedule(request, { params: { id: 'test' } })
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to update schedule')
      // Restore original function
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockImplementation(originalGetDb)
    })
  })
  describe('DELETE /api/scheduler/:id', () => {
    it('should delete existing schedule successfully', async () => {
      const db = getTestDb()
      const testSchedule = {
        _id: 'sched1' as any,
        scheduleId: 'sched1',
        connectionId: 'conn1',
        connectionName: 'Test Connection',
        cronExpression: '0 0 * * *',
        scheduleType: 'daily',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalRuns: 5
      }
      await db.collection('api_schedules').insertOne(testSchedule)
      const request = createMockRequest('DELETE', 'http://localhost:3000/api/scheduler/sched1')
      const response = await deleteSchedule(request, { params: { id: 'sched1' } })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.message).toContain('deleted successfully')
      expect(data.scheduleId).toBe('sched1')
      expect(data.historicalRuns).toBe(0)
      // Verify schedule is deleted
      const deletedSchedule = await db.collection('api_schedules').findOne({ scheduleId: 'sched1' })
      expect(deletedSchedule).toBeNull()
    })
    it('should return 404 for non-existent schedule', async () => {
      const request = createMockRequest('DELETE', 'http://localhost:3000/api/scheduler/nonexistent')
      const response = await deleteSchedule(request, { params: { id: 'nonexistent' } })
      const data = await response.json()
      expect(response.status).toBe(404)
      expect(data.error).toBe('Schedule not found')
    })
    it('should prevent deletion when active runs exist', async () => {
      const db = getTestDb()
      const testSchedule = {
        _id: 'sched1' as any,
        scheduleId: 'sched1',
        connectionId: 'conn1',
        connectionName: 'Test Connection',
        cronExpression: '0 0 * * *',
        scheduleType: 'daily',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      // Add an active run for this schedule
      const activeRun = {
        _id: 'run1' as any,
        runId: 'run1',
        scheduleId: 'sched1',
        status: 'running',
        startedAt: new Date(),
        connectionId: 'conn1'
      }
      await db.collection('api_schedules').insertOne(testSchedule)
      await db.collection('api_runs').insertOne(activeRun)
      const request = createMockRequest('DELETE', 'http://localhost:3000/api/scheduler/sched1')
      const response = await deleteSchedule(request, { params: { id: 'sched1' } })
      const data = await response.json()
      expect(response.status).toBe(400)
      expect(data.error).toContain('Cannot delete schedule')
      expect(data.error).toContain('active runs in progress')
      // Verify schedule still exists
      const schedule = await db.collection('api_schedules').findOne({ scheduleId: 'sched1' })
      expect(schedule).toBeTruthy()
    })
    it('should include historical runs count in response', async () => {
      const db = getTestDb()
      const testSchedule = {
        _id: 'sched1' as any,
        scheduleId: 'sched1',
        connectionId: 'conn1',
        connectionName: 'Test Connection',
        cronExpression: '0 0 * * *',
        scheduleType: 'daily',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      // Add historical runs
      const historicalRuns = [
        { _id: 'run1' as any, runId: 'run1', scheduleId: 'sched1', status: 'success', connectionId: 'conn1' },
        { _id: 'run2' as any, runId: 'run2', scheduleId: 'sched1', status: 'failed', connectionId: 'conn1' },
        { _id: 'run3' as any, runId: 'run3', scheduleId: 'sched1', status: 'success', connectionId: 'conn1' }
      ]
      await db.collection('api_schedules').insertOne(testSchedule)
      await db.collection('api_runs').insertMany(historicalRuns)
      const request = createMockRequest('DELETE', 'http://localhost:3000/api/scheduler/sched1')
      const response = await deleteSchedule(request, { params: { id: 'sched1' } })
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.historicalRuns).toBe(3)
      expect(data.warning).toContain('3 historical runs preserved')
    })
    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalGetDb = jest.requireActual('@/lib/mongo').getDb
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockRejectedValueOnce(new Error('Database connection failed'))
      const request = createMockRequest('DELETE', 'http://localhost:3000/api/scheduler/test')
      const response = await deleteSchedule(request, { params: { id: 'test' } })
      const data = await response.json()
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete schedule')
      // Restore original function
      jest.spyOn(require('@/lib/mongo'), 'getDb').mockImplementation(originalGetDb)
    })
  })
})
