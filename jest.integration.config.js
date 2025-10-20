module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/integration-setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { configFile: './babel.test.config.js' }]
  },
  testMatch: [
    '<rootDir>/test/integration/**/*.test.ts',
    '<rootDir>/test/integration/**/*.test.js'
  ],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000
}