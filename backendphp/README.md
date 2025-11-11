# Backend PHP API - No-Code API Connector

> A modern PHP-based REST API backend for orchestrating data integrations, API execution, and workflow scheduling.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose (v28.5+)
- PHP 8.3+ (for local development)
- Composer 2.8+

### Run Locally (Docker)
```bash
# Clone and navigate to backend directory
cd backendphp

# Start all services (backend, MongoDB, PostgreSQL, Redis, Airflow)
docker-compose up -d

# Check service health
docker-compose ps

# View backend logs
docker-compose logs -f backend

# # Test API
# curl http://localhost:8000/api/admin/health
```

### Stop Everything
```bash
docker-compose down
```

## 📋 What's Inside

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  HTTP Clients (Web UI, Mobile, Scripts)                     │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────▼────────────┐
        │  Apache + PHP 8.3       │ :8000
        │  Front Controller       │
        │  (public/index.php)     │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────┐
        │  Router                 │
        │  (routes/api.php)       │
        └────────────┬────────────┘
                     │
        ┌────────────▼────────────────────────┐
        │  Controllers                        │
        │  ├─ ConnectionController            │
        │  ├─ ScheduleManagementController    │
        │  ├─ RunController                   │
        │  └─ AdminSystemController          │
        └────────────┬─────────────────────────┘
                     │
        ┌────────────▼────────────────────────┐
        │  Services (Business Logic)          │
        │  ├─ ConnectionService              │
        │  ├─ ScheduleService                │
        │  ├─ RunService                     │
        │  └─ AirflowService                 │
        └────────────┬─────────────────────────┘
                     │
        ┌────────────▼────────────────────────┐
        │  Repositories (Data Access)         │
        │  ├─ ConnectionRepository           │
        │  ├─ ScheduleRepository             │
        │  └─ RunRepository                  │
        └────────────┬─────────────────────────┘
                     │
        ┌────────────▼─────────────────────────────────────┐
        │  Persistence & External Services                │
        │  - MongoDB: primary application data store — **uses MongoDB Atlas by default** via `MONGODB_URI` in `.env`. Check `app/Repositories/*` for usage. Can optionally use local MongoDB by changing `docker-compose.yaml`.      │
        │  ├─ PostgreSQL (postgres:5432) - Airflow Meta   │
        │  ├─ Redis (redis:6379) - Cache & Celery Broker │
        │  └─ Airflow (airflow-apiserver:8080) - Workflows│
        └─────────────────────────────────────────────────┘
```

### Core Concepts

| Component | Purpose | Location |
|-----------|---------|----------|
| **Connections** | Store API credentials, headers, authentication details | `ConnectionController`, `ConnectionRepository` |
| **Schedules** | Define recurring API executions with cron expressions | `ScheduleManagementController`, `ScheduleService` |
| **Runs** | Track API execution history and results | `RunController`, `RunRepository` |
| **Pipelines** | Orchestrate multi-step data transformations | `PipelineController`, `ExecutionService` |
| **Airflow DAGs** | Schedule and execute runs via Apache Airflow | `dags/`, `AirflowService` |

## 🔌 API Endpoints

### Health & Admin
- `GET /api/admin/health` — System health status
- `GET /api/admin/health/database` — Database connectivity
- `GET /api/admin/users` — List users (admin only)
- `GET /api/admin/logs` — View system logs

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
- `POST /api/schedules/{id}/trigger` — Manually trigger schedule
- `GET /api/schedules/{id}/history` — View execution history

### Runs (Execution & Results)
- `GET /api/runs` — List all runs
- `POST /api/runs` — Execute a run immediately
- `GET /api/runs/{id}` — Get run details & results
- `POST /api/runs/{id}/retry` — Retry failed run
- `GET /api/runs/{id}/logs` — View execution logs

## 📖 Usage Examples

### Create a Connection
```bash
curl -X POST http://localhost:8000/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My REST API",
    "type": "REST",
    "baseUrl": "https://api.example.com",
    "authentication": {
      "type": "bearer",
      "token": "sk_live_xxxxxx"
    },
    "headers": {
      "X-Custom-Header": "value"
    }
  }'
```

### Create a Schedule
```bash
curl -X POST http://localhost:8000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hourly Sync",
    "connectionId": "690d27fffe8324710b06bf25",
    "cronExpression": "0 * * * *",
    "enabled": true,
    "requestData": {
      "endpoint": "/users",
      "method": "GET",
      "parameters": {}
    }
  }'
```

### Execute a Run
```bash
curl -X POST http://localhost:8000/api/runs \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "690d27fffe8324710b06bf25",
    "scheduleId": "schedule-123",
    "executedAt": "2025-11-07T22:53:24+00:00",
    "triggeredBy": "manual"
  }'
```