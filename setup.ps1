# No-Code API Connector Setup Script
# This script sets up both backend and frontend development environments

param(
    [string]$BackendHost = "localhost",
    [string]$FrontendHost = "localhost",
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 3000,
    [int]$AirflowPort = 8080,
    [int]$MongoPort = 27017,
    [switch]$UseMongoAtlas
)

Write-Host "🚀 Setting up No-Code API Connector (Backend + Frontend)..." -ForegroundColor Green
Write-Host "📍 Configuration:" -ForegroundColor Cyan
Write-Host "   Backend:  $BackendHost`:$BackendPort" -ForegroundColor White
Write-Host "   Frontend: $FrontendHost`:$FrontendPort" -ForegroundColor White
Write-Host "   Airflow:  $FrontendHost`:$AirflowPort" -ForegroundColor White
if ($UseMongoAtlas) {
    Write-Host "   MongoDB:  Atlas (cloud)" -ForegroundColor White
} else {
    Write-Host "   MongoDB:  $BackendHost`:$MongoPort" -ForegroundColor White
}

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
if (!(Test-Path "frontendphp\.env")) {
    Copy-Item "frontendphp\.env.example" "frontendphp\.env"
    Write-Host "✅ Created frontendphp\.env from template" -ForegroundColor Green
} else {
    Write-Host "ℹ️  frontendphp\.env already exists, skipping..." -ForegroundColor Blue
}

# Update frontend environment with API URL
$apiUrl = "http://$BackendHost`:$BackendPort"
$content = Get-Content "frontendphp\.env" -Raw
$content = $content -replace "(?m)^NEXT_PUBLIC_API_BASE_URL=.*$", "NEXT_PUBLIC_API_BASE_URL=$apiUrl"
Set-Content "frontendphp\.env" $content
Write-Host "✅ Updated frontend API URL: $apiUrl" -ForegroundColor Green

# Update backend MongoDB URI if not using Atlas
if (!$UseMongoAtlas) {
    $mongoUri = "mongodb://$BackendHost`:$MongoPort"
    $backendContent = Get-Content "backendphp\.env" -Raw
    $backendContent = $backendContent -replace "(?m)^MONGODB_URI=.*$", "MONGODB_URI=$mongoUri"
    Set-Content "backendphp\.env" $backendContent
    Write-Host "✅ Updated backend MongoDB URI: $mongoUri" -ForegroundColor Green
}

# Start backend services
Write-Host "🐳 Starting backend services..." -ForegroundColor Yellow
Set-Location backendphp
docker-compose up -d

# Start frontend services
Write-Host "🌐 Starting frontend services..." -ForegroundColor Yellow
Set-Location ../frontendphp
docker-compose up -d

Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service health
Write-Host "🔍 Checking service health..." -ForegroundColor Yellow

# Check backend health
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

# Check frontend health (basic connectivity check)
$frontendUrl = "http://$FrontendHost`:$FrontendPort"
try {
    $response = Invoke-WebRequest -Uri $frontendUrl -TimeoutSec 10
    if ($response.Content -match "html") {
        Write-Host "✅ Frontend is accessible!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Frontend health check failed. Services may still be starting..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Frontend health check failed: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 Setup complete! Both backend and frontend are running." -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend:    http://$FrontendHost`:$FrontendPort" -ForegroundColor White
Write-Host "   Backend API: http://$BackendHost`:$BackendPort" -ForegroundColor White
Write-Host "   Airflow UI:  http://$FrontendHost`:$AirflowPort" -ForegroundColor White
if ($UseMongoAtlas) {
    Write-Host "   MongoDB:     Atlas (configured in .env)" -ForegroundColor White
} else {
    Write-Host "   MongoDB:     $BackendHost`:$MongoPort" -ForegroundColor White
}
Write-Host "" -ForegroundColor White
Write-Host "📝 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs: docker-compose logs -f (in respective directories)" -ForegroundColor White
Write-Host "   Stop all: cd backendphp; docker-compose down; cd ../frontendphp; docker-compose down" -ForegroundColor White
Write-Host "   Restart: cd backendphp; docker-compose restart; cd ../frontendphp; docker-compose restart" -ForegroundColor White