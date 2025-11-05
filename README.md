# 📊 No-Code API Connector - Data Platform

[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)](https://mongodb.com/atlas)
[![Airflow](https://img.shields.io/badge/Apache-Airflow-orange)](https://airflow.apache.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)

> 🚀 **Nền tảng thu thập và quản lý dữ liệu API không cần code**

## 🎯 Tổng Quan

**No-Code API Connector** là một hệ thống data platform toàn diện cho phép bạn:

- 🔗 **Kết nối API** dễ dàng qua giao diện web
- 📅 **Tự động hóa thu thập dữ liệu** với Airflow scheduling
- 📊 **Phân tích và trực quan hóa** dữ liệu real-time
- 🔍 **Tìm kiếm và xuất dữ liệu** linh hoạt
- ⚙️ **Quản lý tham số động** cho API configurations

### ✨ Kiến Trúc Hệ Thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   PHP Backend   │    │   MongoDB       │
│   Frontend      │◄──►│   API Server    │◄──►│   Atlas Cloud   │
│   (Port 3000)   │    │   (Port 8000)   │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   Apache       │
                    │   Airflow      │
                    │   (Port 8080)  │
                    └─────────────────┘
```

## 🚀 Bắt Đầu Nhanh

### 1. Yêu Cầu Hệ Thống
- Docker Desktop 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum
- 10GB disk space

### 2. Cài Đặt và Chạy

```bash
# Clone repository
git clone https://github.com/Luna777247/no-code-api-connector.git
cd no-code-api-connector

# Chạy setup tự động (Windows)
.\setup.ps1
```

### 3. Truy Cập Ứng Dụng
- **🏠 Frontend**: http://localhost:3000
- **🔧 Backend API**: http://localhost:8000
- **🚀 Airflow UI**: http://localhost:8080 (airflow/airflow)

## 📚 Tài Liệu Hướng Dẫn

### 📖 [Hướng Dẫn Sử Dụng Chi Tiết](./USER_GUIDE.md)
Tài liệu đầy đủ cho người dùng cuối bao gồm:
- Cách tạo và quản lý API connections
- Cấu hình schedules tự động
- Phân tích dữ liệu và báo cáo
- Xuất dữ liệu và tìm kiếm nâng cao
- Troubleshooting và best practices

### 🔧 [Hướng Dẫn Cài Đặt Docker](./DOCKER_README.md)
Hướng dẫn kỹ thuật cho developers:
- Cấu hình Docker environment
- Database setup và migration
- Airflow configuration
- Production deployment

### 📋 [API Documentation](./BACKEND_API_ENDPOINTS.md)
Tham khảo API endpoints:
- RESTful API specifications
- Request/Response formats
- Authentication methods
- Error handling

## 🎨 Tính Năng Chính

### 🔗 Connection Management
- Tạo kết nối API dễ dàng qua UI
- Hỗ trợ tất cả HTTP methods (GET, POST, PUT, DELETE)
- Authentication: None, Basic, Bearer Token, API Key
- Test connection trước khi lưu
- Field mapping tự động

### 📅 Automated Scheduling
- Tích hợp Apache Airflow
- Cron expressions linh hoạt
- Multiple schedule types (daily, weekly, monthly, custom)
- Real-time monitoring và logging
- Manual trigger và retry failed runs

### 📊 Analytics & Reporting
- Dashboard với metrics real-time
- Success rate và performance tracking
- Data visualization charts
- Custom reports và exports
- Historical data analysis

### 🔍 Advanced Data Operations
- Full-text search across all data
- Advanced filtering và sorting
- Pagination cho large datasets
- Multiple export formats (JSON, CSV, XML)
- Data validation và transformation

### ⚙️ Dynamic Parameters
- Static và dynamic parameter modes
- Environment variable integration
- Database-driven parameters
- Template-based configurations

## 🛠️ Tech Stack

### Backend
- **PHP 8.3** - API server
- **MongoDB Atlas** - Cloud database
- **Apache Airflow 2.9** - Workflow orchestration
- **Redis** - Caching và message queue
- **PostgreSQL** - Airflow metadata

### Frontend
- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library

### DevOps
- **Docker & Docker Compose** - Containerization
- **GitHub Actions** - CI/CD
- **ESLint & Prettier** - Code quality

## 📊 System Architecture

### Data Flow
```
API Sources → Connections → Schedules → Runs → MongoDB Atlas
                                      ↓
                                 Airflow DAGs
                                      ↓
                                 Automated Execution
```

### Database Schema
- **api_connections**: Connection configurations
- **api_runs**: Execution history và results
- **api_schedules**: Schedule definitions
- **parameter_modes**: Dynamic parameter configurations

## 🚀 Quick Start Examples

### 1. Tạo Connection Đơn Giản
```bash
curl -X POST http://localhost:8000/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "JSON Placeholder API",
    "baseUrl": "https://jsonplaceholder.typicode.com/posts",
    "method": "GET"
  }'
```

### 2. Tạo Schedule
```bash
curl -X POST http://localhost:8000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "conn_123",
    "scheduleType": "daily",
    "cronExpression": "0 9 * * *"
  }'
```

### 3. Xem Analytics
```bash
curl http://localhost:8000/api/analytics/success-rate-history?days=7
```

## 🤝 Đóng Góp

Chúng tôi hoan nghênh mọi đóng góp!

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

### Development Setup
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development servers
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Liên Hệ

- **Project Link**: [https://github.com/Luna777247/no-code-api-connector](https://github.com/Luna777247/no-code-api-connector)
- **Issues**: [GitHub Issues](https://github.com/Luna777247/no-code-api-connector/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Luna777247/no-code-api-connector/discussions)

## 🙏 Acknowledgments

- [Apache Airflow](https://airflow.apache.org/) - Workflow orchestration
- [MongoDB Atlas](https://mongodb.com/atlas) - Cloud database
- [Next.js](https://nextjs.org/) - React framework
- [Docker](https://docker.com/) - Containerization platform

---

⭐ **Nếu bạn thấy project này hữu ích, hãy cho chúng tôi một ngôi sao!**