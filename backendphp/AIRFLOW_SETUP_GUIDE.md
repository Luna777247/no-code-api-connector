# Hướng Dẫn Triển Khai Airflow cho Hệ Thống Lên Lịch API

## 1. Cấu Hình Ban Đầu

### 1.1 Chuẩn Bị Environment Variables
\`\`\`bash
cp .env.example .env
# Chỉnh sửa .env với các giá trị thực tế
\`\`\`

### 1.2 Khởi Động Docker Compose
\`\`\`bash
docker-compose up -d
\`\`\`

Điều này sẽ khởi động:
- **PostgreSQL**: Database cho Airflow metadata
- **Redis**: Message broker cho Celery
- **Airflow Scheduler**: Thực thi DAGs theo lịch
- **Airflow Worker**: Xử lý các task
- **Airflow Webserver**: UI tại http://localhost:8080

### 1.3 Truy Cập Airflow UI
- URL: http://localhost:8080
- Username: airflow
- Password: airflow

## 2. Cách Hoạt Động

### 2.1 Luồng Thực Thi
\`\`\`
1. Người dùng tạo Schedule trong API
   POST /api/schedules
   {
     "connectionId": "conn_1",
     "cronExpression": "0 * * * *",  // Mỗi giờ
     "name": "Hourly API Sync"
   }

2. Backend tính toán DAG ID
   dagId = "api_schedule_{scheduleId}"
   Lưu vào MongoDB

3. Airflow DAG Generator tự động tạo DAG
   - Đọc từ MongoDB
   - Tạo DAG với ID = dagId
   - Schedule: Theo cron expression

4. Airflow Scheduler thực thi DAG theo lịch
   - Gọi API từ Connection
   - Lưu kết quả vào MongoDB

5. Kết quả được lưu trong collection 'runs'
   {
     "scheduleId": "...",
     "dagId": "api_schedule_...",
     "status": "success",
     "statusCode": 200,
     "recordsProcessed": 150,
     "executedAt": "2024-01-15T10:00:00Z",
     "triggeredBy": "airflow_scheduler"
   }
\`\`\`

### 2.2 Các DAGs Được Tạo

#### a) **schedule_dag_generator.py**
- Tự động tạo DAGs từ MongoDB schedules
- Chạy mỗi giờ để đồng bộ schedules mới
- Loại bỏ DAGs của schedules bị xóa

#### b) **api_schedule_{scheduleId}**
- DAG động cho mỗi schedule
- Thực thi API call theo cron expression
- Lưu kết quả vào MongoDB
- Retry tự động 3 lần nếu thất bại
- DAG ID được lưu trong MongoDB field `dagId`

#### c) **api_schedule_sync**
- Đồng bộ schedules từ MongoDB
- Chạy mỗi giờ
- Đảm bảo Airflow luôn có schedules mới nhất

## 3. API Endpoints cho Airflow

### 3.1 Trigger Manual Run
\`\`\`bash
POST /api/schedules/{scheduleId}/trigger

Response:
{
  "success": true,
  "dagRunId": "scheduled__2024-01-15T10:00:00+00:00",
  "state": "queued"
}
\`\`\`

### 3.2 Get Schedule Status
\`\`\`bash
GET /api/schedules/{scheduleId}/airflow-status

Response:
{
  "success": true,
  "dagId": "api_schedule_507f1f77bcf86cd799439011",
  "isPaused": false,
  "lastScheduledRun": "2024-01-15T10:00:00Z"
}
\`\`\`

### 3.3 Get Run History
\`\`\`bash
GET /api/schedules/{scheduleId}/airflow-history?limit=10

Response:
{
  "success": true,
  "runs": [
    {
      "runId": "scheduled__2024-01-15T10:00:00+00:00",
      "state": "success",
      "startDate": "2024-01-15T10:00:00Z",
      "endDate": "2024-01-15T10:00:05Z",
      "duration": 5
    }
  ]
}
\`\`\`

### 3.4 Pause Schedule
\`\`\`bash
POST /api/schedules/{scheduleId}/pause

Response:
{
  "success": true,
  "isPaused": true
}
\`\`\`

### 3.5 Resume Schedule
\`\`\`bash
POST /api/schedules/{scheduleId}/resume

Response:
{
  "success": true,
  "isPaused": false
}
\`\`\`

## 4. Monitoring & Troubleshooting

### 4.1 Xem Logs
\`\`\`bash
# Logs của Scheduler
docker-compose logs -f airflow-scheduler

# Logs của Worker
docker-compose logs -f airflow-worker

# Logs của Webserver
docker-compose logs -f airflow
\`\`\`

### 4.2 Kiểm Tra DAGs
\`\`\`bash
# Liệt kê tất cả DAGs
docker-compose exec airflow-scheduler airflow dags list

# Kiểm tra DAG cụ thể
docker-compose exec airflow-scheduler airflow dags show api_schedule_507f1f77bcf86cd799439011
\`\`\`

### 4.3 Xem Task Logs
Truy cập Airflow UI → DAG → Task → Logs

### 4.4 Vấn Đề Thường Gặp

#### DAG không xuất hiện
- Kiểm tra file DAG có lỗi syntax
- Restart Scheduler: `docker-compose restart airflow-scheduler`
- Kiểm tra logs: `docker-compose logs airflow-scheduler`
- Kiểm tra MongoDB connection

#### Task thất bại
- Kiểm tra API connection có hoạt động
- Xem task logs trong Airflow UI
- Kiểm tra MongoDB connection
- Kiểm tra dagId trong MongoDB

#### Retry không hoạt động
- Kiểm tra `retries` trong DAG (mặc định: 3)
- Kiểm tra `retry_delay` (mặc định: 5 phút)

## 5. Cấu Hình Nâng Cao

### 5.1 Thay Đổi Executor
\`\`\`bash
# Trong .env
AIRFLOW_EXECUTOR=CeleryExecutor  # Mặc định
# hoặc
AIRFLOW_EXECUTOR=LocalExecutor   # Cho development
\`\`\`

### 5.2 Thay Đổi Retry Policy
Chỉnh sửa trong `dags/schedule_dag_generator.py`:
\`\`\`python
default_args = {
    'retries': 5,  # Tăng số lần retry
    'retry_delay': timedelta(minutes=10),  # Tăng delay
}
\`\`\`

### 5.3 Thêm Alerts
\`\`\`python
# Trong DAG
on_failure_callback=send_alert_email,
on_retry_callback=send_retry_notification,
\`\`\`

## 6. Best Practices

1. **Monitoring**: Kiểm tra Airflow UI định kỳ
2. **Logs**: Lưu logs để debug
3. **Backup**: Backup MongoDB schedules và runs
4. **Testing**: Test API connections trước khi tạo schedule
5. **Scaling**: Thêm workers nếu có nhiều schedules
6. **DAG ID**: Luôn kiểm tra dagId trong MongoDB để đảm bảo đồng bộ

## 7. Tắt Airflow

\`\`\`bash
docker-compose down
\`\`\`

---

**Lưu ý**: 
- Airflow sẽ tự động tạo DAGs từ MongoDB schedules
- DAG ID được lưu trong MongoDB field `dagId` để dễ truy vấn
- Không cần tạo DAGs thủ công
