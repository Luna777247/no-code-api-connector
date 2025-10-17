# Check PostgreSQL Readiness for Metabase Migration

Write-Host "🔍 Checking PostgreSQL readiness for Metabase migration..." -ForegroundColor Cyan

# Check if .env file exists with secret key
$EnvFile = ".env"
if (Test-Path $EnvFile) {
    $EnvContent = Get-Content $EnvFile
    if ($EnvContent -match "METABASE_SECRET_KEY") {
        Write-Host "✅ METABASE_SECRET_KEY configured in .env" -ForegroundColor Green
    } else {
        Write-Host "❌ METABASE_SECRET_KEY not found in .env" -ForegroundColor Red
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

# Check if docker-compose files exist
$AtlasCompose = "docker-compose.metabase-atlas.yml"
$H2Compose = "docker-compose.metabase.yml"

if (Test-Path $AtlasCompose) {
    Write-Host "✅ MongoDB Atlas configuration file exists" -ForegroundColor Green
} else {
    Write-Host "❌ MongoDB Atlas configuration file missing" -ForegroundColor Red
}

if (Test-Path $H2Compose) {
    Write-Host "✅ H2 configuration file exists (for backup)" -ForegroundColor Green
} else {
    Write-Host "⚠️  H2 configuration file not found (migration may not be needed)" -ForegroundColor Yellow
}

# Check migration scripts
$MigrationScript = "scripts/migrate-metabase-to-atlas.ps1"
$SetupScript = "scripts/setup-metabase-atlas-db.sh"

if (Test-Path $MigrationScript) {
    Write-Host "✅ Migration script exists" -ForegroundColor Green
} else {
    Write-Host "❌ Migration script missing" -ForegroundColor Red
}

if (Test-Path $SetupScript) {
    Write-Host "✅ Setup script exists" -ForegroundColor Green
} else {
    Write-Host "❌ Setup script missing" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Manual Steps Required:" -ForegroundColor Cyan
Write-Host "1. Enable PostgreSQL support in MongoDB Atlas cluster" -ForegroundColor White
Write-Host "2. Create 'metabase' PostgreSQL database in Atlas" -ForegroundColor White
Write-Host "3. Grant permissions to user 'nguyenanhilu9785_db_user'" -ForegroundColor White
Write-Host ""
Write-Host "📖 See ENABLE_POSTGRESQL_ATLAS.md for detailed instructions" -ForegroundColor Yellow
Write-Host ""
Write-Host "🚀 Once PostgreSQL is ready, run:" -ForegroundColor Green
Write-Host "   powershell -ExecutionPolicy Bypass -File scripts/migrate-metabase-to-atlas.ps1 -DryRun" -ForegroundColor White
Write-Host "   powershell -ExecutionPolicy Bypass -File scripts/migrate-metabase-to-atlas.ps1" -ForegroundColor White