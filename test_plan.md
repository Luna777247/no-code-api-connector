# Kế Hoạch Kiểm Thử Tính Năng - No-Code API Connector

## Tổng Quan Dự Án

**No-Code API Connector** là một nền tảng ETL/data platform cho phép kết nối với bất kỳ API nào mà không cần viết code. Hệ thống hỗ trợ cấu hình endpoints, tham số, lịch trình và tự động trích xuất dữ liệu vào cơ sở dữ liệu.

## Phạm Vi Kiểm Thử

### 1. Các Tính Năng Chính

#### 1.1 Quản Lý Kết Nối API (API Connections)
- Tạo kết nối API mới
- Chỉnh sửa kết nối hiện có
- Xóa kết nối
- Test kết nối API
- Hiển thị danh sách kết nối
- Lọc và tìm kiếm kết nối

#### 1.2 Ánh Xạ Trường (Field Mappings)
- Tạo ánh xạ trường mới
- Chỉnh sửa ánh xạ hiện có
- Xóa ánh xạ
- JSONPath mapping
- Kiểm tra schema tự động
- Preview dữ liệu mẫu

#### 1.3 Chạy Dữ Liệu (Data Runs/Executions)
- Thực thi API run thủ công
- Giám sát tiến trình chạy
- Xem chi tiết kết quả chạy
- Lọc và tìm kiếm runs
- Xem logs chi tiết
- Retry failed runs

#### 1.4 Lịch Trình (Scheduling)
- Tạo lịch trình mới (CRON)
- Chỉnh sửa lịch trình
- Xóa lịch trình
- Enable/disable lịch trình
- Giám sát lịch trình đang chạy

#### 1.5 Giám Sát và Dashboard
- Dashboard tổng quan
- Metrics hiệu suất
- Health monitoring
- Circuit breakers
- Success rate tracking

#### 1.6 Xuất Dữ Liệu (Data Export)
- Export dữ liệu theo định dạng CSV/JSON
- Lọc dữ liệu xuất
- Download files

#### 1.7 Phân Tích (Analytics)
- Analytics về connections
- Analytics về runs
- Analytics về schedules
- Success rate history
- Performance metrics

#### 1.8 Upload File
- Upload file CSV/JSON/Excel
- Xử lý dữ liệu upload
- Schema detection
- Data validation

#### 1.9 Places/Geocoding
- Places API integration
- Geocoding services
- Data normalization

### 2. Các Chế Độ Tham Số (Parameter Modes)

#### 2.1 List Mode
- Execute API cho mỗi giá trị trong list
- Validate số lượng API calls

#### 2.2 Cartesian Mode
- Generate tất cả combinations của multiple parameters
- Validate số lượng combinations

#### 2.3 Template Mode
- Dynamic templates với variables
- Variable substitution

#### 2.4 Dynamic Mode
- Date range generation
- Incremental ID generation

## Chiến Lược Kiểm Thử

### 1. Kiểm Thử Đơn Vị (Unit Testing)
- **Framework**: Jest + jsdom
- **Coverage Target**: 80%+
- **Focus Areas**:
  - Business logic (lib/)
  - Data transformation
  - Parameter generation
  - API execution
  - Validation logic

### 2. Kiểm Thử API (API Testing)
- **Framework**: Jest với config riêng
- **Database**: MongoDB Memory Server
- **Test Types**:
  - CRUD operations cho tất cả entities
  - Error handling
  - Authentication/Authorization
  - Data validation
  - Pagination và filtering

### 3. Kiểm Thử Tích Hợp (Integration Testing)
- **Database**: Real MongoDB instance
- **Test Types**:
  - Full ETL pipeline
  - Cross-service communication
  - Data consistency
  - Performance under load

### 4. Kiểm Thử E2E (End-to-End Testing)
- **Framework**: Playwright
- **Browsers**: Chrome, Firefox, Safari, Mobile
- **Test Types**:
  - User workflows
  - Critical user journeys
  - Cross-browser compatibility
  - Mobile responsiveness

### 5. Kiểm Thử Hiệu Suất (Performance Testing)
- **Tools**: k6 hoặc Artillery
- **Scenarios**:
  - API response times
  - Concurrent users
  - Large data processing
  - Memory usage

## Test Cases Chi Tiết

### 1. API Connections Management

#### TC-CONN-001: Tạo kết nối API mới
**Priority**: High
**Type**: Functional, E2E
**Preconditions**:
- User đã đăng nhập
- Đã có API endpoint hợp lệ

**Steps**:
1. Truy cập trang Connections
2. Click "New Connection"
3. Điền thông tin:
   - Name: "Test API Connection"
   - Base URL: "https://jsonplaceholder.typicode.com"
   - Method: GET
   - Authentication: None
4. Click "Test Connection"
5. Click "Save"

**Expected Results**:
- Connection được tạo thành công
- Hiển thị trong danh sách connections
- Status: Active

#### TC-CONN-002: Test kết nối API
**Priority**: High
**Type**: Functional, API
**Steps**:
1. Tạo connection với endpoint không tồn tại
2. Click "Test Connection"
3. Tạo connection với endpoint hợp lệ
4. Click "Test Connection"

**Expected Results**:
- Invalid endpoint: Error message
- Valid endpoint: Success message với response preview

#### TC-CONN-003: Xóa kết nối với dữ liệu
**Priority**: Medium
**Type**: Functional, E2E
**Steps**:
1. Tạo connection và chạy một số runs
2. Xóa connection với option "Delete with data"
3. Xóa connection với option "Keep data"

**Expected Results**:
- Delete with data: Connection và tất cả runs bị xóa
- Keep data: Connection bị xóa, runs còn lại

### 2. Field Mappings

#### TC-MAP-001: Tạo field mapping với JSONPath
**Priority**: High
**Type**: Functional, E2E
**Steps**:
1. Upload file JSON mẫu hoặc sử dụng API response
2. Tạo mapping với các JSONPath:
   - `$.user.id` → `user_id`
   - `$.user.email` → `email`
   - `$.data.items[*].name` → `item_names`
3. Save mapping
4. Test transformation

**Expected Results**:
- Mapping được tạo thành công
- Data được transform đúng theo mapping
- Schema validation pass

#### TC-MAP-002: Schema detection tự động
**Priority**: Medium
**Type**: Functional, API
**Steps**:
1. Upload JSON file với nested structure
2. Click "Auto-detect Schema"
3. Review suggested mappings
4. Modify và save

**Expected Results**:
- Schema được detect chính xác
- Suggested mappings hợp lý
- User có thể modify trước khi save

### 3. Data Runs/Executions

#### TC-RUN-001: Thực thi run thủ công
**Priority**: High
**Type**: Functional, E2E
**Steps**:
1. Tạo connection và mapping
2. Click "Run Now"
3. Monitor progress
4. Check results

**Expected Results**:
- Run được tạo và thực thi thành công
- Progress hiển thị real-time
- Results hiển thị đúng data

#### TC-RUN-002: Run với parameters (List Mode)
**Priority**: High
**Type**: Functional, Integration
**Steps**:
1. Tạo connection với parameters: ["1", "2", "3"]
2. Set mode: List
3. Execute run

**Expected Results**:
- 3 API calls được thực hiện
- 3 records được tạo trong database
- Logs hiển thị chi tiết từng call

#### TC-RUN-003: Run với parameters (Cartesian Mode)
**Priority**: High
**Type**: Functional, Integration
**Steps**:
1. Tạo connection với parameters:
   - param1: ["A", "B"]
   - param2: ["1", "2"]
2. Set mode: Cartesian
3. Execute run

**Expected Results**:
- 4 API calls: A1, A2, B1, B2
- 4 records trong database

### 4. Scheduling

#### TC-SCHED-001: Tạo lịch trình CRON
**Priority**: Medium
**Type**: Functional, E2E
**Steps**:
1. Tạo schedule với CRON: "0 */2 * * *" (mỗi 2 giờ)
2. Set connection và mapping
3. Enable schedule
4. Wait và check execution

**Expected Results**:
- Schedule được tạo và enable
- Auto-executed theo CRON
- History hiển thị đúng

#### TC-SCHED-002: Disable/Enable schedule
**Priority**: Low
**Type**: Functional, API
**Steps**:
1. Tạo và enable schedule
2. Disable schedule
3. Enable lại

**Expected Results**:
- Schedule stop execution khi disabled
- Resume execution khi enabled

### 5. Monitoring & Analytics

#### TC-MON-001: Dashboard metrics
**Priority**: Medium
**Type**: Functional, E2E
**Steps**:
1. Chạy một số runs thành công và thất bại
2. Truy cập dashboard
3. Check các metrics:
   - Total connections
   - Success rate
   - Recent runs
   - Performance charts

**Expected Results**:
- Metrics hiển thị chính xác
- Charts render đúng
- Real-time updates

#### TC-MON-002: Health monitoring
**Priority**: Medium
**Type**: Functional, API
**Steps**:
1. Check /api/health endpoint
2. Simulate failures
3. Check circuit breaker status

**Expected Results**:
- Health status trả về đúng
- Circuit breaker trigger khi cần
- Recovery tự động

### 6. Data Export

#### TC-EXPORT-001: Export CSV
**Priority**: Medium
**Type**: Functional, E2E
**Steps**:
1. Chạy run và có dữ liệu
2. Click "Export" → "CSV"
3. Set filters nếu cần
4. Download file

**Expected Results**:
- File CSV được download
- Data format đúng
- Filters áp dụng chính xác

### 7. File Upload

#### TC-UPLOAD-001: Upload CSV file
**Priority**: Medium
**Type**: Functional, E2E
**Steps**:
1. Prepare CSV file với headers
2. Upload qua UI
3. Check schema detection
4. Process data

**Expected Results**:
- File upload thành công
- Schema detected đúng
- Data processed và stored

## Test Data Management

### 1. Test Data Preparation
- **Mock APIs**: JSONPlaceholder, MockAPI services
- **Sample Files**: CSV, JSON, Excel files với various schemas
- **Database Seeds**: Pre-populated test data

### 2. Test Environments
- **Local Development**: Full setup với mock services
- **Staging**: Real external APIs (rate-limited)
- **Production**: Subset của production data

## Automation Strategy

### 1. CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install --legacy-peer-deps
      - run: npm run test:unit
      - run: npm run test:api
      - run: npm run test:e2e
```

### 2. Test Execution Order
1. **Unit Tests**: Fast, isolated
2. **API Tests**: Backend logic
3. **Integration Tests**: Cross-service
4. **E2E Tests**: Full user workflows

### 3. Parallel Execution
- Unit tests: Full parallel
- API tests: Parallel by service
- E2E tests: Parallel by browser
- Integration tests: Sequential (database state)

## Risk Assessment & Mitigation

### High Risk Areas
1. **ETL Pipeline**: Complex data transformations
   - Mitigation: Comprehensive unit tests, integration tests

2. **External API Dependencies**: Rate limits, downtime
   - Mitigation: Mock services, circuit breakers

3. **Database Operations**: Data consistency
   - Mitigation: Transaction tests, rollback scenarios

4. **Scheduling**: Cron job reliability
   - Mitigation: Time-based testing, failure recovery

### Performance Risks
1. **Large Data Processing**: Memory issues
2. **Concurrent Users**: Race conditions
3. **Long-running Operations**: Timeout handling

## Success Criteria

### Functional Coverage
- ✅ All CRUD operations tested
- ✅ All user workflows covered
- ✅ Error scenarios handled
- ✅ Edge cases identified

### Quality Metrics
- **Test Coverage**: >80% code coverage
- **Pass Rate**: >95% tests passing
- **Performance**: <2s API response time
- **Reliability**: <1% failure rate in production

### Automation Goals
- **Unit Tests**: 100% automated
- **API Tests**: 100% automated
- **E2E Tests**: 80% automated
- **Performance Tests**: 50% automated

## Timeline & Resources

### Phase 1: Foundation (Week 1-2)
- Set up test frameworks
- Create basic test structure
- Implement critical path tests

### Phase 2: Feature Coverage (Week 3-6)
- Complete functional test coverage
- Implement integration tests
- Performance testing setup

### Phase 3: Automation & CI/CD (Week 7-8)
- Full automation implementation
- CI/CD pipeline setup
- Test reporting and monitoring

### Resources Required
- **Test Engineers**: 2-3 FTE
- **DevOps Support**: CI/CD setup
- **Infrastructure**: Test environments
- **Tools**: Playwright, k6, monitoring tools

## Maintenance & Evolution

### Ongoing Activities
- **Regression Testing**: On every release
- **New Feature Testing**: Before deployment
- **Performance Monitoring**: Continuous
- **Test Data Updates**: Quarterly

### Test Case Maintenance
- **Review Cycle**: Monthly review of test cases
- **Update Frequency**: With each feature change
- **Documentation**: Keep test plans current

---

**Document Version**: 1.0
**Last Updated**: October 20, 2025
**Author**: AI Testing Specialist
**Review Status**: Ready for Implementation