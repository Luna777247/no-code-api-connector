# Kiến Trúc Backend - Hệ Thống Quản Lý API Pipeline

## 📋 Tổng Quan

Đây là một ứng dụng PHP backend được thiết kế để quản lý, kiểm thử và thực thi các API pipeline với hỗ trợ lên lịch tự động qua **Apache Airflow**. Ứng dụng sử dụng **MongoDB** để lưu trữ dữ liệu và tuân theo mô hình **MVC** với các lớp Service và Repository.

---

## 🏗️ Kiến Trúc Tổng Thể

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Requests (REST API)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Router (app/Support/Router.php)           │
│  - Định tuyến các request đến Controller tương ứng          │
│  - Hỗ trợ GET, POST, PUT, DELETE                            │
│  - Xử lý dynamic parameters (e.g., {id})                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Controllers (app/Controllers/)                  │
│  - ConnectionController: Quản lý kết nối API                │
│  - RunController: Lấy lịch sử chạy                          │
│  - PipelineController: Thực thi pipeline                    │
│  - ScheduleController: Quản lý lịch trình                   │
│  - AirflowController: Tương tác với Airflow                 │
│  - AdminUserController: Quản lý users                       │
│  - Các controller khác: Analytics, Data, Mapping, Status    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               Services (app/Services/)                       │
│  - ConnectionService: Logic quản lý kết nối                 │
│  - RunService: Logic quản lý chạy                           │
│  - ScheduleService: Logic quản lý lịch trình                │
│  - AirflowService: Tương tác với Airflow API                │
│  - Xử lý business logic, validation, normalization          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            Repositories (app/Repositories/)                  │
│  - ConnectionRepository: CRUD cho Connections               │
│  - RunRepository: CRUD cho Runs                              │
│  - ScheduleRepository: CRUD cho Schedules                    │
│  - Trực tiếp tương tác với MongoDB                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Database                          │
│  - Collections: api_connections, runs, schedules            │
│  - Lưu trữ tất cả dữ liệu ứng dụng                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Apache Airflow (Scheduling)                     │
│  - DAG Generator: Tạo DAGs từ schedules                      │
│  - Scheduler: Theo dõi cron expressions                      │
│  - Executor: Thực thi DAGs theo lịch                        │
│  - Web UI: Monitoring và management                         │
└─────────────────────────────────────────────────────────────┘
\`\`\`

---

## 🔄 Luồng Dữ Liệu Chi Tiết

### Luồng 1: Tạo Connection

\`\`\`
Client Request
    ↓
POST /api/connections
    ↓
Router::dispatch()
    ↓
ConnectionController::create()
    ├─ Đọc JSON body
    ├─ Validate dữ liệu
    └─ Gọi ConnectionService::create()
        ├─ Normalize dữ liệu
        ├─ Thêm timestamps
        └─ Gọi ConnectionRepository::insert()
            ├─ Tạo MongoDB BulkWrite
            ├─ Insert vào collection 'api_connections'
            └─ Trả về document với _id
                ↓
            MongoDB lưu trữ
                ↓
            Response JSON trả về Client
\`\`\`

### Luồng 2: Thực Thi Pipeline (Manual)

\`\`\`
Client Request
    ↓
POST /api/execute-run
    ↓
PipelineController::executeRun()
    ├─ Validate connectionId
    ├─ Gọi HttpClient::request()
    │   ├─ Thực thi HTTP request
    │   └─ Trả về response
    └─ Gọi RunService::create()
        ├─ Lưu kết quả vào MongoDB
        └─ Cập nhật connection stats
            ↓
        MongoDB lưu trữ Run
            ↓
        Response JSON trả về Client
\`\`\`

### Luồng 3: Lên Lịch với Airflow (Automated)

\`\`\`
Client Request
    ↓
POST /api/schedules
    ↓
ScheduleManagementController::create()
    ├─ Validate dữ liệu
    ├─ Tính dagId = "api_schedule_{scheduleId}"
    ├─ Lưu vào MongoDB (với dagId)
    └─ Gọi AirflowService::createDAG()
        ├─ Gọi Airflow REST API
        └─ Tạo DAG từ schedule_dag_generator.py
            ↓
        Airflow Scheduler
            ├─ Theo dõi cron expression
            └─ Trigger DAG theo lịch
                ↓
            DAG Execution
                ├─ Gọi API backend: POST /api/execute-run
                ├─ Lưu kết quả vào MongoDB
                └─ Cập nhật schedule stats
                    ↓
                Response trả về Airflow
                    ↓
                Integrator có thể xem lịch sử:
                GET /api/schedules/{id}/airflow-history
\`\`\`

---

## 📊 Các Collection MongoDB

### 1. **api_connections** - Lưu trữ kết nối API
\`\`\`json
{
  "_id": ObjectId("..."),
  "connectionId": "conn_123",
  "name": "My API Connection",
  "description": "Kết nối đến API bên ngoài",
  "apiConfig": {
    "baseUrl": "https://api.example.com/data",
    "method": "GET",
    "headers": {
      "Authorization": "Bearer token",
      "Content-Type": "application/json"
    },
    "authType": "bearer"
  },
  "isActive": true,
  "createdAt": "2024-10-24T10:30:00Z",
  "lastRun": "2024-10-24T11:00:00Z",
  "totalRuns": 42,
  "successRate": 95
}
\`\`\`

### 2. **runs** - Lưu trữ lịch sử chạy pipeline
\`\`\`json
{
  "_id": ObjectId("..."),
  "connectionId": "conn_123",
  "status": "completed",
  "startedAt": "2024-10-24T11:00:00Z",
  "duration": 2500,
  "recordsExtracted": 150,
  "errorMessage": null,
  "createdAt": "2024-10-24T11:00:00Z"
}
\`\`\`

### 3. **schedules** - Lưu trữ lịch trình tự động
\`\`\`json
{
  "_id": ObjectId("..."),
  "connectionId": "conn_123",
  "cronExpression": "0 */6 * * *",
  "dagId": "api_schedule_507f1f77bcf86cd799439012",
  "isActive": true,
  "lastRun": "2024-10-24T06:00:00Z",
  "nextRun": "2024-10-24T12:00:00Z",
  "createdAt": "2024-10-24T10:30:00Z"
}
\`\`\`

---

## 🛠️ Công Nghệ Sử Dụng

| Thành Phần | Công Nghệ | Mục Đích |
|-----------|----------|---------|
| **Backend** | PHP 8.0+ | Xử lý API logic |
| **Database** | MongoDB | Lưu trữ dữ liệu NoSQL |
| **Scheduling** | Apache Airflow | Lên lịch tự động |
| **HTTP Client** | cURL | Gọi API bên ngoài |
| **Routing** | Custom Router | Định tuyến requests |
| **Architecture** | MVC + Service + Repository | Design pattern |

---

## 📁 Cấu Trúc Thư Mục

\`\`\`
/
├── app/
│   ├── Config/
│   │   └── Database.php              # Cấu hình MongoDB
│   ├── Controllers/                  # HTTP Controllers
│   │   ├── ConnectionController.php
│   │   ├── RunController.php
│   │   ├── PipelineController.php
│   │   ├── ScheduleController.php
│   │   ├── ScheduleManagementController.php
│   │   ├── AirflowController.php
│   │   ├── AdminUserController.php
│   │   ├── AdminRoleController.php
│   │   ├── AdminSystemController.php
│   │   ├── AdminBackupController.php
│   │   ├── DataExportController.php
│   │   ├── DataSearchController.php
│   │   ├── ReportController.php
│   │   ├── VisualizationController.php
│   │   └── ...
│   ├── Services/                     # Business Logic
│   │   ├── ConnectionService.php
│   │   ├── RunService.php
│   │   ├── ScheduleService.php
│   │   ├── AirflowService.php
│   │   └── ...
│   ├── Repositories/                 # Data Access Layer
│   │   ├── ConnectionRepository.php
│   │   ├── RunRepository.php
│   │   ├── ScheduleRepository.php
│   │   └── ...
│   └── Support/
│       ├── Router.php                # Custom Router
│       ├── HttpClient.php            # HTTP Client
│       └── Env.php                   # Environment Variables
├── dags/                             # Airflow DAGs
│   ├── api_schedule_sync_dag.py      # Sync schedules từ MongoDB
│   ├── api_execution_dag.py          # Thực thi API calls
│   └── schedule_dag_generator.py     # Generate DAGs động
├── routes/
│   └── api.php                       # API Route Definitions
├── docker-compose.yml                # Docker Compose Config
├── Dockerfile                        # Docker Image
├── package.json                      # Dependencies
└── README.md                         # Documentation
\`\`\`

---

## 🔐 Lưu Trữ Dữ Liệu

### Cách Dữ Liệu Được Lưu Trữ

1. **MongoDB Documents**: Tất cả dữ liệu được lưu dưới dạng JSON documents
2. **Collections**: Dữ liệu được tổ chức thành các collections
3. **ObjectId**: MongoDB tự động tạo `_id` cho mỗi document
4. **Timestamps**: Mỗi document có `createdAt` timestamp
5. **DAG ID**: Schedules lưu `dagId` để dễ dàng truy vấn Airflow

### Ví Dụ Lưu Trữ

\`\`\`
ConnectionController::create()
  ↓
ConnectionService::create()
  ↓
ConnectionRepository::insert()
  ↓
MongoDB BulkWrite
  ↓
Document được lưu vào collection 'api_connections'
\`\`\`

---

## 🚀 Quy Trình Thực Thi

### Request → Response Flow

\`\`\`
1. Client gửi HTTP Request
   ↓
2. Router::dispatch() - Tìm route matching
   ↓
3. Controller - Xử lý HTTP logic
   ↓
4. Service - Xử lý business logic
   ↓
5. Repository - Tương tác MongoDB
   ↓
6. MongoDB - Lưu/Lấy dữ liệu
   ↓
7. Response - JSON trả về Client
\`\`\`

---

## 🔄 Airflow Integration

### Cách Airflow Hoạt Động

1. **DAG Generator**: Tự động tạo DAGs từ MongoDB schedules
2. **Scheduler**: Theo dõi cron expressions
3. **Executor**: Thực thi DAGs theo lịch
4. **Monitoring**: Web UI để xem status và logs

### DAG ID Mapping

\`\`\`
Schedule trong MongoDB:
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "cronExpression": "0 */6 * * *",
  "dagId": "api_schedule_507f1f77bcf86cd799439012"
}

Airflow DAG:
- DAG ID: api_schedule_507f1f77bcf86cd799439012
- Schedule: 0 */6 * * * (mỗi 6 giờ)
- Task: Gọi API backend /api/execute-run
\`\`\`

### Sync Process

\`\`\`
Airflow Scheduler (mỗi giờ)
    ↓
schedule_dag_sync_dag.py
    ├─ Lấy tất cả schedules từ MongoDB
    ├─ So sánh với DAGs hiện tại
    ├─ Tạo DAGs mới
    ├─ Cập nhật DAGs thay đổi
    └─ Xóa DAGs không còn
\`\`\`

---

## 📊 Thống Kê Hệ Thống

| Thành Phần | Số Lượng |
|-----------|---------|
| Controllers | 20+ |
| Services | 10+ |
| Repositories | 5+ |
| API Endpoints | 51 |
| MongoDB Collections | 3+ |
| Airflow DAGs | Dynamic |

---

## 🔐 Security Features

- Role-based Access Control (RBAC)
- Bearer token authentication
- Input validation & sanitization
- Error handling & logging
- Audit trail tracking
- Backup & restore functionality

---

## 📝 Tóm Tắt

- **Kiến Trúc**: MVC + Service + Repository Pattern
- **Database**: MongoDB (NoSQL)
- **Scheduling**: Apache Airflow
- **Luồng**: Request → Router → Controller → Service → Repository → MongoDB
- **Lưu Trữ**: Documents JSON trong MongoDB collections
- **API**: RESTful API với 51 endpoints
- **Mục Đích**: Quản lý, kiểm thử và thực thi API pipelines với lên lịch tự động
