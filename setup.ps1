# No-Code API Connector Setup Script
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " No-Code API Connector Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Checking Docker..." -ForegroundColor Yellow
try {
    docker info > $null 2>&1
    Write-Host "✓ Docker is running" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[2/4] Starting services..." -ForegroundColor Yellow
try {
    docker-compose up -d
    Write-Host "✓ Services started" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Failed to start services" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[3/4] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host "✓ Services ready" -ForegroundColor Green
Write-Host ""

Write-Host "[4/4] Initializing Airflow..." -ForegroundColor Yellow
Write-Host "Initializing Airflow database..." -ForegroundColor Gray
try {
    docker-compose exec -T airflow-webserver airflow db migrate
} catch {
    Write-Host "WARNING: Database might already be initialized" -ForegroundColor Yellow
}

Write-Host "Creating Airflow admin user..." -ForegroundColor Gray
try {
    docker-compose exec -T airflow-webserver airflow users create --username airflow --password airflow --firstname Airflow --lastname Admin --role Admin --email admin@example.com
} catch {
    Write-Host "WARNING: Admin user might already exist" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "       SETUP COMPLETE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Access your application:" -ForegroundColor White
Write-Host "  Frontend:    http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API: http://localhost:8000/api/data" -ForegroundColor White
Write-Host "  Airflow UI:  http://localhost:8080 (airflow/airflow)" -ForegroundColor White
Write-Host ""
Write-Host "To view logs: docker-compose logs -f" -ForegroundColor Gray
Write-Host "To stop:      docker-compose down" -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to exit"