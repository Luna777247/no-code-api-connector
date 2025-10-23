const { MongoMemoryServer } = require('mongodb-memory-server')

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/api-setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.test.config.js' }]
  },
  testMatch: [
    '<rootDir>/test/api/**/*.test.ts',
    '<rootDir>/test/api/**/*.test.js'
  ],
  collectCoverageFrom: [
    'app/api/**/*.ts',
    'lib/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage/api',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000
}