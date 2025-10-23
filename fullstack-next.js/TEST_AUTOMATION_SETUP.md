# Hướng Dẫn Thiết Lập Automation Testing

## Tổng Quan

Hướng dẫn này mô tả cách thiết lập và chạy automated tests cho No-Code API Connector project.

## Cấu Trúc Test Directory

```
test/
├── unit/                 # Unit tests (Jest)
│   ├── lib/
│   ├── components/
│   └── utils/
├── api/                  # API tests (Jest + Supertest)
│   ├── connections.test.ts
│   ├── runs.test.ts
│   └── mappings.test.ts
├── integration/          # Integration tests
│   ├── etl-pipeline.test.ts
│   └── data-flow.test.ts
└── e2e/                  # E2E tests (Playwright)
    ├── connections.spec.ts
    ├── runs.spec.ts
    ├── mappings.spec.ts
    └── dashboard.spec.ts
```

## 1. Unit Testing Setup

### Jest Configuration

Tạo file `jest.config.js`:

```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Setup File

Tạo file `test/setup.ts`:

```typescript
import { jest } from '@jest/globals'

// Mock MongoDB
jest.mock('@/lib/mongo', () => ({
  getDb: jest.fn(() => ({
    collection: jest.fn(() => ({
      find: jest.fn(() => ({
        toArray: jest.fn(() => [])
      })),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn()
    }))
  }))
}))

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn()
  }))
})
```

### Unit Test Example

```typescript
// test/unit/lib/data-transformer.test.ts
import { DataTransformer } from '@/lib/data-transformer'

describe('DataTransformer', () => {
  let transformer: DataTransformer

  beforeEach(() => {
    transformer = new DataTransformer()
  })

  describe('transform', () => {
    test('should transform simple JSONPath', () => {
      const data = { user: { id: 123, email: 'test@example.com' } }
      const mappings = [
        { sourcePath: '$.user.id', targetField: 'user_id', dataType: 'number' },
        { sourcePath: '$.user.email', targetField: 'email', dataType: 'string' }
      ]

      const result = transformer.transform(data, mappings)

      expect(result).toEqual({
        user_id: 123,
        email: 'test@example.com'
      })
    })

    test('should handle array notation', () => {
      const data = {
        items: [
          { name: 'Item 1', price: 10.99 },
          { name: 'Item 2', price: 15.50 }
        ]
      }
      const mappings = [
        { sourcePath: '$.items[*].name', targetField: 'names', dataType: 'string' }
      ]

      const result = transformer.transform(data, mappings)

      expect(result.names).toBe('Item 1,Item 2')
    })

    test('should handle missing data gracefully', () => {
      const data = { user: { id: 123 } }
      const mappings = [
        { sourcePath: '$.user.email', targetField: 'email', dataType: 'string' }
      ]

      const result = transformer.transform(data, mappings)

      expect(result.email).toBeNull()
    })
  })

  describe('validateSchema', () => {
    test('should validate correct data types', () => {
      const data = { id: 123, email: 'test@example.com' }
      const mappings = [
        { sourcePath: '$.id', targetField: 'id', dataType: 'number' },
        { sourcePath: '$.email', targetField: 'email', dataType: 'string' }
      ]

      const isValid = transformer.validateSchema(data, mappings)

      expect(isValid).toBe(true)
    })

    test('should reject invalid data types', () => {
      const data = { id: '123', email: 'test@example.com' }
      const mappings = [
        { sourcePath: '$.id', targetField: 'id', dataType: 'number' }
      ]

      const isValid = transformer.validateSchema(data, mappings)

      expect(isValid).toBe(false)
    })
  })
})
```

## 2. API Testing Setup

### API Test Configuration

Tạo file `jest.api.config.js`:

```javascript
const { MongoMemoryServer } = require('mongodb-memory-server')

module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/api-setup.ts'],
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts'
}
```

### API Setup File

Tạo file `test/api-setup.ts`:

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server'
import { MongoClient } from 'mongodb'

let mongoServer: MongoMemoryServer
let mongoClient: MongoClient

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create()
  const mongoUri = mongoServer.getUri()

  mongoClient = new MongoClient(mongoUri)
  await mongoClient.connect()

  // Set environment variables
  process.env.MONGODB_URI = mongoUri
  process.env.MONGODB_DB = 'testdb'
})

afterAll(async () => {
  await mongoClient.close()
  await mongoServer.stop()
})
```

### API Test Example

```typescript
// test/api/connections.test.ts
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/connections/route'

describe('/api/connections', () => {
  describe('GET', () => {
    test('should return empty array when no connections', async () => {
      const request = new NextRequest('http://localhost:3000/api/connections')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    test('should return connections list', async () => {
      // Insert test data first
      const db = await getDb()
      await db.collection('api_metadata').insertOne({
        type: 'connection',
        _insertedAt: new Date().toISOString(),
        connectionData: {
          name: 'Test Connection',
          apiConfig: {
            baseUrl: 'https://api.example.com',
            method: 'GET'
          }
        }
      })

      const request = new NextRequest('http://localhost:3000/api/connections')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Test Connection')
    })
  })

  describe('POST', () => {
    test('should create new connection', async () => {
      const connectionData = {
        name: 'New Test Connection',
        baseUrl: 'https://jsonplaceholder.typicode.com',
        method: 'GET'
      }

      const request = new NextRequest('http://localhost:3000/api/connections', {
        method: 'POST',
        body: JSON.stringify(connectionData),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('New Test Connection')
    })

    test('should validate required fields', async () => {
      const invalidData = {
        name: ''
      }

      const request = new NextRequest('http://localhost:3000/api/connections', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'content-type': 'application/json'
        }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
```

## 3. E2E Testing Setup

### Playwright Configuration

File `playwright.config.ts` đã có sẵn. Thêm authentication setup:

```typescript
// test/e2e/auth.setup.ts
import { test as setup } from '@playwright/test'

setup('authenticate', async ({ page }) => {
  // Perform authentication steps
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('text=Sign In')

  // Save authentication state
  await page.context().storageState({ path: 'test/e2e/.auth/user.json' })
})
```

### E2E Test Example

```typescript
// test/e2e/connections.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Connections Management', () => {
  test.beforeEach(async ({ page }) => {
    // Load authentication state
    await page.context().addCookies([
      // Add authentication cookies if needed
    ])
  })

  test('should create new connection', async ({ page }) => {
    await page.goto('/connections')

    // Click create button
    await page.click('text=New Connection')

    // Fill form
    await page.fill('[name="name"]', 'E2E Test Connection')
    await page.fill('[name="baseUrl"]', 'https://jsonplaceholder.typicode.com')
    await page.selectOption('[name="method"]', 'GET')

    // Test connection
    await page.click('text=Test Connection')
    await page.waitForSelector('text=Connection successful')

    // Save connection
    await page.click('text=Save')

    // Verify redirect and success
    await expect(page).toHaveURL(/\/connections$/)
    await expect(page.locator('text=E2E Test Connection')).toBeVisible()
  })

  test('should edit existing connection', async ({ page }) => {
    await page.goto('/connections')

    // Click on existing connection
    await page.click('text=Test Connection')

    // Click edit button
    await page.click('text=Edit')

    // Modify name
    await page.fill('[name="name"]', 'Updated Test Connection')

    // Save changes
    await page.click('text=Save Changes')

    // Verify update
    await expect(page.locator('text=Updated Test Connection')).toBeVisible()
  })

  test('should delete connection', async ({ page }) => {
    await page.goto('/connections')

    // Click delete button
    await page.click('[data-testid="delete-connection"]')

    // Confirm deletion
    await page.click('text=Delete')

    // Verify connection removed
    await expect(page.locator('text=Test Connection')).not.toBeVisible()
  })
})
```

## 4. Integration Testing Setup

### ETL Pipeline Test

```typescript
// test/integration/etl-pipeline.test.ts
import { WorkflowOrchestrator } from '@/lib/workflow-orchestrator'
import { getDb } from '@/lib/mongo'

describe('ETL Pipeline Integration', () => {
  let db: any

  beforeAll(async () => {
    db = await getDb()
  })

  beforeEach(async () => {
    // Clean up test data
    await db.collection('api_data').deleteMany({ type: { $in: ['run', 'transformed_data'] } })
    await db.collection('api_metadata').deleteMany({ type: 'connection' })
  })

  test('should execute complete ETL pipeline', async () => {
    // Create test connection
    const connectionId = 'test-conn-123'
    await db.collection('api_metadata').insertOne({
      type: 'connection',
      _id: connectionId,
      connectionData: {
        name: 'Test Connection',
        apiConfig: {
          baseUrl: 'https://jsonplaceholder.typicode.com',
          method: 'GET'
        }
      }
    })

    // Create test mapping
    const fieldMappings = [
      { sourcePath: '$.id', targetField: 'post_id', dataType: 'number' },
      { sourcePath: '$.title', targetField: 'title', dataType: 'string' }
    ]

    // Execute workflow
    const orchestrator = new WorkflowOrchestrator()
    const result = await orchestrator.executeWorkflow({
      connectionId,
      apiConfig: {
        baseUrl: 'https://jsonplaceholder.typicode.com/posts/1',
        method: 'GET'
      },
      fieldMappings,
      parameters: []
    })

    // Verify results
    expect(result.success).toBe(true)
    expect(result.recordsProcessed).toBeGreaterThan(0)

    // Check database
    const runs = await db.collection('api_data').find({ type: 'run' }).toArray()
    const transformedData = await db.collection('api_data').find({ type: 'transformed_data' }).toArray()

    expect(runs).toHaveLength(1)
    expect(transformedData).toHaveLength(1)
    expect(transformedData[0].data.post_id).toBe(1)
  })

  test('should handle API failures gracefully', async () => {
    const orchestrator = new WorkflowOrchestrator()
    const result = await orchestrator.executeWorkflow({
      connectionId: 'invalid-conn',
      apiConfig: {
        baseUrl: 'https://invalid-endpoint-12345.com',
        method: 'GET'
      },
      fieldMappings: [],
      parameters: []
    })

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
```

## 5. Performance Testing Setup

### K6 Configuration

Tạo file `test/performance/api-load-test.js`:

```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '2m', target: 200 }, // Ramp up to 200 users over 2 minutes
    { duration: '5m', target: 200 }, // Stay at 200 users for 5 minutes
    { duration: '2m', target: 0 },   // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Test connections API
  const connectionsResponse = http.get(`${BASE_URL}/api/connections`)
  check(connectionsResponse, {
    'connections status is 200': (r) => r.status === 200,
    'connections response time < 500ms': (r) => r.timings.duration < 500,
  })

  // Test runs API with pagination
  const runsResponse = http.get(`${BASE_URL}/api/runs?page=1&limit=20`)
  check(runsResponse, {
    'runs status is 200': (r) => r.status === 200,
    'runs response time < 1000ms': (r) => r.timings.duration < 1000,
  })

  sleep(1)
}
```

## 6. CI/CD Integration

### GitHub Actions Workflow

Tạo file `.github/workflows/test.yml`:

```yaml
name: Test Suite
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:5.0
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm install --legacy-peer-deps

      - name: Run unit tests
        run: npm run test:unit

      - name: Run API tests
        run: npm run test:api
        env:
          MONGODB_URI: mongodb://localhost:27017/testdb

      - name: Run integration tests
        run: npm run test:integration
        env:
          MONGODB_URI: mongodb://localhost:27017/testdb
          REDIS_URL: redis://localhost:6379

      - name: Build application
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          BASE_URL: http://localhost:3000

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  performance:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Run performance tests
        uses: grafana/k6-action@v0.2.0
        with:
          filename: test/performance/api-load-test.js
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
```

## 7. Test Data Management

### Test Data Factory

```typescript
// test/factories/index.ts
export class TestDataFactory {
  static createConnection(overrides = {}) {
    return {
      name: 'Test Connection',
      baseUrl: 'https://jsonplaceholder.typicode.com',
      method: 'GET',
      authentication: 'none',
      ...overrides
    }
  }

  static createFieldMapping(overrides = {}) {
    return {
      sourcePath: '$.id',
      targetField: 'id',
      dataType: 'number',
      ...overrides
    }
  }

  static createRun(overrides = {}) {
    return {
      connectionId: 'test-conn-123',
      status: 'success',
      totalRequests: 1,
      successfulRequests: 1,
      recordsExtracted: 1,
      recordsLoaded: 1,
      duration: 1000,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      ...overrides
    }
  }
}
```

### Database Seeding

```typescript
// test/seeders/database-seeder.ts
import { getDb } from '@/lib/mongo'
import { TestDataFactory } from '../factories'

export class DatabaseSeeder {
  static async seedConnections(count = 5) {
    const db = await getDb()
    const connections = []

    for (let i = 0; i < count; i++) {
      connections.push({
        type: 'connection',
        _insertedAt: new Date().toISOString(),
        connectionData: TestDataFactory.createConnection({
          name: `Test Connection ${i + 1}`
        })
      })
    }

    await db.collection('api_metadata').insertMany(connections)
    return connections
  }

  static async seedRuns(count = 10) {
    const db = await getDb()
    const runs = []

    for (let i = 0; i < count; i++) {
      runs.push({
        type: 'run',
        _insertedAt: new Date().toISOString(),
        connectionId: `conn-${i + 1}`,
        runMetadata: TestDataFactory.createRun()
      })
    }

    await db.collection('api_data').insertMany(runs)
    return runs
  }

  static async clean() {
    const db = await getDb()
    await db.collection('api_data').deleteMany({})
    await db.collection('api_metadata').deleteMany({})
    await db.collection('api_uploads').deleteMany({})
  }
}
```

## 8. Test Reporting & Monitoring

### Coverage Reporting

```json
// package.json scripts
{
  "scripts": {
    "test:coverage": "jest --coverage --coverageDirectory=coverage",
    "test:coverage:report": "nyc report --reporter=html",
    "test:badge": "jest-coverage-badges --output ./badges"
  }
}
```

### Test Results Dashboard

Sử dụng tools như:
- Jest HTML Reporter
- Allure Framework
- TestRail hoặc Zephyr cho test management
- Slack/Discord notifications cho CI/CD

## 9. Best Practices

### Test Organization
- **One concept per test**: Mỗi test chỉ test một functionality
- **Descriptive test names**: Tên test mô tả rõ hành vi được test
- **Arrange-Act-Assert pattern**: Structure tests clearly
- **Independent tests**: Tests không phụ thuộc lẫn nhau

### Test Data Management
- **Consistent test data**: Sử dụng factories để tạo data nhất quán
- **Cleanup after tests**: Đảm bảo tests không ảnh hưởng lẫn nhau
- **Realistic data**: Sử dụng data gần với production nhất có thể

### Performance Considerations
- **Parallel execution**: Chạy tests song song khi có thể
- **Selective testing**: Chỉ chạy tests liên quan trong CI/CD
- **Mock external dependencies**: Giảm thời gian và tăng reliability

### Maintenance
- **Regular review**: Review và update tests định kỳ
- **Refactor tests**: Cải thiện test code quality
- **Update with code changes**: Sync tests với code changes

---

## Chạy Tests

```bash
# Chạy tất cả tests
npm test

# Chạy unit tests
npm run test:unit

# Chạy API tests
npm run test:api

# Chạy integration tests
npm run test:integration

# Chạy E2E tests
npm run test:e2e

# Chạy với coverage
npm run test:coverage

# Chạy performance tests
k6 run test/performance/api-load-test.js
```

---

**Version**: 1.0
**Last Updated**: October 20, 2025
**Test Frameworks**: Jest, Playwright, K6
**Coverage Target**: 80%
**CI/CD**: GitHub Actions