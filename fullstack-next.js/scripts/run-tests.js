#!/usr/bin/env node

/**
 * Test Execution Script for No-Code API Connector
 * Runs comprehensive test suite with proper setup and teardown
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class TestRunner {
  constructor() {
    this.startTime = Date.now()
    this.results = {
      unit: { status: 'pending', duration: 0, output: '' },
      api: { status: 'pending', duration: 0, output: '' },
      integration: { status: 'pending', duration: 0, output: '' },
      e2e: { status: 'pending', duration: 0, output: '' },
      performance: { status: 'pending', duration: 0, output: '' }
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    }
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const child = spawn(command, args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true,
        ...options
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      child.on('close', (code) => {
        const duration = Date.now() - startTime
        const result = {
          code,
          stdout,
          stderr,
          duration,
          success: code === 0
        }
        resolve(result)
      })

      child.on('error', (error) => {
        reject(error)
      })
    })
  }

  async setupEnvironment() {
    this.log('Setting up test environment...')

    try {
      // Install dependencies if needed
      if (!fs.existsSync('node_modules')) {
        this.log('Installing dependencies...')
        await this.runCommand('npm', ['install', '--legacy-peer-deps'])
      }

      // Create test directories
      const testDirs = ['test/unit', 'test/api', 'test/integration', 'test/e2e', 'test/performance']
      testDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
      })

      // Setup environment variables for testing
      process.env.NODE_ENV = 'test'
      process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/testdb'
      process.env.MONGODB_DB = 'testdb'
      process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

      this.log('Environment setup complete', 'success')
    } catch (error) {
      this.log(`Environment setup failed: ${error.message}`, 'error')
      throw error
    }
  }

  async runUnitTests() {
    this.log('Running unit tests...')
    const startTime = Date.now()

    try {
      const result = await this.runCommand('npx', ['jest', '--testPathPatterns', 'test/unit'])

      this.results.unit = {
        status: result.success ? 'passed' : 'failed',
        duration: result.duration,
        output: result.stdout + result.stderr
      }

      if (result.success) {
        this.log(`Unit tests passed in ${result.duration}ms`, 'success')
      } else {
        this.log(`Unit tests failed in ${result.duration}ms`, 'error')
      }
    } catch (error) {
      this.results.unit = {
        status: 'error',
        duration: Date.now() - startTime,
        output: error.message
      }
      this.log(`Unit tests error: ${error.message}`, 'error')
    }
  }

  async runApiTests() {
    this.log('Running API tests...')
    const startTime = Date.now()

    try {
      const result = await this.runCommand('npx', ['jest', '--config', 'jest.api.config.js'])

      this.results.api = {
        status: result.success ? 'passed' : 'failed',
        duration: result.duration,
        output: result.stdout + result.stderr
      }

      if (result.success) {
        this.log(`API tests passed in ${result.duration}ms`, 'success')
      } else {
        this.log(`API tests failed in ${result.duration}ms`, 'error')
      }
    } catch (error) {
      this.results.api = {
        status: 'error',
        duration: Date.now() - startTime,
        output: error.message
      }
      this.log(`API tests error: ${error.message}`, 'error')
    }
  }

  async runIntegrationTests() {
    this.log('Running integration tests...')
    const startTime = Date.now()

    try {
      const result = await this.runCommand('npx', ['jest', '--config', 'jest.integration.config.js'])

      this.results.integration = {
        status: result.success ? 'passed' : 'failed',
        duration: result.duration,
        output: result.stdout + result.stderr
      }

      if (result.success) {
        this.log(`Integration tests passed in ${result.duration}ms`, 'success')
      } else {
        this.log(`Integration tests failed in ${result.duration}ms`, 'error')
      }
    } catch (error) {
      this.results.integration = {
        status: 'error',
        duration: Date.now() - startTime,
        output: error.message
      }
      this.log(`Integration tests error: ${error.message}`, 'error')
    }
  }

  async runE2ETests() {
    this.log('Running E2E tests...')
    const startTime = Date.now()

    try {
      // Start the application in background for E2E tests
      this.log('Starting application for E2E tests...')
      const appProcess = spawn('npm', ['run', 'dev'], {
        detached: true,
        stdio: 'ignore'
      })

      // Wait for app to start
      await new Promise(resolve => setTimeout(resolve, 10000))

      const result = await this.runCommand('npx', ['playwright', 'test'])

      // Kill the app process
      process.kill(-appProcess.pid)

      this.results.e2e = {
        status: result.success ? 'passed' : 'failed',
        duration: result.duration,
        output: result.stdout + result.stderr
      }

      if (result.success) {
        this.log(`E2E tests passed in ${result.duration}ms`, 'success')
      } else {
        this.log(`E2E tests failed in ${result.duration}ms`, 'error')
      }
    } catch (error) {
      this.results.e2e = {
        status: 'error',
        duration: Date.now() - startTime,
        output: error.message
      }
      this.log(`E2E tests error: ${error.message}`, 'error')
    }
  }

  async runPerformanceTests() {
    this.log('Running performance tests...')
    const startTime = Date.now()

    try {
      // Check if k6 is installed
      await this.runCommand('k6', ['version'])

      const result = await this.runCommand('k6', ['run', 'test/performance/api-load-test.js'])

      this.results.performance = {
        status: result.success ? 'passed' : 'failed',
        duration: result.duration,
        output: result.stdout + result.stderr
      }

      if (result.success) {
        this.log(`Performance tests passed in ${result.duration}ms`, 'success')
      } else {
        this.log(`Performance tests failed in ${result.duration}ms`, 'error')
      }
    } catch (error) {
      this.results.performance = {
        status: 'skipped',
        duration: Date.now() - startTime,
        output: 'k6 not installed or performance tests not configured'
      }
      this.log('Performance tests skipped (k6 not available)', 'warning')
    }
  }

  generateReport() {
    const totalDuration = Date.now() - this.startTime
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      summary: {
        total: Object.keys(this.results).length,
        passed: Object.values(this.results).filter(r => r.status === 'passed').length,
        failed: Object.values(this.results).filter(r => r.status === 'failed').length,
        error: Object.values(this.results).filter(r => r.status === 'error').length,
        skipped: Object.values(this.results).filter(r => r.status === 'skipped').length
      },
      results: this.results
    }

    // Save detailed report
    const reportPath = `test-results-${new Date().toISOString().split('T')[0]}.json`
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('TEST EXECUTION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    console.log(`Tests Passed: ${report.summary.passed}`)
    console.log(`Tests Failed: ${report.summary.failed}`)
    console.log(`Tests Error: ${report.summary.error}`)
    console.log(`Tests Skipped: ${report.summary.skipped}`)
    console.log(`\nDetailed report saved to: ${reportPath}`)
    console.log('='.repeat(60))

    return report
  }

  async runAllTests() {
    try {
      await this.setupEnvironment()

      // Run tests in sequence (can be parallelized if needed)
      await this.runUnitTests()
      await this.runApiTests()
      await this.runIntegrationTests()
      await this.runE2ETests()
      await this.runPerformanceTests()

      const report = this.generateReport()

      // Exit with appropriate code
      const hasFailures = report.summary.failed > 0 || report.summary.error > 0
      process.exit(hasFailures ? 1 : 0)

    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error')
      process.exit(1)
    }
  }

  async runSpecificTest(type) {
    await this.setupEnvironment()

    switch (type) {
      case 'unit':
        await this.runUnitTests()
        break
      case 'api':
        await this.runApiTests()
        break
      case 'integration':
        await this.runIntegrationTests()
        break
      case 'e2e':
        await this.runE2ETests()
        break
      case 'performance':
        await this.runPerformanceTests()
        break
      default:
        this.log(`Unknown test type: ${type}`, 'error')
        process.exit(1)
    }

    this.generateReport()
  }
}

// CLI interface
const args = process.argv.slice(2)
const testType = args[0]

const runner = new TestRunner()

if (testType && ['unit', 'api', 'integration', 'e2e', 'performance'].includes(testType)) {
  runner.runSpecificTest(testType)
} else {
  runner.runAllTests()
}