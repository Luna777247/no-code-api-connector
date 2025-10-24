# Phân Tích Airflow cho Hệ Thống Lên Lịch API

## 1. Hiện Trạng

### Cấu Hình Hiện Có
- ✅ **Airflow đã được cấu hình** trong `docker-compose.yml`
- ✅ **PostgreSQL** làm database cho Airflow
- ✅ **Redis** cho caching
- ✅ **Airflow Scheduler & Worker** đã setup
- ✅ **DAGs đã được triển khai** trong folder `/dags`

### Vấn Đề Đã Giải Quyết
1. ✅ **Schedules được lưu trữ** trong MongoDB và **được thực thi tự động** bởi Airflow
2. ✅ **Cron expressions được định nghĩa** và **có cơ chế trigger tự động**
3. ✅ **Monitoring** cho việc chạy scheduled tasks qua Airflow UI
4. ✅ **Retry logic** khi API call thất bại (3 lần, delay 5 phút)

## 2. Kiến Trúc Lưu Trữ DAG ID

### Cách Lưu Trữ
- **DAG ID Format**: `api_schedule_{scheduleId}`
- **Lưu Trữ**: Trong MongoDB collection `api_schedules`, field `dagId`
- **Tạo Tự Động**: Khi schedule được tạo, `dagId` được tính toán và lưu vào MongoDB
- **Truy Vấn**: Dễ dàng tìm kiếm schedule theo `dagId`

### Ví Dụ MongoDB Document
\`\`\`json
{
  "_id": "507f1f77bcf86cd799439011",
  "dagId": "api_schedule_507f1f77bcf86cd799439011",
  "connectionId": "conn_123",
  "cronExpression": "0 * * * *",
  "name": "Hourly API Sync",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
\`\`\`

## 3. Luồng Thực Thi

\`\`\`
1. Tạo Schedule
   POST /api/schedules
   ↓
2. Lưu vào MongoDB + Tính dagId
   dagId = "api_schedule_{scheduleId}"
   ↓
3. Airflow DAG Generator đọc từ MongoDB
   ↓
4. Tạo DAG động với ID = dagId
   ↓
5. Airflow Scheduler thực thi theo cron
   ↓
6. Lưu kết quả vào MongoDB collection 'runs'
\`\`\`

## 4. Các DAGs Được Tạo

| DAG ID | Mô Tả | Tần Suất |
|--------|-------|---------|
| `api_schedule_{scheduleId}` | Thực thi API call theo cron | Theo schedule |
| `api_schedule_sync` | Đồng bộ schedules từ MongoDB | Mỗi giờ |

## 5. Lợi Ích

- ✅ Thực thi tự động theo cron schedule
- ✅ Retry tự động 3 lần khi thất bại
- ✅ Monitoring & alerting qua Airflow UI
- ✅ Dependency management
- ✅ Scalable cho hàng trăm schedules
- ✅ DAG ID được lưu trữ trong MongoDB để dễ truy vấn

## 6. Kết Luận
**✅ AIRFLOW ĐÃ ĐƯỢC TRIỂN KHAI HOÀN CHỈNH** với:
- Lưu trữ DAG ID trong MongoDB
- Thực thi tự động các scheduled tasks
- Monitoring và retry logic
- Khả năng xử lý hàng trăm schedules đồng thời
