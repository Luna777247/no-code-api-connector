/**
 * Global setup for API route tests
 */

import { setupTestDatabase } from './setup'

module.exports = async () => {
  console.log('[API_TEST] Starting API test suite...')

  try {
    // Setup test database
    await setupTestDatabase()

    console.log('[API_TEST] Global setup completed')
  } catch (error) {
    console.error('[API_TEST] Global setup failed:', error)
    throw error
  }
}