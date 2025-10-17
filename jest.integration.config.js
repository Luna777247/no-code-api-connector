module.exports = {
  testEnvironment: 'node', // Use node environment for integration tests
  setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
  testMatch: [
    '<rootDir>/test/integration/**/*.test.(ts|tsx)',
    '<rootDir>/test/integration/**/*.spec.(ts|tsx)'
  ],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage/integration',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(mongodb-memory-server|mongodb-memory-server-core|@mongodb-js)/)'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/scripts/',
    '<rootDir>/test/unit/', // Exclude unit tests
    '<rootDir>/test/e2e/' // Exclude e2e tests
  ],
  // Integration test specific settings
  testTimeout: 30000, // 30 second timeout for integration tests
  forceExit: true, // Force exit after tests complete
  detectOpenHandles: true, // Detect handles that prevent Jest from exiting
  // Setup and teardown
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/global-teardown.ts'
};