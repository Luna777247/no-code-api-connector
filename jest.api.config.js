/**
 * Jest configuration for API route tests
 * Tests Next.js API routes with proper Node.js environment
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/test/api/**/*.test.ts'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/test/api/setup.ts'
  ],
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts'
  ],
  coverageDirectory: 'coverage/api',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  // Transform TypeScript files
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  // Ignore Next.js build output
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  // Global setup and teardown
  globalSetup: '<rootDir>/test/api/global-setup.ts',
  globalTeardown: '<rootDir>/test/api/global-teardown.ts'
}