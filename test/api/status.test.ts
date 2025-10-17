// Mock the getDb function to use test database
jest.mock('@/lib/mongo', () => ({
  getDb: jest.fn()
}))

import { GET } from '@/app/api/status/route'
import { createMockRequest, setupTestDatabase, cleanupTestDatabase, clearTestCollections, getTestDb } from './setup'
import { getDb } from '@/lib/mongo'

describe('/api/status', () => {
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

  describe('GET /api/status', () => {
    it('should return system status with all metrics', async () => {
      // Insert test data
      const db = getTestDb()

      // Insert connections
      await db.collection('api_connections').insertMany([
        { _id: 'conn1', name: 'Test Connection 1', isActive: true, createdAt: new Date() },
        { _id: 'conn2', name: 'Test Connection 2', isActive: false, createdAt: new Date() },
        { _id: 'conn3', name: 'Test Connection 3', isActive: true, createdAt: new Date() }
      ])

      // Insert runs
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      await db.collection('api_runs').insertMany([
        { connectionId: 'conn1', status: 'success', startedAt: now, completedAt: now },
        { connectionId: 'conn1', status: 'success', startedAt: now, completedAt: now },
        { connectionId: 'conn2', status: 'failed', startedAt: now, completedAt: now },
        { connectionId: 'conn1', status: 'running', startedAt: now }, // No completedAt
        { connectionId: 'conn3', status: 'success', startedAt: yesterday, completedAt: yesterday } // Outside 24h
      ])

      // Insert schedules
      await db.collection('api_schedules').insertMany([
        { _id: 'sched1', name: 'Test Schedule 1', isActive: true, createdAt: new Date() },
        { _id: 'sched2', name: 'Test Schedule 2', isActive: false, createdAt: new Date() }
      ])

      // Insert mappings
      await db.collection('api_field_mappings').insertMany([
        { _id: 'map1', name: 'Test Mapping 1', createdAt: new Date() },
        { _id: 'map2', name: 'Test Mapping 2', createdAt: new Date() },
        { _id: 'map3', name: 'Test Mapping 3', createdAt: new Date() }
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('uptime')
      expect(typeof data.uptime).toBe('number')

      // Check connections
      expect(data.connections).toEqual({
        total: 3,
        active: 2,
        utilization: 67 // (2/3) * 100 rounded
      })

      // Check runs
      expect(data.runs).toEqual({
        total: 5,
        running: 1,
        last24h: 4, // 4 runs in last 24h
        successRate: 50 // (2/4) * 100 = 50%
      })

      // Check schedules
      expect(data.schedules).toEqual({
        total: 2,
        active: 1,
        utilization: 50 // (1/2) * 100
      })

      // Check mappings
      expect(data.mappings).toEqual({
        total: 3
      })

      // Check activity
      expect(data.activity).toEqual({
        period: '24h',
        totalRuns: 4,
        successfulRuns: 2,
        failedRuns: 1,
        successRate: 50
      })

      // Check performance metrics
      expect(data.performance).toHaveProperty('avgResponseTime')
      expect(data.performance).toHaveProperty('dataVolumeToday')
      expect(data.performance).toHaveProperty('errorRate')
      expect(data.performance).toHaveProperty('systemLoad')
      expect(data.performance.systemLoad).toHaveProperty('cpu')
      expect(data.performance.systemLoad).toHaveProperty('memory')
      expect(data.performance.systemLoad).toHaveProperty('disk')

      // Check top connections
      expect(data.topConnections).toHaveLength(2) // conn1 and conn2
      expect(data.topConnections[0]).toHaveProperty('connectionId', 'conn1')
      expect(data.topConnections[0]).toHaveProperty('runCount', 3)
      expect(data.topConnections[0]).toHaveProperty('successRate', 67) // (2/3) * 100 rounded
      expect(data.topConnections[1]).toHaveProperty('connectionId', 'conn2')
      expect(data.topConnections[1]).toHaveProperty('runCount', 1)
      expect(data.topConnections[1]).toHaveProperty('successRate', 0)

      // Check system info
      expect(data.system).toHaveProperty('nodeVersion')
      expect(data.system).toHaveProperty('platform')
      expect(data.system).toHaveProperty('architecture')
      expect(data.system).toHaveProperty('environment')
      expect(data.system).toHaveProperty('timezone')
    })

    it('should return zero metrics when database is empty', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)

      expect(data.connections).toEqual({
        total: 0,
        active: 0,
        utilization: 0
      })

      expect(data.runs).toEqual({
        total: 0,
        running: 0,
        last24h: 0,
        successRate: 0
      })

      expect(data.schedules).toEqual({
        total: 0,
        active: 0,
        utilization: 0
      })

      expect(data.mappings).toEqual({
        total: 0
      })

      expect(data.activity).toEqual({
        period: '24h',
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        successRate: 0
      })

      expect(data.topConnections).toEqual([])
    })

    it('should handle database connection errors gracefully', async () => {
      // Mock getDb to throw an error
      const originalGetDb = require('@/lib/mongo').getDb
      require('@/lib/mongo').getDb = jest.fn().mockRejectedValue(new Error('Database connection failed'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Failed to fetch system status')
      expect(data).toHaveProperty('timestamp')

      // Restore original function
      require('@/lib/mongo').getDb = originalGetDb
    })

    it('should handle aggregation pipeline errors gracefully', async () => {
      const db = getTestDb()

      // Insert data that might cause aggregation issues
      await db.collection('api_runs').insertOne({
        connectionId: null, // This might cause issues in aggregation
        status: 'success',
        startedAt: new Date()
      })

      // Mock getDb to return a db where aggregate throws
      const mockDb = {
        ...getTestDb(),
        collection: jest.fn((name) => {
          const realCollection = getTestDb().collection(name)
          if (name === 'api_runs') {
            return {
              ...realCollection,
              aggregate: jest.fn().mockImplementation(() => {
                throw new Error('Aggregation pipeline error')
              })
            }
          }
          return realCollection
        })
      }

      ;(getDb as jest.MockedFunction<typeof getDb>).mockResolvedValue(mockDb as any)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toHaveProperty('error', 'Failed to fetch system status')
      expect(data).toHaveProperty('timestamp')
    })

    it('should calculate success rate correctly with mixed statuses', async () => {
      const db = getTestDb()

      const now = new Date()
      await db.collection('api_runs').insertMany([
        { connectionId: 'conn1', status: 'success', startedAt: now },
        { connectionId: 'conn1', status: 'success', startedAt: now },
        { connectionId: 'conn1', status: 'failed', startedAt: now },
        { connectionId: 'conn1', status: 'error', startedAt: now },
        { connectionId: 'conn1', status: 'success', startedAt: now }
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.activity.successRate).toBe(60) // (3/5) * 100 = 60%
      expect(data.runs.successRate).toBe(60)
    })

    it('should limit top connections to 5 results', async () => {
      const db = getTestDb()

      const now = new Date()
      const connections = []
      const runs = []

      // Create 7 connections with varying run counts
      for (let i = 1; i <= 7; i++) {
        connections.push({
          _id: `conn${i}`,
          name: `Connection ${i}`,
          active: true,
          createdAt: new Date()
        })

        // Add runs for each connection (decreasing count)
        for (let j = 0; j < (8 - i); j++) {
          runs.push({
            connectionId: `conn${i}`,
            status: 'success',
            startedAt: now
          })
        }
      }

      await db.collection('api_connections').insertMany(connections)
      await db.collection('api_runs').insertMany(runs)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.topConnections).toHaveLength(5)

      // Should be ordered by run count descending
      expect(data.topConnections[0].runCount).toBe(7) // conn1
      expect(data.topConnections[1].runCount).toBe(6) // conn2
      expect(data.topConnections[2].runCount).toBe(5) // conn3
      expect(data.topConnections[3].runCount).toBe(4) // conn4
      expect(data.topConnections[4].runCount).toBe(3) // conn5
    })

    it('should include system information in response', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.system).toBeDefined()
      expect(typeof data.system.nodeVersion).toBe('string')
      expect(typeof data.system.platform).toBe('string')
      expect(typeof data.system.architecture).toBe('string')
      expect(typeof data.system.environment).toBe('string')
      expect(typeof data.system.timezone).toBe('string')
    })

    it('should handle runs with old timestamps correctly', async () => {
      const db = getTestDb()

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      await db.collection('api_runs').insertMany([
        { connectionId: 'conn1', status: 'success', startedAt: now },
        { connectionId: 'conn1', status: 'success', startedAt: weekAgo },
        { connectionId: 'conn1', status: 'success', startedAt: weekAgo }
      ])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.activity.totalRuns).toBe(1) // Only the recent run
      expect(data.activity.successfulRuns).toBe(1)
      expect(data.activity.failedRuns).toBe(0)
      expect(data.activity.successRate).toBe(100)
    })
  })
})