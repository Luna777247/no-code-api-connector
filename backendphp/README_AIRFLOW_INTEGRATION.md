# Airflow + Backend PHP Integration Setup

This setup integrates Apache Airflow with the PHP backend API for scheduled API execution.

## Architecture

- **Airflow**: Orchestrates scheduled API executions
- **Backend PHP**: Provides API endpoints for run management and execution
- **MongoDB**: Stores schedules, connections, and run records

## Quick Start

### 1. Start All Services

```bash
# Windows PowerShell
.\start-airflow-backend.ps1
```

This will start:
- Airflow webserver (http://localhost:8080)
- Airflow scheduler and workers
- Backend PHP API (http://localhost:8000)
- MongoDB (localhost:27017)

### 2. Test Integration

```bash
python test_integration.py
```

This will verify:
- Backend API health
- MongoDB connectivity
- Run creation via PHP API
- Run updates via PHP API

### 3. Access Services

- **Airflow UI**: http://localhost:8080 (admin/airflow)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/api/admin/health

## Environment Variables

The following environment variables are configured:

- `PHP_API_URL`: http://backend:80 (for container networking)
- `MONGODB_URI`: mongodb://mongo:27017
- `MONGODB_DATABASE`: api_connector

## DAG Configuration

DAGs are automatically generated from MongoDB schedules in the `api_schedules` collection.

Each DAG:
1. Creates a run record via PHP API (`POST /api/runs`)
2. Executes the external API call
3. Updates the run record with results (`POST /api/runs/{id}/execute`)

## Troubleshooting

### Services Not Starting
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs airflow-scheduler
```

### API Connection Issues
- Ensure all services are healthy: `docker-compose ps`
- Check backend health: `curl http://localhost:8000/api/admin/health`
- Verify MongoDB connection in backend logs

### DAG Not Executing
- Check Airflow UI for DAG status
- Verify MongoDB has active schedules
- Check Airflow worker logs: `docker-compose logs airflow-worker`

## Development

### Adding New DAGs
DAGs are dynamically generated. To add new schedules:
1. Insert documents into `api_schedules` collection
2. Set `isActive: true`
3. Airflow will automatically discover and schedule them

### Modifying Execution Logic
Edit `dags/schedule_dag_generator.py` to customize:
- API call parameters
- Error handling
- Result processing

## Stopping Services

```bash
docker-compose down
```

This will stop all services and remove containers.