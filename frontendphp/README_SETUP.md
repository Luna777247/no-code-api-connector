# Frontend (frontendphp) — Hướng dẫn cài đặt & chạy (Windows PowerShell)

Tệp này mô tả cách cài đặt và chạy frontend Next.js (thư mục `frontendphp`) trên Windows PowerShell.

Yêu cầu
- Node.js (phiên bản LTS, ví dụ >=18). Kiểm tra bằng `node -v`.
- npm (đi kèm Node) hoặc pnpm/yarn nếu bạn muốn.

1) Chuyển vào thư mục frontend

```powershell
cd D:\project\no-code-api-connector\frontendphp
```

2) Cài đặt phụ thuộc

```powershell
npm install
```

Ghi chú: repo dùng Next.js 15. Nếu cài gặp cảnh báo peer-deps, bạn có thể thêm `--legacy-peer-deps`.

3) Chạy server phát triển

Frontend dev script (định nghĩa trong `package.json`):
- `npm run dev` — chạy Next.js dev server (theo cấu hình repo sẽ khởi động trên port 3001)

Chạy:

```powershell
npm run dev
```

Mặc định `start` script là `next start -p 3001` (dùng cho production build).

4) Build & Start (production-like)

```powershell
npm run build
npm run start
```

5) Môi trường & ports
- Dev server mặc định: http://localhost:3000 (hoặc 3001 theo script `start`) — kiểm tra output của `npm run dev` để biết port chính xác.
- Nếu frontend cần gọi backend local, đảm bảo backend PHP đang chạy (ví dụ `php -S localhost:8000 -t public`).
- Nếu cần cấu hình biến môi trường, tạo `.env.local` bên trong `frontendphp/` theo nhu cầu (Next.js loads `.env.local`).

6) Vấn đề phổ biến
- Nếu gặp lỗi module hoặc phiên bản React/Next không tương thích: thử xóa `node_modules` và lockfile (`pnpm-lock.yaml` hoặc `package-lock.json`) rồi chạy `npm install` lại.
- Nếu dev server không khởi động do port bị chiếm: chỉ định PORT trước khi chạy: `set PORT=3002; npm run dev` (PowerShell: `$env:PORT=3002; npm run dev`).

7) Chạy tests (nếu có)
- Frontend repo không có test runner mặc định trong `frontendphp` folder. Nếu bạn thêm tests, dùng `npm test` hoặc thư viện test bạn cấu hình.

8) Tài nguyên và notes
- `package.json` chứa scripts chính: `dev`, `build`, `start`.

Nếu bạn muốn, tôi có thể:
- Thêm một script PowerShell `start-frontend.ps1` để khởi dev server với envs đã cấu hình.
- Cập nhật README với các lệnh debug cụ thể hoặc setup proxy đến backend.

---
Cập nhật lần cuối: 2025-10-25
