import { MongoClient } from 'mongodb';
// import { cacheManager } from '@/lib/redis-cache'; // Temporarily disabled for integration tests

// Integration test database configuration
export const TEST_DB_CONFIG = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  dbName: 'test_no_code_api_connector_integration',
  collections: {
    api_runs: 'api_runs',
    api_data_transformed: 'api_data_transformed',
    api_connections: 'api_connections',
    api_places: 'api_places',
    audit_logs: 'audit_logs',
    lineage_tracking: 'lineage_tracking'
  }
};

// Global test database client
let testClient: MongoClient | null = null;

/**
 * Setup integration test database
 * Creates a fresh test database for each test run
 */
export async function setupIntegrationTestDb() {
  try {
    testClient = new MongoClient(TEST_DB_CONFIG.uri);
    await testClient.connect();

    const db = testClient.db(TEST_DB_CONFIG.dbName);

    // Clean up any existing data
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).drop();
    }

    console.log(`[INTEGRATION] Test database ${TEST_DB_CONFIG.dbName} initialized`);
    return db;
  } catch (error) {
    console.error('[INTEGRATION] Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Cleanup integration test database
 * Drops the test database and closes connections
 */
export async function cleanupIntegrationTestDb() {
  try {
    if (testClient) {
      const db = testClient.db(TEST_DB_CONFIG.dbName);
      await db.dropDatabase();
      await testClient.close();
      testClient = null;
      console.log(`[INTEGRATION] Test database ${TEST_DB_CONFIG.dbName} cleaned up`);
    }
  } catch (error) {
    console.error('[INTEGRATION] Failed to cleanup test database:', error);
  }
}

/**
 * Clear cache for integration tests
 */
export async function clearIntegrationCache() {
  try {
    // await cacheManager.clear(); // Temporarily disabled
    console.log('[INTEGRATION] Cache clearing skipped (Redis not available in integration tests)');
  } catch (error) {
    console.error('[INTEGRATION] Failed to clear cache:', error);
  }
}

/**
 * Setup function for integration tests
 * Should be called before each integration test
 */
export async function setupIntegrationTest() {
  await setupIntegrationTestDb();
  await clearIntegrationCache();
}

/**
 * Teardown function for integration tests
 * Should be called after each integration test
 */
export async function teardownIntegrationTest() {
  await cleanupIntegrationTestDb();
  await clearIntegrationCache();
}

/**
 * Get test database instance
 */
export function getTestDb() {
  if (!testClient) {
    throw new Error('Test database not initialized. Call setupIntegrationTestDb() first.');
  }
  return testClient.db(TEST_DB_CONFIG.dbName);
}