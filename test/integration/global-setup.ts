import { setupIntegrationTestDb } from './setup';

/**
 * Global setup for integration tests
 * Runs once before all integration tests
 */
export default async function globalSetup() {
  console.log('[INTEGRATION] Starting integration test suite...');

  try {
    // Setup test database
    await setupIntegrationTestDb();
    console.log('[INTEGRATION] Global setup completed');
  } catch (error) {
    console.error('[INTEGRATION] Global setup failed:', error);
    throw error;
  }
}