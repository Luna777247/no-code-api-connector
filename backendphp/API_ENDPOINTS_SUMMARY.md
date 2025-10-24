# API Endpoints Summary - Tóm Tắt Các Endpoint API

## Tổng Quan
- **Tổng số endpoints**: 51
- **Admin APIs**: 22
- **Integrator APIs**: 17
- **Analyst/User APIs**: 8
- **Diagnostic APIs**: 3
- **Airflow APIs**: 5

---

## 1. ADMIN APIs (22 endpoints)

### User Management (6 endpoints)
\`\`\`
GET    /api/admin/users              - Danh sách users (phân trang)
GET    /api/admin/users/{id}         - Chi tiết user
POST   /api/admin/users              - Tạo user mới
PUT    /api/admin/users/{id}         - Cập nhật user
DELETE /api/admin/users/{id}         - Xóa user
POST   /api/admin/users/{id}/reset-password - Reset mật khẩu
\`\`\`

### Role & Permission Management (6 endpoints)
\`\`\`
GET    /api/admin/roles              - Danh sách roles
GET    /api/admin/roles/{id}         - Chi tiết role
POST   /api/admin/roles              - Tạo role mới
PUT    /api/admin/roles/{id}         - Cập nhật role
DELETE /api/admin/roles/{id}         - Xóa role
GET    /api/admin/permissions        - Danh sách permissions
\`\`\`

### System Management (7 endpoints)
\`\`\`
GET    /api/admin/health             - Trạng thái hệ thống
GET    /api/admin/health/database    - Trạng thái DB
GET    /api/admin/health/storage     - Trạng thái lưu trữ
GET    /api/admin/config             - Lấy cấu hình
PUT    /api/admin/config             - Cập nhật cấu hình
GET    /api/admin/logs               - Danh sách logs
GET    /api/admin/audit-trail        - Lịch sử thay đổi
\`\`\`

### Backup Management (4 endpoints)
\`\`\`
GET    /api/admin/backups            - Danh sách backups
POST   /api/admin/backups            - Tạo backup mới
DELETE /api/admin/backups/{id}       - Xóa backup
POST   /api/admin/backups/{id}/restore - Khôi phục backup
\`\`\`

---

## 2. INTEGRATOR APIs (17 endpoints)

### Connection Management (6 endpoints)
\`\`\`
GET    /api/connections              - Danh sách kết nối
GET    /api/connections/{id}         - Chi tiết kết nối
POST   /api/connections              - Tạo kết nối mới
PUT    /api/connections/{id}         - Cập nhật kết nối
DELETE /api/connections/{id}         - Xóa kết nối
POST   /api/test-connection          - Kiểm tra kết nối
\`\`\`

### Schedule Management (4 endpoints)
\`\`\`
GET    /api/schedules                - Danh sách lịch trình
POST   /api/schedules                - Tạo lịch trình mới
PUT    /api/schedules/{id}           - Cập nhật lịch trình
DELETE /api/schedules/{id}           - Xóa lịch trình
GET    /api/schedules/{id}/history   - Lịch sử thực thi
\`\`\`

### Parameter Modes (5 endpoints)
\`\`\`
GET    /api/parameter-modes          - Danh sách parameter modes
GET    /api/parameter-modes/{id}     - Chi tiết parameter mode
POST   /api/parameter-modes          - Tạo parameter mode
PUT    /api/parameter-modes/{id}     - Cập nhật parameter mode
DELETE /api/parameter-modes/{id}     - Xóa parameter mode
\`\`\`

### Run Management (3 endpoints)
\`\`\`
GET    /api/runs                     - Danh sách runs (theo connection)
GET    /api/runs/{id}                - Chi tiết run
POST   /api/runs/{id}/retry          - Thử lại run
POST   /api/runs/{id}/export         - Export kết quả run
\`\`\`

### Field Mapping (1 endpoint)
\`\`\`
GET    /api/mappings                 - Danh sách ánh xạ trường
\`\`\`

### Pipeline Execution (1 endpoint)
\`\`\`
POST   /api/execute-run              - Thực thi pipeline
\`\`\`

---

## 3. ANALYST/USER APIs (8 endpoints)

### Data Explorer (4 endpoints)
\`\`\`
GET    /api/data                     - Dữ liệu tổng hợp
POST   /api/data/search              - Tìm kiếm nâng cao
GET    /api/data/columns             - Danh sách cột
POST   /api/data/filter              - Lọc dữ liệu
\`\`\`

### Data Export (2 endpoints)
\`\`\`
POST   /api/data/export              - Export dữ liệu (CSV, JSON, Excel)
GET    /api/data/export/{id}         - Tải file export
\`\`\`

### Reports (4 endpoints)
\`\`\`
GET    /api/reports                  - Danh sách báo cáo
GET    /api/reports/{id}             - Chi tiết báo cáo
POST   /api/reports                  - Tạo báo cáo mới
DELETE /api/reports/{id}             - Xóa báo cáo
\`\`\`

### Analytics & Visualization (4 endpoints)
\`\`\`
GET    /api/status                   - Trạng thái hệ thống
GET    /api/analytics/success-rate-history - Lịch sử tỷ lệ thành công
GET    /api/analytics/charts         - Metadata biểu đồ
GET    /api/analytics/metrics        - Metrics chính
\`\`\`

---

## 4. DIAGNOSTIC APIs (3 endpoints)

\`\`\`
POST   /api/test-connection          - Kiểm tra kết nối API
POST   /api/execute-run              - Thực thi pipeline
GET    /api/status                   - Trạng thái hệ thống
\`\`\`

---

## 5. AIRFLOW SCHEDULING APIs (5 endpoints)

### Airflow Integration (5 endpoints)
\`\`\`
POST   /api/schedules/{id}/trigger   - Trigger DAG chạy ngay
GET    /api/schedules/{id}/airflow-status - Lấy trạng thái DAG
GET    /api/schedules/{id}/airflow-history - Lịch sử chạy DAG
POST   /api/schedules/{id}/pause     - Tạm dừng DAG
POST   /api/schedules/{id}/resume    - Tiếp tục DAG
\`\`\`

---

## Phân Quyền Theo Vai Trò

### Admin
- Toàn bộ `/api/admin/*` endpoints
- Quản lý users, roles, permissions
- Cấu hình hệ thống, backup, logs
- Xem audit trail

### Integrator
- `/api/connections/*` - Quản lý kết nối
- `/api/schedules/*` - Quản lý lịch trình
- `/api/schedules/{id}/trigger` - Trigger DAG
- `/api/schedules/{id}/airflow-status` - Xem trạng thái DAG
- `/api/schedules/{id}/airflow-history` - Xem lịch sử DAG
- `/api/schedules/{id}/pause` - Tạm dừng DAG
- `/api/schedules/{id}/resume` - Tiếp tục DAG
- `/api/parameter-modes/*` - Định nghĩa parameter modes
- `/api/runs/*` - Xem lịch sử chạy
- `/api/mappings` - Xem ánh xạ trường
- `/api/test-connection` - Kiểm tra kết nối
- `/api/execute-run` - Thực thi pipeline

### Analyst/User
- `/api/data/*` - Duyệt dữ liệu
- `/api/data/export` - Export dữ liệu
- `/api/reports/*` - Xem báo cáo
- `/api/analytics/*` - Xem analytics
- `/api/status` - Xem trạng thái

---

## Ví Dụ Sử Dụng

### Admin: Tạo User Mới
\`\`\`bash
curl -X POST http://localhost:8000/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "integrator@example.com",
    "password": "secure_password",
    "role": "integrator",
    "name": "Data Integrator"
  }'
\`\`\`

### Integrator: Tạo Schedule
\`\`\`bash
curl -X POST http://localhost:8000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_123",
    "cronExpression": "0 0 * * *",
    "name": "Daily Sync",
    "enabled": true
  }'
\`\`\`

### Integrator: Trigger DAG Chạy Ngay
\`\`\`bash
curl -X POST http://localhost:8000/api/schedules/507f1f77bcf86cd799439012/trigger \
  -H "Content-Type: application/json"
\`\`\`

### Integrator: Xem Trạng Thái DAG
\`\`\`bash
curl -X GET http://localhost:8000/api/schedules/507f1f77bcf86cd799439012/airflow-status \
  -H "Content-Type: application/json"
\`\`\`

### Integrator: Xem Lịch Sử Chạy DAG
\`\`\`bash
curl -X GET http://localhost:8000/api/schedules/507f1f77bcf86cd799439012/airflow-history \
  -H "Content-Type: application/json"
\`\`\`

### Analyst: Export Dữ Liệu
\`\`\`bash
curl -X POST http://localhost:8000/api/data/export \
  -H "Content-Type: application/json" \
  -d '{
    "format": "csv",
    "filters": {
      "dateFrom": "2024-01-01",
      "dateTo": "2024-12-31"
    }
  }'
\`\`\`

### Analyst: Tìm Kiếm Dữ Liệu
\`\`\`bash
curl -X POST http://localhost:8000/api/data/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "customer",
    "filters": {
      "status": "active"
    },
    "page": 1,
    "limit": 50,
    "sort": "createdAt",
    "order": "desc"
  }'
\`\`\`

---

## Ghi Chú
- Tất cả endpoints trả về JSON
- Sử dụng HTTP status codes chuẩn (200, 400, 404, 500)
- Hỗ trợ phân trang với `limit` và `offset` parameters
- Cần xác thực (authentication) cho tất cả endpoints
- Airflow APIs yêu cầu Airflow service đang chạy
- DAG ID được lưu trong MongoDB field `dagId` của schedule
