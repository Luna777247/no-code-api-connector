@echo off
echo ========================================
echo  No-Code API Connector Setup Script
echo ========================================
echo.

echo [1/4] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo ✓ Docker is running
echo.

echo [2/4] Starting services...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start services
    pause
    exit /b 1
)
echo ✓ Services started
echo.

echo [3/4] Waiting for services to be ready...
timeout /t 10 /nobreak >nul
echo ✓ Services ready
echo.

echo [4/4] Initializing Airflow...
echo Initializing Airflow database...
docker-compose exec -T airflow-webserver airflow db migrate
if errorlevel 1 (
    echo WARNING: Database might already be initialized
)

echo Creating Airflow admin user...
docker-compose exec -T airflow-webserver airflow users create --username airflow --password airflow --firstname Airflow --lastname Admin --role Admin --email admin@example.com
if errorlevel 1 (
    echo WARNING: Admin user might already exist
)

echo.
echo ========================================
echo        SETUP COMPLETE!
echo ========================================
echo.
echo Access your application:
echo   Frontend:    http://localhost:3000
echo   Backend API: http://localhost:8000/api/data
echo   Airflow UI:  http://localhost:8080 (airflow/airflow)
echo.
echo To view logs: docker-compose logs -f
echo To stop:      docker-compose down
echo.
pause