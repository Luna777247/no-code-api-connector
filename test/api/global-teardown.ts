/**
 * Global teardown for API route tests
 */

import { cleanupTestDatabase } from './setup'

module.exports = async () => {
  console.log('[API_TEST] Finishing API test suite...')

  try {
    // Cleanup test database
    await cleanupTestDatabase()

    console.log('[API_TEST] Global teardown completed')
  } catch (error) {
    console.error('[API_TEST] Global teardown failed:', error)
    throw error
  }
}