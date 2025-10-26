# Backend PHP Test Suite

This directory contains comprehensive tests for the Backend PHP application.

## Test Structure

```
tests/
├── bootstrap.php              # PHPUnit bootstrap file
├── run-all-tests.php          # Comprehensive test runner
├── Unit/                      # Unit tests for individual classes
│   ├── ConnectionServiceTest.php
│   ├── DataExportServiceTest.php
│   ├── DataSearchServiceTest.php
│   ├── DataRepositoryTest.php
│   └── ScheduleServiceTest.php
└── Feature/                   # Feature tests for integrated functionality
    ├── ConnectionControllerTest.php
    ├── DataExportControllerTest.php
    ├── DataSearchControllerTest.php
    └── ConnectionCreationWithScheduleTest.php
```

## Running Tests

### PHPUnit Tests Only
```bash
# Run all PHPUnit tests
composer test

# Run unit tests only
composer test:unit

# Run feature tests only
composer test:feature

# Run with coverage
composer test:coverage
```

### Comprehensive Test Suite
```bash
# Run all tests including script-based tests
php tests/run-all-tests.php
```

### Individual Test Scripts
Located in `scripts/` directory:
- `test_data_repo.php` - Test DataRepository functionality
- `test_data_services.php` - Test DataExportService and DataSearchService
- `test_connections_comprehensive.py` - API tests for connections
- `test_data_export.py` - API tests for data export
- `test_search_filtering.py` - API tests for search and filtering
- `test_schedules.py` - API tests for schedules

## Test Categories

### Unit Tests
Test individual classes and methods in isolation:
- Service layer testing
- Repository layer testing
- Utility function testing

### Feature Tests
Test integrated functionality:
- Controller endpoint testing
- Cross-service integration
- Business logic workflows

### Integration Tests
Located in `scripts/` directory:
- API endpoint testing with real HTTP requests
- Database integration testing
- External service integration (Airflow, etc.)

## Key Test Coverage

### Core Services
- ✅ ConnectionService (including hybrid Airflow approach)
- ✅ DataExportService (real MongoDB data export)
- ✅ DataSearchService (real MongoDB search and filtering)
- ✅ ScheduleService
- ✅ DataRepository (MongoDB aggregation queries)

### Controllers
- ✅ ConnectionController
- ✅ DataExportController
- ✅ DataSearchController
- ✅ ScheduleController

### Integration Features
- ✅ Hybrid approach: DB write + best-effort Airflow trigger
- ✅ MongoDB aggregation pipelines
- ✅ Real data export/import
- ✅ Cross-collection search

## Test Environment Setup

1. Install dependencies:
```bash
composer install
```

2. Set up environment variables (`.env` file):
```env
MONGODB_URI=mongodb://localhost:27017/dataplatform_db
AIRFLOW_WEBSERVER_URL=http://localhost:8080
# ... other config
```

3. Start MongoDB and Airflow services

4. Run tests:
```bash
composer test
```

## Continuous Integration

Tests are configured to run in CI/CD pipelines with:
- PHPUnit XML reporting (`phpunit-report.xml`)
- Code coverage reports
- Automated test execution on code changes