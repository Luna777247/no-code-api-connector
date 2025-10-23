import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/connections/route'
import { getDb } from '@/lib/mongo'

describe('/api/connections', () => {
  beforeEach(async () => {
    // Clean up test data
    const db = await getDb()
    await db.collection('api_metadata').deleteMany({ type: 'connection' })
  })

  describe('GET', () => {
    test('should return empty array when no connections', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    test('should return connections list', async () => {
      // Insert test data
      const db = await getDb()
      await db.collection('api_metadata').insertOne({
        type: 'connection',
        _insertedAt: new Date().toISOString(),
        connectionData: {
          name: 'Test Connection',
          apiConfig: {
            baseUrl: 'https://api.example.com',
            method: 'GET'
          }
        }
      })

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Test Connection')
    })
  })

  describe('POST', () => {
    test('should create new connection', async () => {
      const connectionData = {
        name: 'New Test Connection',
        baseUrl: 'https://jsonplaceholder.typicode.com',
        method: 'GET'
      }

      const request = new NextRequest('http://localhost:3000/api/connections', {
        method: 'POST',
        body: JSON.stringify(connectionData),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Test Connection')
    })

    test('should validate required fields', async () => {
      const invalidData = {
        name: ''
      }

      const request = new NextRequest('http://localhost:3000/api/connections', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})