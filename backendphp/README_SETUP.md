# Hướng dẫn cài đặt & chạy backend (backendphp)

Tệp này mô tả các bước thiết lập, cài đặt phụ thuộc và chạy backend PHP cục bộ trong Windows PowerShell.

LƯU Ý: hướng dẫn này viết cho repo hiện tại (`backendphp`), giả sử bạn đang làm việc trên Windows PowerShell.

---
Yêu cầu trước khi chạy
- PHP >= 8.3 (có lệnh `php` trong PATH)
- Composer (có lệnh `composer` trong PATH)
- Docker & Docker Compose (nếu muốn chạy trong container)
- (Tùy dự án) MongoDB / MySQL nếu backend cần DB. Thiết lập các biến môi trường phù hợp.

1) Chuyển vào thư mục backend

```powershell
cd D:\project\no-code-api-connector\backendphp
```

2) Cài đặt phụ thuộc PHP

```powershell
composer install
```

- Composer sẽ tạo `vendor/` và `composer.lock` nếu chưa có.

3) Cấu hình môi trường

- Nếu repo có mẫu `.env.example`, tạo file `.env`:

```powershell
copy .env.example .env
notepad .env
```

- Mọi biến quan trọng thường gồm:
  - `APP_ENV` (development/production)
  - `MONGODB_URI` hoặc `DATABASE_URL` (nếu dùng MongoDB/MySQL)
  - Credentials cho các dịch vụ (API keys, SMTP…)

4) (Tùy) Chạy migration/seed nếu dự án sử dụng framework có migration (ví dụ Laravel):

```powershell
# Laravel example
php artisan migrate --seed
```

5) Chạy server phát triển (built-in PHP server)

- Nếu ứng dụng có thư mục `public/` (thường cho Laravel/Front controllers):

```powershell
php -S localhost:8000 -t public
```

- Nếu không có `public/`, chạy từ thư mục gốc:

```powershell
php -S localhost:8000
```

Mở trình duyệt vào: http://localhost:8000

6) Chạy test

```powershell
cd D:\project\no-code-api-connector\backendphp
./vendor/bin/phpunit --color=never
```

7) Chạy bằng Docker Compose (nếu muốn containerized)

```powershell
cd D:\project\no-code-api-connector\backendphp
docker-compose up --build
```

8) Gợi ý xử lý sự cố
- Nếu `composer install` báo lỗi schema: kiểm tra `composer.json` -> `name` phải theo format `vendor/package` (lowercase) — đã sửa trong repo nếu cần.
- Nếu PHPUnit cảnh báo schema XML: cập nhật `phpunit.xml` để tương thích với phiên bản PHPUnit đã cài.
- Nếu endpoint trả lỗi liên quan DB: kiểm tra các biến môi trường trong `.env` (ví dụ `MONGODB_URI`).

9) Liên hệ và các bước nâng cao
- Muốn chạy backend cùng frontend (full stack): khởi frontend (`frontend_php`) ở port 3000 và backend ở 8000; sửa proxy/CORS nếu cần.
- Muốn tôi thực hiện: `composer install`, chạy server hoặc chạy test tự động — xác nhận và tôi sẽ chạy trong workspace cho bạn.

---
File này là hướng dẫn cơ bản. Nếu bạn muốn tôi tạo thêm script PowerShell để khởi dev (vd `start-dev.ps1`) hoặc cấu hình Docker Compose cho phát triển, nói cho tôi biết.