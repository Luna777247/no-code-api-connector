import { cleanupIntegrationTestDb } from './setup';

/**
 * Global teardown for integration tests
 * Runs once after all integration tests
 */
export default async function globalTeardown() {
  console.log('[INTEGRATION] Finishing integration test suite...');

  try {
    // Cleanup test database
    await cleanupIntegrationTestDb();
    console.log('[INTEGRATION] Global teardown completed');
  } catch (error) {
    console.error('[INTEGRATION] Global teardown failed:', error);
    throw error;
  }
}