/**
 * API Route Testing Utilities
 * Provides common setup and utilities for testing Next.js API routes
 */

import { NextRequest } from 'next/server'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient, Db } from 'mongodb'
import jwt from 'jsonwebtoken'

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.MONGODB_URI = 'mongodb://localhost:27017/test'
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'

let mongoServer: MongoMemoryServer
let mongoClient: MongoClient
let testDb: Db

/**
 * Setup test database connection
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    process.env.MONGODB_URI = mongoUri

    mongoClient = new MongoClient(mongoUri)
    await mongoClient.connect()
    testDb = mongoClient.db('test_no_code_api_connector')

    console.log('[API_TEST] Test database initialized')
  } catch (error) {
    console.error('[API_TEST] Failed to setup test database:', error)
    throw error
  }
}

/**
 * Cleanup test database
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    if (mongoClient) {
      await mongoClient.close()
    }
    if (mongoServer) {
      await mongoServer.stop()
    }
    console.log('[API_TEST] Test database cleaned up')
  } catch (error) {
    console.error('[API_TEST] Failed to cleanup test database:', error)
  }
}

/**
 * Get test database instance
 */
export function getTestDb(): Db {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.')
  }
  return testDb
}

/**
 * Clear all collections in test database
 */
export async function clearTestCollections(): Promise<void> {
  const db = getTestDb()
  const collections = await db.collections()

  for (const collection of collections) {
    await collection.deleteMany({})
  }
}

/**
 * Create mock NextRequest for testing
 */
export function createMockRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any,
  headers: Record<string, string> = {}
): NextRequest {
  const requestUrl = new URL(url)

  // Create headers
  const requestHeaders = new Headers()
  requestHeaders.set('Content-Type', 'application/json')

  Object.entries(headers).forEach(([key, value]) => {
    requestHeaders.set(key, value)
  })

  // Create request body if needed
  let requestBody: string | undefined
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestBody = JSON.stringify(body)
  }

  // Create the Request object first
  const request = new Request(requestUrl, {
    method,
    headers: requestHeaders,
    body: requestBody
  })

  // Convert to NextRequest
  return new NextRequest(request)
}

/**
 * Create authenticated mock request with JWT token
 */
export function createAuthenticatedRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any,
  userId: string = 'test-user-id',
  headers: Record<string, string> = {}
): NextRequest {
  const token = jwt.sign(
    { userId, email: 'test@example.com' },
    process.env.JWT_SECRET!
  )

  return createMockRequest(method, url, body, {
    'Authorization': `Bearer ${token}`,
    ...headers
  })
}

/**
 * Create API key authenticated request
 */
export function createApiKeyRequest(
  method: string = 'GET',
  url: string = 'http://localhost:3000/api/test',
  body?: any,
  apiKey: string = 'test-api-key',
  headers: Record<string, string> = {}
): NextRequest {
  return createMockRequest(method, url, body, {
    'X-API-Key': apiKey,
    ...headers
  })
}

/**
 * Mock external API responses
 */
export const mockApiResponses = {
  jsonplaceholder: {
    posts: [
      { id: 1, title: 'Test Post 1', body: 'Test body 1', userId: 1 },
      { id: 2, title: 'Test Post 2', body: 'Test body 2', userId: 1 }
    ],
    users: [
      { id: 1, name: 'John Doe', email: 'john@example.com' }
    ]
  },
  places: {
    results: [
      { name: 'Central Park', address: 'New York, NY' },
      { name: 'Times Square', address: 'New York, NY' }
    ]
  }
}

/**
 * Test data factories
 */
export const testData = {
  connection: {
    name: 'Test Connection',
    apiUrl: 'https://jsonplaceholder.typicode.com/posts',
    method: 'GET',
    headers: {},
    authentication: {
      type: 'none'
    },
    fieldMappings: [
      { sourceField: 'title', targetField: 'postTitle', dataType: 'string' },
      { sourceField: 'body', targetField: 'postBody', dataType: 'string' }
    ],
    validationRules: []
  },

  mapping: {
    connectionId: 'test-connection-id',
    sourceField: '$.title',
    targetField: 'title',
    dataType: 'string',
    transformation: null,
    validation: null
  },

  run: {
    connectionId: 'test-connection-id',
    status: 'completed',
    recordsProcessed: 10,
    recordsValid: 8,
    recordsInvalid: 2,
    executionTime: 1500,
    errorMessage: null
  }
}

/**
 * Wait for async operations to complete
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry utility for flaky operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 100
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === attempts - 1) throw error
      await wait(delay)
    }
  }
  throw new Error('Retry failed')
}