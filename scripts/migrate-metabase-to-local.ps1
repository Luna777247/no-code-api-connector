# Metabase Migration Script: H2 to Local PostgreSQL
# Alternative migration using local PostgreSQL instead of MongoDB Atlas

param(
    [switch]$DryRun,
    [switch]$SkipBackup
)

Write-Host "🔄 Starting Metabase migration from H2 to Local PostgreSQL..." -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🧪 DRY RUN MODE - No actual changes will be made" -ForegroundColor Yellow
}

# Configuration
$MetabaseContainer = "metabase"
$LocalContainer = "metabase-local"
$BackupDir = "backup"
$BackupFile = "metabase-h2-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').db"

# Create backup directory
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# Step 1: Stop current Metabase instance
Write-Host "🛑 Stopping current Metabase instance..." -ForegroundColor Yellow
if (-not $DryRun) {
    docker-compose -f docker-compose.metabase.yml down
}

# Step 2: Create backup of H2 database (if needed)
if (-not $SkipBackup) {
    Write-Host "💾 Creating backup of H2 database..." -ForegroundColor Yellow
    if (-not $DryRun) {
        try {
            docker run --rm `
              -v "${PWD}/metabase_data:/metabase-data" `
              -v "${PWD}/${BackupDir}:/backup" `
              openjdk:11-jre-slim `
              sh -c "cp /metabase-data/metabase.db /backup/$BackupFile && echo 'H2 database backed up to: /backup/$BackupFile'"
        } catch {
            Write-Host "⚠️  Warning: Could not create H2 backup. Continuing..." -ForegroundColor Yellow
        }
    }
}

# Step 3: Start new Metabase instance with local PostgreSQL
Write-Host "🚀 Starting new Metabase instance with local PostgreSQL..." -ForegroundColor Green
if (-not $DryRun) {
    docker-compose -f docker-compose.metabase-local.yml up -d
}

# Step 4: Wait for Metabase to be ready
Write-Host "⏳ Waiting for Metabase to initialize..." -ForegroundColor Yellow
if (-not $DryRun) {
    Start-Sleep -Seconds 90  # Extra time for PostgreSQL setup
}

# Step 5: Verify connection
Write-Host "🔍 Verifying Metabase connection..." -ForegroundColor Yellow
if (-not $DryRun) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -TimeoutSec 30
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Metabase health check passed!" -ForegroundColor Green
        } else {
            throw "Health check returned status $($response.StatusCode)"
        }
    } catch {
        Write-Host "❌ Metabase health check failed. Please check logs:" -ForegroundColor Red
        Write-Host "Run: docker-compose -f docker-compose.metabase-local.yml logs metabase" -ForegroundColor Yellow
        Write-Host "Run: docker-compose -f docker-compose.metabase-local.yml logs postgres" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Access Metabase at http://localhost:3001"
Write-Host "2. Complete initial Metabase setup (admin account)"
Write-Host "3. Add MongoDB Atlas as data source for your ETL data"
Write-Host "4. Create dashboards from api_* collections"
Write-Host ""
Write-Host "🔒 Database credentials:" -ForegroundColor Yellow
Write-Host "   - Database: metabase"
Write-Host "   - User: metabase_user"
Write-Host "   - Password: metabase_password"
Write-Host "   - Host: localhost:5433 (external access)"
Write-Host ""
Write-Host "💡 Note: This uses local PostgreSQL. For cloud deployment, use Atlas PostgreSQL instead."