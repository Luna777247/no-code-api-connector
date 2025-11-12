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
docker-compose up -d

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

# Run PHP server
php -S localhost:8000 -t public
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

# Ports (configurable)
BACKEND_PORT=8000
AIRFLOW_PORT=8080
MONGO_PORT=27017

# Airflow
AIRFLOW_USERNAME=admin
AIRFLOW_PASSWORD=admin
```

### Production Setup
```bash
cp .env.production .env
# Edit with production MongoDB Atlas URL and secrets
docker-compose up -d
```

## 🐛 Troubleshooting

### Services Won't Start
```bash
docker-compose logs
docker-compose restart backend
```

### Database Connection Issues
```bash
# Check MongoDB
docker exec -it backendphp-mongo-1 mongosh --eval "db.runCommand({ping: 1})"

# Reset database
docker-compose down -v
docker-compose up -d
```

## 📁 Project Structure

```
├── app/                 # Application code
│   ├── Controllers/     # HTTP request handlers
│   ├── Services/        # Business logic
│   ├── Repositories/    # Data access layer
│   └── Config/          # Configuration
├── public/              # Web root
├── routes/              # API routes
├── dags/                # Airflow DAGs
├── docker-compose.yaml  # Services orchestration
└── Dockerfile           # Container definition
```