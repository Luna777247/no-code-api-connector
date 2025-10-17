// Test helpers and utilities
import { MongoClient } from 'mongodb';

// Test database connection helper
export async function getTestDb() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
  const client = new MongoClient(uri);
  await client.connect();
  return client.db('test');
}

// Mock API response helper
export function createMockApiResponse(data: any, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

// Mock fetch helper
export function mockFetchResponse(data: any, status = 200) {
  (global.fetch as any).mockResolvedValueOnce(createMockApiResponse(data, status));
}

// Test data factories
export const createMockConnection = (overrides = {}) => ({
  _id: 'test-connection-id',
  name: 'Test API Connection',
  baseUrl: 'https://jsonplaceholder.typicode.com',
  method: 'GET',
  auth: { type: 'none' },
  headers: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

export const createMockRun = (overrides = {}) => ({
  _id: 'test-run-id',
  connectionId: 'test-connection-id',
  status: 'success',
  recordsProcessed: 100,
  executionTime: 5000,
  createdAt: new Date(),
  metadata: {
    apiUrl: 'https://jsonplaceholder.typicode.com/posts',
    method: 'GET'
  },
  ...overrides
});

export const createMockFieldMapping = (overrides = {}) => ({
  _id: 'test-mapping-id',
  connectionId: 'test-connection-id',
  sourcePath: '$.id',
  targetField: 'record_id',
  dataType: 'number',
  isRequired: true,
  ...overrides
});

// Cleanup helper
export async function cleanupTestData(db: any) {
  const collections = ['api_connections', 'api_runs', 'api_data_transformed', 'api_field_mappings'];
  for (const collection of collections) {
    await db.collection(collection).deleteMany({});
  }
}

// Wait helper for async operations
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry helper for flaky tests
export async function retry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts <= 1) {
      throw error;
    }
    await wait(delay);
    return retry(fn, attempts - 1, delay);
  }
}