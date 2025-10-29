# Start Docker Desktop and wait for it to be ready
Write-Host "Starting Docker Desktop..." -ForegroundColor Green

# Check if Docker Desktop is running
$dockerRunning = $false
try {
    docker info | Out-Null
    $dockerRunning = $true
} catch {
    $dockerRunning = $false
}

if (-not $dockerRunning) {
    Write-Host "Docker Desktop is not running. Starting it..." -ForegroundColor Yellow

    # Start Docker Desktop
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        Write-Host "Waiting for Docker Desktop to start (this may take a few minutes)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    } else {
        Write-Host "Docker Desktop not found at $dockerPath" -ForegroundColor Red
        Write-Host "Please install Docker Desktop first." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Docker Desktop is already running." -ForegroundColor Green
}

# Wait for Docker to be ready
Write-Host "Checking Docker status..." -ForegroundColor Yellow
$maxRetries = 60  # 5 minutes max
$retryCount = 0

while ($retryCount -lt $maxRetries) {
    try {
        docker info | Out-Null
        Write-Host "Docker is ready!" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now run: docker-compose up -d" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Available commands:" -ForegroundColor White
        Write-Host "  docker-compose up -d                 # Start all services" -ForegroundColor Gray
        Write-Host "  docker-compose up -d mongodb backend frontend  # Start core services only" -ForegroundColor Gray
        Write-Host "  docker-compose logs -f               # View logs" -ForegroundColor Gray
        Write-Host "  make help                           # Show all available commands" -ForegroundColor Gray
        break
    } catch {
        $retryCount++
        Write-Host "Docker is not ready yet. Waiting... ($retryCount/$maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

if ($retryCount -eq $maxRetries) {
    Write-Host "Docker failed to start after 5 minutes. Please check Docker Desktop." -ForegroundColor Red
    exit 1
}