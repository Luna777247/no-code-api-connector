# No-Code API Connector - Docker Setup

Hướng dẫn chạy toàn bộ hệ thống bằng Docker để phát triển và triển khai dễ dàng.

## Yêu cầu hệ thống

- Docker >= 20.10
- Docker Compose >= 2.0
- Ít nhất 4GB RAM
- Ít nhất 10GB dung lượng ổ cứng

## Cấu trúc services

- **MongoDB Atlas**: Cơ sở dữ liệu đám mây (SRV connection) - **KHÔNG** chạy local MongoDB container
- **Backend (PHP)**: API backend (Port 8000) - kết nối đến MongoDB Atlas
- **Frontend (Next.js)**: Giao diện người dùng (Port 3000)
- **Redis**: Cache (optional, Port 6379)
- **Airflow**: Workflow orchestration (optional, Port 8080) - cần khởi tạo database
- **PostgreSQL**: Database cho Airflow (optional)

## Chạy toàn bộ hệ thống

### 1. Clone repository

```bash
git clone https://github.com/Luna777247/no-code-api-connector.git
cd no-code-api-connector
```

### 2. Khởi động Docker Desktop

**Quan trọng**: Trước khi chạy docker-compose, bạn phải khởi động Docker Desktop.

### Tự động (khuyến nghị):
```bash
# Chạy script setup tự động (Windows)
.\setup.ps1

# Hoặc chạy từng bước thủ công
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
# Chạy tất cả services (backend, frontend, Redis, Airflow, PostgreSQL)
# KHÔNG bao gồm MongoDB local vì chúng ta dùng MongoDB Atlas
docker-compose up -d

# Hoặc chỉ chạy core services (backend + frontend)
docker-compose up -d backend frontend
```

### 3. Khởi tạo Airflow Database (bắt buộc cho lần đầu)

Sau khi containers đã chạy, bạn cần khởi tạo Airflow database:

```bash
# Khởi tạo database
docker-compose exec airflow-webserver airflow db migrate

# Tạo admin user (thay đổi username/password nếu muốn)
docker-compose exec airflow-webserver airflow users create \
  --username airflow \
  --password airflow \
  --firstname Airflow \
  --lastname Admin \
  --role Admin \
  --email admin@example.com
```

### 4. Kiểm tra trạng thái

## Truy cập ứng dụng

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **MongoDB Atlas**: Quản lý qua MongoDB Atlas Dashboard (không cần truy cập local)
- **Airflow UI**: http://localhost:8080 (airflow/airflow)
- **Redis**: localhost:6379

## Quick Start

### 1. Chuẩn bị
- Đảm bảo Docker Desktop đang chạy
- Kiểm tra MongoDB Atlas connection string trong `docker-compose.yml`

### 2. Chạy hệ thống
```bash
# Clone và vào thư mục
git clone https://github.com/Luna777247/no-code-api-connector.git
cd no-code-api-connector

# Chạy tất cả services
docker-compose up -d

# Khởi tạo Airflow database (chỉ cần lần đầu)
docker-compose exec airflow-webserver airflow db migrate
docker-compose exec airflow-webserver airflow users create --username airflow --password airflow --firstname Airflow --lastname Admin --role Admin --email admin@example.com
```

### 3. Truy cập
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/data
- **Airflow UI**: http://localhost:8080 (airflow/airflow)

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
# Kiểm tra backend logs để xem lỗi kết nối MongoDB Atlas
docker-compose logs backend

# Restart backend
docker-compose restart backend

# Kiểm tra biến môi trường MONGODB_URI trong docker-compose.yml
# Đảm bảo connection string MongoDB Atlas đúng và có quyền truy cập
```

### Backend không kết nối được

```bash
# Kiểm tra backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend
```

### Airflow webserver không khởi động được

```bash
# Kiểm tra logs
docker-compose logs airflow-webserver

# Khởi tạo database nếu chưa có
docker-compose exec airflow-webserver airflow db migrate

# Tạo admin user
docker-compose exec airflow-webserver airflow users create \
  --username airflow \
  --password airflow \
  --firstname Airflow \
  --lastname Admin \
  --role Admin \
  --email admin@example.com

# Restart Airflow services
docker-compose restart airflow-webserver airflow-scheduler
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
# MongoDB Atlas
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/dataplatform_db

# Airflow
AIRFLOW_FERNET_KEY=Ct6eDwd0qU3kApoLB-vbcSp6_yybH-6TCI9bMfpW3Rs=

# Custom ports (optional)
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

### SSL/TLS

Để thêm SSL, sử dụng reverse proxy như Nginx hoặc Traefik phía trước các containers.

## Backup và Restore

### Backup MongoDB Atlas

Sử dụng MongoDB Atlas Dashboard hoặc mongodump:

```bash
# Backup từ Atlas cluster
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/dataplatform_db" --out=./atlas_backup

# Hoặc sử dụng MongoDB Compass để export data
```

### Restore MongoDB Atlas

```bash
# Restore vào Atlas cluster
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/dataplatform_db" ./atlas_backup/dataplatform_db

# Hoặc sử dụng MongoDB Compass để import data
```

## Performance tuning

### Memory limits

```yaml
# Trong docker-compose.yml, thêm memory limits cho các services
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
  
  frontend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
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