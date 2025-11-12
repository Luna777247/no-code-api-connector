# Backend PHP API

PHP 8.3 REST API backend for the No-Code API Connector platform.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- PHP 8.3+ (for local development)
- Composer 2.8+

### Run with Docker (Recommended)
```bash
cd backendphp

# Run with default settings (localhost:8000)
docker-compose up -d backend

# Or use the helper script
./run-backend.sh -d

# Check health
curl http://localhost:8000/api/admin/health
```

### Local Development
```bash
cd backendphp

# Install dependencies
composer install

# Copy environment
cp .env.example .env

# Start services (MongoDB, PostgreSQL, Redis, Airflow)
docker-compose up -d mongo postgres redis airflow-apiserver

# Run PHP server with defaults
php -S localhost:8000 -t public

# Or use the helper script
./run-backend.sh
```

## 🎛️ Custom Host & Port Configuration

The backend supports customizable host and port without modifying code:

### Using Helper Script (Easiest)
```bash
# Run on port 8080
./run-backend.sh -p 8080

# Run on specific host and port
./run-backend.sh -h 0.0.0.0 -p 9000

# Run with Docker on custom port
./run-backend.sh -d -p 8080
```

### Using Environment Variables
```bash
# PowerShell (Windows)
$env:BACKEND_HOST="127.0.0.1"; $env:BACKEND_PORT="8080"; docker-compose up -d backend

# Linux/Mac
BACKEND_HOST=127.0.0.0 BACKEND_PORT=8080 docker-compose up -d backend

# Or set in .env file
echo "BACKEND_HOST=127.0.0.1" >> .env
echo "BACKEND_PORT=8080" >> .env
docker-compose up -d backend
```

### Direct Commands
```bash
# PHP built-in server
BACKEND_HOST=0.0.0.0 BACKEND_PORT=9000 php -S ${BACKEND_HOST:-localhost}:${BACKEND_PORT:-8000} -t public

# Docker Compose
BACKEND_PORT=8080 docker-compose up -d backend
```

## 📋 API Endpoints

### Health & Admin
- `GET /api/admin/health` — System health status

### Connections (CRUD)
- `GET /api/connections` — List all connections
- `POST /api/connections` — Create new connection
- `GET /api/connections/{id}` — Get connection details
- `PUT /api/connections/{id}` — Update connection
- `DELETE /api/connections/{id}` — Delete connection

### Schedules (CRUD + Execution)
- `GET /api/schedules` — List all schedules
- `POST /api/schedules` — Create schedule (triggers Airflow sync)
- `GET /api/schedules/{id}` — Get schedule details
- `PUT /api/schedules/{id}` — Update schedule
- `DELETE /api/schedules/{id}` — Delete schedule

### Runs (Execution & Results)
- `GET /api/runs` — List all runs
- `POST /api/runs` — Execute a run immediately
- `GET /api/runs/{id}` — Get run details & results

## 🔧 Configuration

### Environment Variables
```bash
# Database
MONGODB_URI=mongodb://mongo:27017
MONGODB_DATABASE=dataplatform_db

# Backend Server (Customizable)
BACKEND_HOST=0.0.0.0          # Host to bind to (0.0.0.0 for all interfaces)
BACKEND_PORT=8000              # Port to run on

# Other Services
AIRFLOW_PORT=8080
MONGO_PORT=27017

# Airflow
AIRFLOW_USERNAME=admin
AIRFLOW_PASSWORD=admin
```

### Production Setup
```bash
cp .env.example .env
# Edit with production MongoDB Atlas URL and secrets

# Run with custom production port
BACKEND_PORT=80 docker-compose -f docker-compose.prod.yml up -d
```

## 🐛 Troubleshooting

### Docker Desktop Not Running
```bash
# Start Docker Desktop
docker desktop start

# Wait a few seconds, then check
docker info
```

### Services Won't Start
```bash
docker-compose logs
docker-compose restart backend
```

### Custom Port Issues
```bash
# Check if port is in use
netstat -ano | findstr :8080

# Kill process using the port (replace PID)
taskkill /PID <PID> /F

# Or use a different port
BACKEND_PORT=8081 docker-compose up -d backend
```

### Database Connection Issues
```bash
# Check MongoDB
docker exec -it backendphp-mongo-1 mongosh --eval "db.runCommand({ping: 1})"

# Reset database
docker-compose down -v
docker-compose up -d
```

### Environment Variables Not Working
```bash
# For PowerShell, set variables in same command
$env:BACKEND_PORT="8080"; docker-compose up -d backend

# Or use .env file
echo "BACKEND_PORT=8080" > .env
docker-compose up -d backend
```

## 📁 Project Structure

```
├── app/                    # Application code
│   ├── Controllers/        # HTTP request handlers
│   ├── Services/           # Business logic
│   ├── Repositories/       # Data access layer
│   └── Config/             # Configuration
├── public/                 # Web root
├── routes/                 # API routes
├── dags/                   # Airflow DAGs
├── docker-compose.yaml     # Services orchestration
├── Dockerfile              # Container definition
├── run-backend.sh          # Helper script for running with custom host/port
├── readme-local.md         # Detailed local development guide
├── readme-product.md       # Production deployment guide
├── .env.example            # Environment template
└── .env                    # Environment configuration (create from .env.example)
```

## 🆕 New Features

### Custom Host & Port Support
- Run backend on any host/port combination without code changes
- Environment variable driven configuration
- Works with both Docker and local PHP server

### Helper Script
The `run-backend.sh` script provides easy commands:
```bash
./run-backend.sh              # Run with defaults
./run-backend.sh -p 8080      # Custom port
./run-backend.sh -h 0.0.0.0 -p 9000  # Custom host and port
./run-backend.sh -d           # Run with Docker
```

### Enhanced Documentation
- `readme-local.md`: Comprehensive local development guide
- `readme-product.md`: Production deployment instructions
- Cross-platform compatibility (Windows PowerShell, Linux/Mac)

## 📚 Additional Resources
- [API Documentation](routes/api.php)