# No-Code API Connector - Docker Setup

Hướng dẫn chạy toàn bộ hệ thống bằng Docker để phát triển và triển khai dễ dàng.

## Yêu cầu hệ thống

- Docker >= 20.10
- Docker Compose >= 2.0
- Ít nhất 4GB RAM
- Ít nhất 10GB dung lượng ổ cứng

## Cấu trúc services

- **MongoDB**: Cơ sở dữ liệu chính (Port 27017)
- **Backend (PHP)**: API backend (Port 8000)
- **Frontend (Next.js)**: Giao diện người dùng (Port 3000)
- **Redis**: Cache (optional, Port 6379)
- **Airflow**: Workflow orchestration (optional, Port 8080)
- **PostgreSQL**: Database cho Airflow (optional)

## Chạy toàn bộ hệ thống

### 1. Clone repository

```bash
git clone https://github.com/Luna777247/no-code-api-connector.git
cd no-code-api-connector
```

### 2. Khởi động Docker Desktop

**Quan trọng**: Trước khi chạy docker-compose, bạn phải khởi động Docker Desktop.

#### Tự động (khuyến nghị):
```bash
# Chạy script tự động khởi động Docker
.\start-docker.ps1
```

#### Thủ công:
1. Mở Docker Desktop từ Start Menu hoặc Desktop shortcut
2. Chờ cho Docker Desktop khởi động hoàn toàn (thấy icon whale xanh)
3. Có thể mất 1-2 phút cho lần đầu tiên

#### Kiểm tra Docker đã sẵn sàng:
```bash
docker info
```

### 3. Chạy với Docker Compose

```bash
# Chạy tất cả services (bao gồm Airflow)
docker-compose up -d

# Hoặc chỉ chạy core services (không có Airflow)
docker-compose up -d mongodb backend frontend
```

### 3. Kiểm tra trạng thái

```bash
# Xem logs
docker-compose logs -f

# Kiểm tra services đang chạy
docker-compose ps
```

## Truy cập ứng dụng

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **MongoDB**: localhost:27017 (admin/password123)
- **Airflow UI**: http://localhost:8080 (airflow/airflow)
- **Redis**: localhost:6379

## Database seeding

Sau khi MongoDB khởi động, database sẽ tự động được tạo với dữ liệu mẫu bao gồm:

- 1 connection mẫu (JSONPlaceholder API)
- Collections: api_connections, api_runs, api_schedules, parameter_modes
- Indexes cần thiết cho performance

## Development workflow

### Rebuild services

```bash
# Rebuild backend
docker-compose build backend
docker-compose up -d backend

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### View logs

```bash
# Logs của tất cả services
docker-compose logs -f

# Logs của service cụ thể
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Stop và cleanup

```bash
# Stop tất cả services
docker-compose down

# Stop và xóa volumes (xóa data)
docker-compose down -v

# Stop và xóa images
docker-compose down --rmi all
```

## Troubleshooting

### MongoDB connection issues

```bash
# Kiểm tra MongoDB container
docker-compose exec mongodb mongo --eval "db.stats()"

# Restart MongoDB
docker-compose restart mongodb
```

### Backend không kết nối được

```bash
# Kiểm tra backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Frontend build fails

```bash
# Rebuild frontend với no-cache
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Port conflicts

Nếu các port 3000, 8000, 27017 đã được sử dụng:

```bash
# Chỉnh sửa ports trong docker-compose.yml
# Ví dụ: đổi frontend port từ 3000:3001 thành 3001:3001
```

## Production deployment

### Sử dụng environment variables

Tạo file `.env` trong thư mục gốc:

```env
# MongoDB
MONGO_ROOT_USERNAME=your_admin_user
MONGO_ROOT_PASSWORD=your_secure_password

# Airflow
AIRFLOW_FERNET_KEY=your_fernet_key_here

# Custom ports (optional)
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

### SSL/TLS

Để thêm SSL, sử dụng reverse proxy như Nginx hoặc Traefik phía trước các containers.

## Backup và Restore

### Backup MongoDB

```bash
# Backup
docker-compose exec mongodb mongodump --db dataplatform_db --out /backup

# Copy ra host
docker cp $(docker-compose ps -q mongodb):/backup ./mongodb_backup
```

### Restore MongoDB

```bash
# Copy backup vào container
docker cp ./mongodb_backup $(docker-compose ps -q mongodb):/backup

# Restore
docker-compose exec mongodb mongorestore --db dataplatform_db /backup/dataplatform_db
```

## Performance tuning

### Memory limits

```yaml
# Trong docker-compose.yml, thêm memory limits
services:
  mongodb:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

### Scaling

```bash
# Scale backend services
docker-compose up -d --scale backend=3
```

## Contributing

1. Fork repository
2. Tạo feature branch
3. Test với Docker setup
4. Submit pull request

## Support

Nếu gặp vấn đề, kiểm tra:
1. Docker và Docker Compose đã cài đặt đúng
2. Ports không bị conflict
3. Đủ RAM và disk space
4. Firewall không block các ports cần thiết