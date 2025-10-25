# Hướng dẫn cài đặt & chạy backend (backendphp)

Tệp này mô tả các bước thiết lập, cài đặt phụ thuộc và chạy backend PHP cục bộ trong Windows PowerShell.

**LƯU Ý**: Hướng dẫn này viết cho repo hiện tại (`backendphp`), giả sử bạn đang làm việc trên Windows PowerShell. Backend này tích hợp với Apache Airflow để quản lý workflow.

---

## Yêu cầu hệ thống
- **PHP >= 8.3** (có lệnh `php` trong PATH)
- **Composer** (có lệnh `composer` trong PATH)
- **Docker & Docker Compose** (bắt buộc cho Airflow)
- **MongoDB** (Atlas hoặc local instance)
- **Git** (để clone repo nếu cần)

---

## 1. Chuyển vào thư mục backend

```powershell
cd D:\project\no-code-api-connector\backendphp
```

---

## 2. Cài đặt phụ thuộc PHP

```powershell
composer install
```

- Composer sẽ tạo `vendor/` và `composer.lock` nếu chưa có.

---

## 3. Cấu hình môi trường

- Tạo file `.env` từ mẫu:

```powershell
copy .env.example .env
notepad .env
```

- Các biến quan trọng cần cấu hình:
  - `APP_ENV=development`
  - `MONGODB_URI` (MongoDB connection string)
  - `AIRFLOW_ACCESS_TOKEN` (sẽ được tạo sau)
  - Các API keys khác nếu cần

---

## 4. Cài đặt và cấu hình Apache Airflow

Backend này sử dụng Airflow để quản lý workflow. Làm theo các bước sau:

### 4.1. Tải Docker Compose config cho Airflow

```powershell
Invoke-WebRequest -Uri 'https://airflow.apache.org/docs/apache-airflow/3.1.0/docker-compose.yaml' -OutFile 'docker-compose.yaml'
```

### 4.2. Tạo cấu trúc thư mục Airflow

```powershell
New-Item -ItemType Directory -Path ./dags -Force
New-Item -ItemType Directory -Path ./logs -Force
New-Item -ItemType Directory -Path ./plugins -Force
New-Item -ItemType Directory -Path ./config -Force
```

### 4.3. Khởi tạo Airflow

```powershell
# Khởi tạo database và user mặc định
docker compose up airflow-init

# Khởi động toàn bộ dịch vụ
docker compose up -d
```

- Airflow UI: http://localhost:8080
- Username: `airflow`
- Password: `airflow`

### 4.4. Lấy JWT Token cho API

```powershell
$ENDPOINT_URL = "http://localhost:8080"
$body = @{
    username = "airflow"
    password = "airflow"
} | ConvertTo-Json

$response = Invoke-WebRequest -Method POST -Uri "$ENDPOINT_URL/auth/token" -Headers @{ "Content-Type" = "application/json" } -Body $body

# Lưu access_token vào .env
$tokenData = $response.Content | ConvertFrom-Json
$tokenData.access_token | Out-File -FilePath "access_token.json" -Encoding UTF8

# Copy token vào .env
notepad .env  # Thêm AIRFLOW_ACCESS_TOKEN=<token>
```

### 4.5. Cấu hình CORS (tùy chọn)

Mở `airflow.cfg` và thêm:

```ini
[api]
access_control_allow_headers = origin, content-type, accept
access_control_allow_methods = POST, GET, OPTIONS, DELETE
access_control_allow_origins = http://localhost:8000 http://localhost:3000
maximum_page_limit = 100
```

---

## 5. Chạy server PHP

```powershell
php -S localhost:8000 -t public
```

- Backend API: http://localhost:8000
- Kết hợp với Airflow UI tại http://localhost:8080

---

## 6. Chạy tests

```powershell
cd D:\project\no-code-api-connector\backendphp
composer require --dev "phpunit/phpunit:^10"
php vendor/bin/phpunit
```

---

## 7. Gợi ý xử lý sự cố

### PHP/Composer issues:
- Nếu `composer install` báo lỗi: kiểm tra PHP version và composer.json

### Airflow issues:
- Nếu Docker compose fail: đảm bảo Docker Desktop đang chạy
- Nếu không kết nối được Airflow API: kiểm tra token trong .env
- Nếu CORS errors: cấu hình airflow.cfg như trên

### Database issues:
- Nếu MongoDB connection fail: kiểm tra MONGODB_URI trong .env

### Port conflicts:
- Backend: 8000
- Airflow UI: 8080
- Frontend: 3000

---

## 8. Workflow phát triển

1. **Development**: Chạy `php -S localhost:8000` và `docker compose up -d`
2. **Testing**: `php vendor/bin/phpunit`
3. **API Testing**: Sử dụng Postman hoặc curl để test endpoints
4. **DAG Development**: Thêm DAG files vào `dags/` folder

---

## 9. Scripts tiện ích

### Script khởi động nhanh

Chạy file `start-dev.ps1` để khởi động cả Airflow và PHP server:

```powershell
.\start-dev.ps1
```

Script này sẽ:
- Khởi động Airflow với Docker Compose
- Chờ Airflow sẵn sàng
- Khởi động PHP server
- Hiển thị URLs và thông tin đăng nhập

### Dừng services

```powershell
docker compose down
```
