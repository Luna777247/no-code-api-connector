# Metabase Migration Script: H2 to MongoDB Atlas PostgreSQL
# This script migrates Metabase metadata from H2 database to PostgreSQL on MongoDB Atlas

param(
    [switch]$DryRun,
    [switch]$SkipBackup
)

Write-Host "🔄 Starting Metabase migration from H2 to MongoDB Atlas PostgreSQL..." -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "🧪 DRY RUN MODE - No actual changes will be made" -ForegroundColor Yellow
}

# Configuration
$MetabaseContainer = "metabase"
$AtlasContainer = "metabase-atlas"
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

# Step 3: Start new Metabase instance with MongoDB Atlas PostgreSQL
Write-Host "🚀 Starting new Metabase instance with MongoDB Atlas..." -ForegroundColor Green
if (-not $DryRun) {
    docker-compose -f docker-compose.metabase-atlas.yml up -d
}

# Step 4: Wait for Metabase to be ready
Write-Host "⏳ Waiting for Metabase to initialize..." -ForegroundColor Yellow
if (-not $DryRun) {
    Start-Sleep -Seconds 60
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
        Write-Host "Run: docker-compose -f docker-compose.metabase-atlas.yml logs metabase" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Access Metabase at http://localhost:3001"
Write-Host "2. Reconnect your MongoDB Atlas data sources"
Write-Host "3. Verify all dashboards and queries are working"
Write-Host "4. Remove old docker-compose.metabase.yml and metabase_data volume"
Write-Host ""
Write-Host "🔒 Important: Update your environment variables:"
Write-Host "   - METABASE_SECRET_KEY is already configured in .env"
Write-Host "   - MongoDB Atlas credentials are set in docker-compose.metabase-atlas.yml"