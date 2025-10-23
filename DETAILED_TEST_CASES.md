# Test Cases Chi Tiết - No-Code API Connector

## TC-CONN-001: Tạo Kết Nối API Mới

**Test Case ID**: TC-CONN-001
**Test Case Name**: Tạo kết nối API mới thành công
**Priority**: High
**Type**: Functional, E2E
**Preconditions**:
- User đã đăng nhập vào hệ thống
- Database connection đã được thiết lập
- API endpoint đích có thể truy cập

**Test Steps**:
1. Truy cập trang `/connections`
2. Click button "New Connection" hoặc "Create Connection"
3. Điền form với thông tin sau:
   - **Name**: "Test API Connection"
   - **Description**: "Connection for testing purposes"
   - **Base URL**: "https://jsonplaceholder.typicode.com"
   - **Method**: "GET"
   - **Authentication Type**: "None"
   - **Headers**: (optional)
   - **Table Name**: "api_test_data"
4. Click button "Test Connection"
5. Verify connection test result
6. Click button "Save" hoặc "Create Connection"

**Expected Results**:
- ✅ Connection được tạo thành công
- ✅ Redirect về trang connections list
- ✅ Connection hiển thị trong danh sách với status "Active"
- ✅ Toast notification hiển thị "Connection created successfully"
- ✅ Database record được tạo trong collection `api_metadata` với type "connection"

**Actual Results**:
- [ ] Pass
- [ ] Fail: [Mô tả lỗi]

**Test Data**:
```json
{
  "name": "Test API Connection",
  "apiConfig": {
    "baseUrl": "https://jsonplaceholder.typicode.com",
    "method": "GET"
  },
  "tableName": "api_test_data"
}
```

---

## TC-CONN-002: Test Kết Nối API

**Test Case ID**: TC-CONN-002
**Test Case Name**: Test kết nối API với các endpoint khác nhau
**Priority**: High
**Type**: Functional, API, E2E

**Test Scenarios**:

### Scenario 1: Valid Endpoint
**Steps**:
1. Tạo connection với endpoint: `https://jsonplaceholder.typicode.com/posts/1`
2. Click "Test Connection"

**Expected**: ✅ Success message với response preview

### Scenario 2: Invalid Endpoint
**Steps**:
1. Tạo connection với endpoint: `https://invalid-endpoint-12345.com/api`
2. Click "Test Connection"

**Expected**: ❌ Error message "Connection failed"

### Scenario 3: Endpoint với Authentication
**Steps**:
1. Tạo connection với endpoint yêu cầu auth
2. Set authentication type và credentials
3. Click "Test Connection"

**Expected**: ✅ Success với proper authentication

---

## TC-MAP-001: Tạo Field Mapping với JSONPath

**Test Case ID**: TC-MAP-001
**Test Case Name**: Tạo field mapping sử dụng JSONPath expressions
**Priority**: High
**Type**: Functional, E2E

**Preconditions**:
- Có connection đã được tạo
- Có sample data hoặc API response

**Test Steps**:
1. Truy cập trang `/mappings`
2. Click "New Mapping" hoặc "Create Mapping"
3. Select connection từ dropdown
4. Upload hoặc paste sample JSON:

```json
{
  "user": {
    "id": 123,
    "email": "test@example.com",
    "profile": {
      "name": "John Doe",
      "age": 30
    }
  },
  "data": {
    "items": [
      {"name": "Item 1", "price": 10.99},
      {"name": "Item 2", "price": 15.50}
    ]
  }
}
```

5. Tạo mappings:
   - Source: `$.user.id` → Target: `user_id` → Type: `number`
   - Source: `$.user.email` → Target: `email` → Type: `string`
   - Source: `$.user.profile.name` → Target: `full_name` → Type: `string`
   - Source: `$.data.items[*].name` → Target: `item_names` → Type: `string`
   - Source: `$.data.items[*].price` → Target: `item_prices` → Type: `number`

6. Click "Test Mapping"
7. Verify transformed data
8. Click "Save Mapping"

**Expected Results**:
- ✅ Mapping được tạo thành công
- ✅ JSONPath expressions được parse đúng
- ✅ Array notation `[*]` xử lý đúng
- ✅ Data types được convert chính xác
- ✅ Test transformation hiển thị kết quả đúng

---

## TC-RUN-001: Thực Thi Run Thủ Công

**Test Case ID**: TC-RUN-001
**Test Case Name**: Thực thi data run thủ công thành công
**Priority**: High
**Type**: Functional, E2E, Integration

**Preconditions**:
- Connection đã được tạo và test thành công
- Field mapping đã được cấu hình
- API endpoint trả về data hợp lệ

**Test Steps**:
1. Truy cập trang `/runs`
2. Click "New Run" hoặc "Execute Run"
3. Select connection từ dropdown
4. Select field mapping
5. Set parameters (nếu có):
   - Mode: List
   - Values: ["1", "2", "3"]
6. Click "Execute Run"
7. Monitor progress trên UI
8. Wait for completion
9. Check results và logs

**Expected Results**:
- ✅ Run được tạo với status "Running"
- ✅ Progress bar hiển thị real-time
- ✅ Status chuyển thành "Success" khi hoàn thành
- ✅ Records được tạo trong database
- ✅ Logs hiển thị chi tiết từng step
- ✅ Success metrics: total requests, successful requests, etc.

**Database Assertions**:
- Collection `api_data`: Có documents với type "run"
- Collection `api_data`: Có documents với type "transformed_data"
- Run metadata chứa thông tin chính xác

---

## TC-RUN-002: Run với List Parameters

**Test Case ID**: TC-RUN-002
**Test Case Name**: Thực thi run với List parameter mode
**Priority**: High
**Type**: Functional, Integration

**Test Steps**:
1. Tạo connection với endpoint: `https://jsonplaceholder.typicode.com/posts/{id}`
2. Set parameters:
   - Name: `id`
   - Mode: `List`
   - Values: `["1", "2", "3", "4", "5"]`
3. Execute run
4. Check results

**Expected Results**:
- ✅ 5 API calls được thực hiện (1 cho mỗi value)
- ✅ 5 records trong database
- ✅ Mỗi record có parameter `id` tương ứng
- ✅ Logs hiển thị từng API call

---

## TC-RUN-003: Run với Cartesian Parameters

**Test Case ID**: TC-RUN-003
**Test Case Name**: Thực thi run với Cartesian parameter mode
**Priority**: High
**Type**: Functional, Integration

**Test Steps**:
1. Tạo connection với endpoint: `https://api.example.com/data?category={category}&type={type}`
2. Set parameters:
   - Parameter 1: `category` = `["electronics", "books"]`
   - Parameter 2: `type` = `["new", "used"]`
   - Mode: `Cartesian`
3. Execute run

**Expected Results**:
- ✅ 4 API calls được thực hiện:
  - `category=electronics&type=new`
  - `category=electronics&type=used`
  - `category=books&type=new`
  - `category=books&type=used`
- ✅ 4 records trong database
- ✅ Mỗi combination được cover

---

## TC-SCHED-001: Tạo và Thực Thi Schedule

**Test Case ID**: TC-SCHED-001
**Test Case Name**: Tạo lịch trình CRON và verify execution
**Priority**: Medium
**Type**: Functional, E2E

**Test Steps**:
1. Truy cập trang `/schedules`
2. Click "New Schedule"
3. Điền thông tin:
   - Name: "Daily Data Sync"
   - Connection: Select existing connection
   - CRON Expression: `"0 9 * * *"` (9 AM daily)
   - Timezone: "UTC"
   - Enable: `true`
4. Click "Save Schedule"
5. Wait for scheduled time hoặc manually trigger
6. Check execution history

**Expected Results**:
- ✅ Schedule được tạo thành công
- ✅ Hiển thị trong schedules list
- ✅ Auto-executed tại đúng thời gian
- ✅ Execution history được ghi lại
- ✅ Có thể disable/enable schedule

---

## TC-EXPORT-001: Export Dữ Liệu

**Test Case ID**: TC-EXPORT-001
**Test Case Name**: Export dữ liệu theo định dạng CSV
**Priority**: Medium
**Type**: Functional, E2E

**Preconditions**:
- Có dữ liệu trong database từ runs thành công

**Test Steps**:
1. Truy cập trang `/data` hoặc `/runs`
2. Select records để export
3. Click "Export" → "CSV"
4. Set filters:
   - Date range: Last 7 days
   - Status: Success
   - Connection: Specific connection
5. Click "Download CSV"

**Expected Results**:
- ✅ File CSV được download
- ✅ File chứa headers đúng
- ✅ Data được format chính xác
- ✅ Filters được áp dụng
- ✅ File size hợp lý

**CSV Format Validation**:
```csv
id,user_id,email,full_name,item_names,item_prices,created_at
1,123,test@example.com,John Doe,"Item 1,Item 2","10.99,15.50",2025-10-20T10:00:00Z
```

---

## TC-UPLOAD-001: Upload File CSV

**Test Case ID**: TC-UPLOAD-001
**Test Case Name**: Upload và xử lý file CSV
**Priority**: Medium
**Type**: Functional, E2E

**Test Data**: Tạo file `test_data.csv`
```csv
id,name,email,age,city
1,John Doe,john@example.com,30,New York
2,Jane Smith,jane@example.com,25,Los Angeles
3,Bob Johnson,bob@example.com,35,Chicago
```

**Test Steps**:
1. Truy cập trang `/upload`
2. Click "Choose File" và select `test_data.csv`
3. Click "Upload"
4. Wait for processing
5. Check schema detection
6. Review và confirm mappings
7. Click "Process Data"

**Expected Results**:
- ✅ File upload thành công
- ✅ Schema detected: id(number), name(string), email(string), age(number), city(string)
- ✅ Preview data hiển thị đúng
- ✅ Data được insert vào database
- ✅ Success message với record count

---

## TC-MON-001: Dashboard Metrics

**Test Case ID**: TC-MON-001
**Test Case Name**: Verify dashboard hiển thị metrics chính xác
**Priority**: Medium
**Type**: Functional, E2E

**Preconditions**:
- Có một số connections, runs, schedules đã được tạo
- Một số runs thành công, một số thất bại

**Test Steps**:
1. Truy cập trang `/` (dashboard)
2. Verify các metrics:
   - Total Connections
   - Active Schedules
   - Recent Runs (Success/Failed)
   - Success Rate %
   - Data Volume
3. Click vào charts để drill-down
4. Check time ranges (Last 24h, 7 days, 30 days)

**Expected Results**:
- ✅ All metrics hiển thị
- ✅ Numbers chính xác (match database)
- ✅ Charts render đúng
- ✅ Drill-down hoạt động
- ✅ Real-time updates (nếu có)

---

## Performance Test Cases

## TC-PERF-001: API Response Time

**Test Case ID**: TC-PERF-001
**Test Case Name**: Verify API response time dưới threshold
**Priority**: High
**Type**: Performance

**Test Steps**:
1. Sử dụng tool JMeter hoặc k6
2. Load test các endpoints:
   - GET /api/connections
   - GET /api/runs
   - POST /api/runs (execute)
3. Với 50 concurrent users
4. Duration: 5 minutes

**Performance Criteria**:
- ✅ Average response time < 500ms
- ✅ 95th percentile < 1000ms
- ✅ Error rate < 1%
- ✅ Throughput > 100 requests/second

---

## TC-PERF-002: Large Data Processing

**Test Case ID**: TC-PERF-002
**Test Case Name**: Xử lý large dataset không gây memory issues
**Priority**: High
**Type**: Performance, Integration

**Test Steps**:
1. Upload CSV file với 100,000 records
2. Process data qua ETL pipeline
3. Monitor memory usage
4. Check processing time

**Performance Criteria**:
- ✅ Processing completes successfully
- ✅ Memory usage < 1GB
- ✅ Processing time < 10 minutes
- ✅ No memory leaks

---

## Error Handling Test Cases

## TC-ERROR-001: Network Timeout

**Test Case ID**: TC-ERROR-001
**Test Case Name**: Handle network timeout gracefully
**Priority**: High
**Type**: Error Handling, Integration

**Test Steps**:
1. Configure API endpoint với delay > 30 seconds
2. Execute run
3. Check error handling

**Expected Results**:
- ✅ Timeout error được catch
- ✅ Run status: "Failed"
- ✅ Error message logged
- ✅ Retry mechanism (nếu có)
- ✅ User notification

---

## TC-ERROR-002: Invalid JSON Response

**Test Case ID**: TC-ERROR-002
**Test Case Name**: Handle invalid JSON response từ API
**Priority**: Medium
**Type**: Error Handling, Functional

**Test Steps**:
1. Mock API trả về invalid JSON
2. Execute run
3. Check error handling

**Expected Results**:
- ✅ JSON parse error được catch
- ✅ Run status: "Failed"
- ✅ Detailed error message
- ✅ Data không được insert

---

## Security Test Cases

## TC-SEC-001: Input Validation

**Test Case ID**: TC-SEC-001
**Test Case Name**: Validate tất cả user inputs
**Priority**: High
**Type**: Security, Functional

**Test Vectors**:
- SQL injection: `'; DROP TABLE users; --`
- XSS: `<script>alert('xss')</script>`
- Path traversal: `../../../etc/passwd`
- Large inputs: 10MB string

**Expected Results**:
- ✅ All malicious inputs rejected
- ✅ Proper sanitization
- ✅ Error messages không expose system info

---

## Accessibility Test Cases

## TC-ACC-001: Keyboard Navigation

**Test Case ID**: TC-ACC-001
**Test Case Name**: Verify keyboard navigation hoạt động
**Priority**: Medium
**Type**: Accessibility, E2E

**Test Steps**:
1. Sử dụng chỉ keyboard (no mouse)
2. Navigate qua tất cả pages
3. Fill forms
4. Submit actions

**Expected Results**:
- ✅ All interactive elements focusable
- ✅ Logical tab order
- ✅ Keyboard shortcuts hoạt động
- ✅ Screen reader support

---

## Mobile Responsiveness Test Cases

## TC-MOBILE-001: Mobile Layout

**Test Case ID**: TC-MOBILE-001
**Test Case Name**: Verify mobile responsiveness
**Priority**: Medium
**Type**: UI, E2E

**Test Devices**:
- iPhone SE (375x667)
- iPhone 12 Pro (390x844)
- Samsung Galaxy S21 (360x800)
- iPad (768x1024)

**Test Steps**:
1. Resize browser window
2. Check layout adaptation
3. Test touch interactions
4. Verify readability

**Expected Results**:
- ✅ Layout adapts to screen size
- ✅ Touch targets ≥ 44px
- ✅ Text readable
- ✅ No horizontal scroll

---

## Test Automation Implementation

### Unit Test Example

```typescript
// lib/data-transformer.test.ts
import { DataTransformer } from '../lib/data-transformer'

describe('DataTransformer', () => {
  const transformer = new DataTransformer()

  test('transforms simple JSONPath', () => {
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

  test('transforms array notation', () => {
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
})
```

### E2E Test Example

```typescript
// test/e2e/connections.spec.ts
import { test, expect } from '@playwright/test'

test('create new connection', async ({ page }) => {
  await page.goto('/connections')

  await page.click('text=New Connection')

  await page.fill('[name="name"]', 'Test API Connection')
  await page.fill('[name="baseUrl"]', 'https://jsonplaceholder.typicode.com')
  await page.selectOption('[name="method"]', 'GET')

  await page.click('text=Test Connection')
  await page.waitForSelector('text=Connection successful')

  await page.click('text=Save')

  await expect(page).toHaveURL(/\/connections$/)
  await expect(page.locator('text=Test API Connection')).toBeVisible()
})
```

---

## Test Execution Checklist

### Pre-Execution
- [ ] Test environment setup complete
- [ ] Test data prepared
- [ ] Mock services running
- [ ] Database clean state
- [ ] All dependencies installed

### Execution
- [ ] Unit tests passing
- [ ] API tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tests within thresholds
- [ ] Security tests passing

### Post-Execution
- [ ] Test reports generated
- [ ] Coverage reports reviewed
- [ ] Bugs documented và assigned
- [ ] Test data cleaned up
- [ ] Environment restored

---

**Template Version**: 1.0
**Last Updated**: October 20, 2025
**Total Test Cases**: 25+
**Estimated Execution Time**: 4-6 hours
**Automation Coverage**: 80%