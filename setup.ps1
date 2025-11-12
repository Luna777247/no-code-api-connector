# No-Code API Connector Setup Script
# This script sets up the development environment with proper defaults

param(
    [string]$BackendHost = "localhost",
    [string]$FrontendHost = "localhost",
    [int]$BackendPort = 8000,
    [int]$AirflowPort = 8080
)

Write-Host "🚀 Setting up No-Code API Connector..." -ForegroundColor Green
Write-Host "📍 Configuration: Backend=$BackendHost`:$BackendPort, Airflow=$FrontendHost`:$AirflowPort" -ForegroundColor Cyan

# Check if Docker is running
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Navigate to backend directory and copy environment files
Write-Host "📁 Setting up backend environment..." -ForegroundColor Yellow
if (!(Test-Path "backendphp\.env")) {
    Copy-Item "backendphp\.env.example" "backendphp\.env"
    Write-Host "✅ Created backendphp\.env from template" -ForegroundColor Green
} else {
    Write-Host "ℹ️  backendphp\.env already exists, skipping..." -ForegroundColor Blue
}

# Navigate to frontend directory and copy environment files
Write-Host "📁 Setting up frontend environment..." -ForegroundColor Yellow
if (!(Test-Path "frontendphp\.env.local")) {
    # Create .env.local with configurable API URL
    $apiUrl = "http://$BackendHost`:$BackendPort"
    "NEXT_PUBLIC_API_BASE_URL=$apiUrl" | Out-File -FilePath "frontendphp\.env.local" -Encoding UTF8
    Write-Host "✅ Created frontendphp\.env.local with API URL: $apiUrl" -ForegroundColor Green
} else {
    Write-Host "ℹ️  frontendphp\.env.local already exists, skipping..." -ForegroundColor Blue
}

# Start the services
Write-Host "🐳 Starting Docker services..." -ForegroundColor Yellow
Set-Location backendphp
docker-compose up -d

Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Yellow
$backendUrl = "http://$BackendHost`:$BackendPort/api/admin/health"
try {
    $response = Invoke-WebRequest -Uri $backendUrl -TimeoutSec 10
    if ($response.Content -match '"status":"healthy"') {
        Write-Host "✅ Backend is healthy!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend health check failed. Services may still be starting..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Backend health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Backend API:  http://$BackendHost`:$BackendPort" -ForegroundColor White
Write-Host "   Airflow UI:   http://$FrontendHost`:$AirflowPort" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "   Airflow:  http://localhost:8080" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start frontend: cd frontendphp && npm run dev" -ForegroundColor White
Write-Host "   2. Check backend health: curl http://localhost:8000/api/admin/health" -ForegroundColor White
Write-Host "   3. View Airflow UI at http://localhost:8080 (admin/admin)" -ForegroundColor White