# Test Suite Documentation

## Tổng Quan

Bộ test suite toàn diện cho No-Code API Connector bao gồm Unit Tests, API Tests, Integration Tests, E2E Tests và Performance Tests.

## Cấu Trúc Test

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
├── e2e/                  # E2E tests (Playwright)
│   ├── connections.spec.ts
│   ├── runs.spec.ts
│   ├── mappings.spec.ts
│   └── dashboard.spec.ts
├── performance/          # Performance tests (k6)
│   └── api-load-test.js
└── factories/            # Test data factories
    └── index.ts
```

## Chạy Tests

### Chạy Tất Cả Tests

```bash
npm test
# hoặc
npm run test:all
```

### Chạy Tests Theo Loại

```bash
# Unit tests
npm run test:unit

# API tests
npm run test:api

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
npm run test:performance
```

### Chạy Tests với Coverage

```bash
npm run test:coverage
```

### Chạy Tests trong CI

```bash
npm run test:ci
```

## Thiết Lập Môi Trường

### Yêu Cầu

- Node.js 18+
- MongoDB (cho integration tests)
- Redis (cho caching tests)

### Cài Đặt Dependencies

```bash
npm install --legacy-peer-deps
```

### Cài Đặt Playwright Browsers

```bash
npm run playwright:install
```

### Cài Đặt k6 (cho performance tests)

```bash
# Windows (Chocolatey)
choco install k6

# macOS (Homebrew)
brew install k6

# Linux
sudo apt update
sudo apt install k6
```

## Cấu Hình Test

### Environment Variables

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/testdb
MONGODB_DB=testdb

# Redis
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=test
BASE_URL=http://localhost:3000
```

### Jest Configurations

- `jest.config.js` - Unit tests
- `jest.api.config.js` - API tests
- `jest.integration.config.js` - Integration tests

### Playwright Configuration

- `playwright.config.ts` - E2E test configuration

## Test Categories

### 1. Unit Tests

Test các function và class riêng lẻ:

```typescript
describe('DataTransformer', () => {
  test('should transform JSONPath correctly', () => {
    // test logic
  })
})
```

### 2. API Tests

Test REST API endpoints:

```typescript
describe('/api/connections', () => {
  test('should return connections list', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
  })
})
```

### 3. Integration Tests

Test luồng ETL hoàn chỉnh:

```typescript
describe('ETL Pipeline', () => {
  test('should execute complete workflow', async () => {
    const result = await orchestrator.executeWorkflow(workflowConfig)
    expect(result.success).toBe(true)
  })
})
```

### 4. E2E Tests

Test luồng người dùng hoàn chỉnh:

```typescript
test('should create new connection', async ({ page }) => {
  await page.goto('/connections')
  await page.click('text=New Connection')
  // ... test steps
})
```

### 5. Performance Tests

Test tải và hiệu năng:

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 }
  ]
}
```

## Test Data Management

### Test Factories

Sử dụng factories để tạo test data nhất quán:

```typescript
import { TestDataFactory } from '../factories'

const connection = TestDataFactory.createConnection({
  name: 'Test Connection'
})
```

### Database Seeding

```typescript
import { DatabaseSeeder } from '../seeders'

beforeEach(async () => {
  await DatabaseSeeder.clean()
  await DatabaseSeeder.seedConnections(5)
})
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run tests
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Best Practices

### Test Organization
- Một test chỉ test một functionality
- Tên test mô tả rõ hành vi
- Sử dụng AAA pattern (Arrange-Act-Assert)

### Test Data
- Sử dụng factories cho data nhất quán
- Cleanup sau mỗi test
- Data gần với production nhất có thể

### Performance
- Chạy tests song song khi có thể
- Mock external dependencies
- Selective testing trong CI/CD

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   ```bash
   # Ensure MongoDB is running
   brew services start mongodb/brew/mongodb-community
   ```

2. **Redis Connection Error**
   ```bash
   # Start Redis
   redis-server
   ```

3. **Port Conflicts**
   ```bash
   # Kill process on port 3000
   lsof -ti:3000 | xargs kill -9
   ```

4. **Playwright Browser Issues**
   ```bash
   # Reinstall browsers
   npx playwright install --force
   ```

### Debug Tests

```bash
# Run specific test file
npx jest test/unit/lib/data-transformer.test.ts

# Run with debug mode
npx jest --verbose

# Run E2E with UI
npx playwright test --headed
```

## Coverage Reports

Coverage reports được tạo trong `coverage/` directory:

- `coverage/lcov-report/index.html` - HTML report
- `coverage/lcov.info` - LCOV format cho CI/CD

## Performance Reports

Performance test results:

- `performance-report.json` - Detailed metrics
- Console output với summary statistics

---

**Version**: 1.0
**Last Updated**: October 20, 2025
**Test Frameworks**: Jest, Playwright, k6
**Coverage Target**: 80%