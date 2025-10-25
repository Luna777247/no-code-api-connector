# start-dev.ps1 - Development startup script for backendphp
# This script starts both Airflow and PHP server for development

Write-Host "Starting backendphp development environment..." -ForegroundColor Green

# Change to backend directory
Set-Location $PSScriptRoot

# Check if Docker is running
$dockerRunning = docker ps 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Start Airflow services
Write-Host "Starting Airflow services..." -ForegroundColor Yellow
docker compose up -d

# Wait for Airflow to be ready
Write-Host "Waiting for Airflow to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if Airflow is accessible
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5
    Write-Host "Airflow UI is available at: http://localhost:8080" -ForegroundColor Green
} catch {
    Write-Host "Warning: Airflow UI may not be ready yet. Check http://localhost:8080" -ForegroundColor Yellow
}

# Start PHP server
Write-Host "Starting PHP development server..." -ForegroundColor Yellow
Write-Host "Backend API will be available at: http://localhost:8000" -ForegroundColor Green

# Start PHP server in background
Start-Process -NoNewWindow -FilePath "php" -ArgumentList "-S", "localhost:8000"

Write-Host ""
Write-Host "Development environment started successfully!" -ForegroundColor Green
Write-Host "Airflow UI: http://localhost:8080 (user: airflow, pass: airflow)" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Keep script running to show logs
try {
    # Monitor PHP server (this will keep the script running)
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "Stopping services..." -ForegroundColor Yellow
    docker compose down
    Write-Host "Services stopped." -ForegroundColor Green
}