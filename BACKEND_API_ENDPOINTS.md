# Backend API Endpoints Documentation

## Tổng quan
Backend cung cấp các API endpoints cho hệ thống No-Code API Connector, bao gồm quản lý kết nối, lịch trình, chạy API, phân tích dữ liệu và tích hợp với Airflow để lên lịch tự động.

**Kiến trúc hệ thống:**
- **Backend PHP**: API backend đơn giản với 4 collections MongoDB cơ bản
- **Frontend Next.js**: Ứng dụng client-side gọi API từ backend
- **Database**: Đã được dọn dẹp, chỉ còn các collections thực sự được sử dụng
- **Airflow**: Hệ thống lên lịch tự động với DAGs được tạo từ MongoDB schedules

## Cấu trúc API
- **Base URL**: `/api/`
- **Authentication**: Bearer token (nếu có)
- **Response Format**: JSON
- **HTTP Status Codes**: Standard REST API codes

---

## 1. 🔗 Connection Management (Quản lý kết nối)

### CRUD Operations cho Connections
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/connections` | Lấy danh sách tất cả connections | - | `[{id, name, baseUrl, method, headers, ...}]` |
| GET | `/api/connections/{id}` | Lấy chi tiết connection theo ID | - | `{id, name, baseUrl, method, headers, ...}` |
| POST | `/api/connections` | Tạo connection mới | `{name, baseUrl, method, headers?, auth?}` | `{id, name, baseUrl, ...}` |
| PUT | `/api/connections/{id}` | Cập nhật connection | `{name?, baseUrl?, method?, headers?, auth?}` | `{ok: true}` |
| POST | `/api/connections/{id}` | Cập nhật connection (alternative) | `{name?, baseUrl?, method?, headers?, auth?}` | `{ok: true}` |
| DELETE | `/api/connections/{id}` | Xóa connection | - | `{ok: true}` |

### Connection Testing
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/test-connection` | Test connection trước khi lưu | `{baseUrl, method, headers?, auth?}` | `{success: true, response: {...}}` |

---

## 2. 📅 Schedule Management (Quản lý lịch trình)

### CRUD Operations cho Schedules
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/schedules` | Lấy danh sách tất cả schedules | - | `[{id, dagId, connectionName, scheduleType, cronExpression, isActive, nextRun, lastRun, ...}]` |
| GET | `/api/schedules/{id}` | Lấy chi tiết schedule theo ID | - | `{id, dagId, connectionName, scheduleType, cronExpression, isActive, ...}` |
| POST | `/api/schedules` | Tạo schedule mới | `{connectionId, connectionName, scheduleType, cronExpression, description?}` | `{id, dagId, ...}` |
| PUT | `/api/schedules/{id}` | Cập nhật schedule | `{connectionId?, scheduleType?, cronExpression?, isActive?, description?}` | `{ok: true}` |
| DELETE | `/api/schedules/{id}` | Xóa schedule | - | `{ok: true}` |
| GET | `/api/schedules/{id}/history` | Lịch sử chạy của schedule | - | `[{runId, status, startTime, endTime, ...}]` |

---

## 3. ⚙️ Parameter Mode Management (Quản lý chế độ tham số)

### CRUD Operations cho Parameter Modes
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/parameter-modes` | Lấy danh sách tất cả parameter modes | - | `[{id, name, type, config, ...}]` |
| GET | `/api/parameter-modes/{id}` | Lấy chi tiết parameter mode theo ID | - | `{id, name, type, config, ...}` |
| POST | `/api/parameter-modes` | Tạo parameter mode mới | `{name, type, config}` | `{id, name, type, config, ...}` |
| PUT | `/api/parameter-modes/{id}` | Cập nhật parameter mode | `{name?, type?, config?}` | `{id, name, type, config, ...}` |
| DELETE | `/api/parameter-modes/{id}` | Xóa parameter mode | - | `{ok: true}` |

---

## 4. ▶️ Run Management (Quản lý chạy API)

### Run Operations
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/runs` | Lấy danh sách tất cả runs | Query params: `limit`, `offset`, `status` | `[{id, scheduleId, status, startTime, endTime, response, ...}]` |
| GET | `/api/runs/{id}` | Lấy chi tiết run theo ID | - | `{id, scheduleId, status, startTime, endTime, request, response, error, ...}` |
| POST | `/api/runs/{id}/retry` | Retry một run thất bại | - | `{success: true, newRunId: "..."}` |
| POST | `/api/runs/{id}/export` | Export run data | `{format: "json|csv|xml"}` | File download hoặc `{exportId: "..."}` |
| POST | `/api/execute-run` | Thực thi run ngay lập tức | `{connectionId, apiConfig: {baseUrl, method?, headers?}, parameters?, fieldMappings?}` | `{runId, status, result, ...}` |

**Status**: ✅ All Run Operations endpoints tested and functional (October 25, 2025)
**Memory Issues**: ✅ Resolved - bypassed caching in repositories to prevent memory exhaustion
**Test Coverage**: ✅ Complete - All 5 endpoints tested with comprehensive validation

---

## 5. 📊 Data & Analytics (Dữ liệu và phân tích)

### Data Operations
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/data` | Lấy dữ liệu tổng hợp | Query params: `date_from`, `date_to`, `limit` | `{runs: [...], stats: {...}}` |
| GET | `/api/mappings` | Lấy mappings giữa connections và schedules | - | `[{connectionId, scheduleId, mappingConfig, ...}]` |
| GET | `/api/status` | Trạng thái hệ thống tổng quan | - | `{connections: {...}, schedules: {...}, runs: {...}}` |

**Status**: ✅ All Data Operations endpoints tested and functional (October 25, 2025)

### Analytics & Visualization
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/analytics/success-rate-history` | Lịch sử tỷ lệ thành công | Query params: `days` | `[{date, successRate, totalRuns, ...}]` |
| GET | `/api/analytics/charts` | Dữ liệu cho biểu đồ | Query params: `type`, `period` | Chart data object |
| GET | `/api/analytics/metrics` | Metrics tổng quan | - | `{totalRuns, successRate, avgResponseTime, ...}` |

---

## 6. 🔍 Advanced Search & Filtering (Tìm kiếm nâng cao)

### Search Operations
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/data/search` | Tìm kiếm nâng cao trong dữ liệu | `{query, filters, sort, limit, offset}` | `{results: [...], total, pagination}` |
| GET | `/api/data/columns` | Lấy danh sách cột có thể tìm kiếm | - | `[{name, type, searchable, filterable}]` |
| POST | `/api/data/filter` | Lọc dữ liệu theo điều kiện | `{filters: [...], sort?, limit?}` | `{results: [...], total}` |

---

## 7. 📤 Data Export (Xuất dữ liệu)

### Export Operations
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/data/export` | Tạo export job | `{format, filters, dateRange, includeMetadata}` | `{exportId, status, estimatedTime}` |
| GET | `/api/data/export/{id}` | Download exported file | - | File download (JSON/CSV/XML) |

---

## 8. 📋 Reports (Báo cáo)

### Report Operations
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/reports` | Lấy danh sách reports | - | `[{id, name, type, createdAt, parameters, ...}]` |
| GET | `/api/reports/{id}` | Lấy chi tiết report | - | `{id, name, type, data, generatedAt, ...}` |
| POST | `/api/reports` | Tạo report mới | `{name, type, parameters, schedule?}` | `{id, name, status, ...}` |
| DELETE | `/api/reports/{id}` | Xóa report | - | `{ok: true}` |

---

## 9. 🚀 Airflow Integration (Tích hợp Airflow - Lên lịch tự động)

### DAG Management
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/schedules/{id}/trigger` | Trigger DAG run thủ công | `{config?: {...}}` | `{success: true, dagRunId, state}` |
| GET | `/api/schedules/{id}/airflow-status` | Lấy trạng thái DAG hiện tại | - | `{dagId, isPaused, lastParsed, ...}` |
| GET | `/api/schedules/{id}/airflow-history` | Lịch sử chạy DAG | Query params: `limit` | `[{dagRunId, state, executionDate, startDate, endDate, ...}]` |
| POST | `/api/schedules/{id}/pause` | Tạm dừng DAG | - | `{success: true, message}` |
| POST | `/api/schedules/{id}/resume` | Tiếp tục DAG | - | `{success: true, message}` |

### Airflow DAG Structure
- **DAG ID Format**: `api_schedule_{scheduleId}`
- **Schedule Types**: `cron`, `interval`, `manual`
- **States**: `success`, `failed`, `running`, `queued`, `paused`
- **Auto-generated**: DAGs được tạo tự động từ MongoDB schedules

---

## 10. 👥 Admin Management (Quản trị hệ thống)

### User Management
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/admin/users` | Lấy danh sách users | - | `[{id, username, email, role, status, ...}]` |
| GET | `/api/admin/users/{id}` | Lấy chi tiết user | - | `{id, username, email, role, permissions, ...}` |
| POST | `/api/admin/users` | Tạo user mới | `{username, email, password, role}` | `{id, username, email, ...}` |
| PUT | `/api/admin/users/{id}` | Cập nhật user | `{username?, email?, role?, status?}` | `{ok: true}` |
| DELETE | `/api/admin/users/{id}` | Xóa user | - | `{ok: true}` |
| POST | `/api/admin/users/{id}/reset-password` | Reset password | `{newPassword?}` | `{ok: true}` |

### Role Management
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/admin/roles` | Lấy danh sách roles | - | `[{id, name, permissions, userCount, ...}]` |
| GET | `/api/admin/roles/{id}` | Lấy chi tiết role | - | `{id, name, permissions, users, ...}` |
| POST | `/api/admin/roles` | Tạo role mới | `{name, permissions}` | `{id, name, permissions, ...}` |
| PUT | `/api/admin/roles/{id}` | Cập nhật role | `{name?, permissions?}` | `{ok: true}` |
| DELETE | `/api/admin/roles/{id}` | Xóa role | - | `{ok: true}` |
| GET | `/api/admin/permissions` | Lấy danh sách permissions có sẵn | - | `[{name, description, category}]` |

### System Management
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/admin/health` | Health check tổng quan | - | `{status, services: {...}, uptime, ...}` |
| GET | `/api/admin/health/database` | Health check database | - | `{status, connectionTime, collections, ...}` |
| GET | `/api/admin/health/storage` | Health check storage | - | `{status, diskUsage, backups, ...}` |
| GET | `/api/admin/config` | Lấy cấu hình hệ thống | - | `{database, cache, airflow, logging, ...}` |
| PUT | `/api/admin/config` | Cập nhật cấu hình | `{key, value}` | `{ok: true}` |
| GET | `/api/admin/logs` | Lấy system logs | Query params: `level`, `date_from`, `limit` | `[{timestamp, level, message, context, ...}]` |
| GET | `/api/admin/audit-trail` | Audit trail | Query params: `user`, `action`, `date_from` | `[{timestamp, user, action, resource, details, ...}]` |

### Backup Management
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/admin/backups` | Lấy danh sách backups | - | `[{id, name, size, createdAt, status, ...}]` |
| POST | `/api/admin/backups` | Tạo backup mới | `{name?, includeData?, compress?}` | `{backupId, status, estimatedTime}` |
| DELETE | `/api/admin/backups/{id}` | Xóa backup | - | `{ok: true}` |
| POST | `/api/admin/backups/{id}/restore` | Restore từ backup | `{targetDatabase?, dropExisting?}` | `{restoreId, status, progress}` |

---

## 🔐 Authentication & Authorization

### Authentication (nếu implement)
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/api/auth/login` | Đăng nhập | `{username, password}` | `{token, user, expiresAt}` |
| POST | `/api/auth/refresh` | Refresh token | `{refreshToken}` | `{token, expiresAt}` |
| POST | `/api/auth/logout` | Đăng xuất | - | `{ok: true}` |
| GET | `/api/auth/me` | Thông tin user hiện tại | - | `{id, username, email, role, permissions}` |

---

## 📝 Request/Response Examples

### Tạo Connection
```json
POST /api/connections
{
  "name": "My API Connection",
  "baseUrl": "https://api.example.com/v1",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer token123",
    "Content-Type": "application/json"
  },
  "auth": {
    "type": "bearer",
    "token": "token123"
  }
}
```

### Tạo Schedule với Cron Expression
```json
POST /api/schedules
{
  "connectionId": "507f1f77bcf86cd799439011",
  "connectionName": "My API Connection",
  "scheduleType": "cron",
  "cronExpression": "0 */2 * * *",
  "description": "Run every 2 hours"
}
```

### Trigger DAG Run
```json
POST /api/schedules/507f1f77bcf86cd799439011/trigger
{
  "config": {
    "custom_param": "value",
    "override_url": "https://api.example.com/custom"
  }
}
```

---

## ⚠️ Error Responses

### Standard Error Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...},
  "timestamp": "2025-10-25T10:30:00Z"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Unprocessable Entity (validation error)
- `500` - Internal Server Error

---

## 🔄 Airflow DAG Lifecycle

1. **Schedule Creation**: User tạo schedule trong hệ thống
2. **DAG Generation**: `schedule_dag_generator.py` tạo DAG tự động
3. **DAG Registration**: Airflow đăng ký DAG với ID `api_schedule_{scheduleId}`
4. **Scheduled Execution**: Airflow chạy DAG theo cron expression
5. **API Call**: DAG gọi API endpoint được cấu hình
6. **Result Storage**: Kết quả được lưu vào MongoDB collection `api_runs`
7. **Monitoring**: User có thể monitor qua API endpoints

### Daily Job Collection Example
- **API**: RapidAPI Active Jobs DB (modified-ats-24h)
- **Schedule**: Daily at 9:00 AM (`0 9 * * *`)
- **Parameters**: `limit=500`, `offset=0`, `description_type=text`
- **Status**: ✅ Active and tested

---

## 📊 Database Collections

### Backend PHP Collections (4 collections - Được sử dụng thực tế)
- `api_connections` - Thông tin kết nối API (11 documents)
- `api_schedules` - Cấu hình lịch trình (10 documents)
- `api_runs` - Lịch sử chạy API (27 documents)
- `parameter_modes` - Chế độ tham số (chưa tạo)

**Database Cleanup**: October 25, 2025 - Xóa 3 collections không sử dụng (api_data, api_metadata, api_uploads)

## 🚀 Automated Job Collection Setup

### Daily Jobs Collection (Active Jobs Database)
- **API**: RapidAPI JSearch API
- **Schedule**: Daily at 9 AM (`0 9 * * *`)
- **Query**: "Active Jobs Database Developer"
- **Status**: ✅ Configured and tested
- **Setup Script**: `daily_jobs_setup.php`

### Weekly Data Engineer Jobs Collection
- **API**: RapidAPI JSearch API
- **Schedule**: Weekly on Monday at 9 AM (`0 9 * * 1`)
- **Query**: "Data Engineer"
- **Parameters**:
  - `query`: "Data Engineer"
  - `page`: "1"
  - `num_pages`: "1"
  - `date_posted`: "week"
  - `remote_jobs_only`: false
  - `employment_types`: "FULLTIME"
- **Status**: ✅ Configured and tested
- **Setup Script**: `weekly_data_engineer_setup.php`

### Setup Instructions
1. **Environment Setup**:
   ```bash
   cd backendphp
   # Ensure .env file has RAPIDAPI_KEY
   ```

2. **Run Setup Scripts**:
   ```bash
   # For daily jobs
   php daily_jobs_setup.php

   # For weekly Data Engineer jobs
   php weekly_data_engineer_setup.php
   ```

3. **Start Airflow** (for automated scheduling):
   ```bash
   cd backendphp
   docker-compose up -d
   ```

4. **Monitor Collections**:
   - View runs: `GET /api/runs`
   - View data: `GET /api/data`
   - Check schedules: `GET /api/schedules`

### API Testing Results
- **Total Endpoints Tested**: 18 (9 categories)
- **Status**: ✅ All endpoints functional
- **Last Test**: October 25, 2025
- **Coverage**: Connections, Schedules, Parameter Modes, Runs, Data/Analytics, Search/Filter, Export, Reports, Airflow

---

## 🔧 Environment Variables

### Required
- `MONGODB_URI` - MongoDB connection string
- `MONGODB_DATABASE` - Database name

### Optional
- `CACHE_ENABLED` - Enable/disable caching
- `REDIS_HOST` - Redis host
- `AIRFLOW_WEBSERVER_URL` - Airflow webserver URL
- `LOG_LEVEL` - Logging level (DEBUG, INFO, ERROR)

---

*Tài liệu được tạo tự động từ phân tích codebase. Cập nhật lần cuối: October 25, 2025*
*Database đã được dọn dẹp vào: October 25, 2025 - Xóa 3 collections không sử dụng*
*API endpoints đã được test toàn diện: October 25, 2025 - Tất cả endpoints hoạt động*
*Daily job collection đã được cấu hình: October 25, 2025 - RapidAPI Active Jobs DB*
*Weekly Data Engineer job collection đã được cấu hình: October 25, 2025 - RapidAPI Data Engineer Jobs*
*Memory issues đã được sửa: October 25, 2025 - Giảm limit mặc định và thêm giới hạn tối đa*
*PHP deprecated warnings đã được sửa: October 25, 2025 - Sửa kiểu nullable parameter*</content>
<parameter name="filePath">d:\project\no-code-api-connector\BACKEND_API_ENDPOINTS.md