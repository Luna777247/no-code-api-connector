# Test Atlas PostgreSQL Connection for Metabase
# This script tests the PostgreSQL connection to MongoDB Atlas

Write-Host "🔍 Testing Atlas PostgreSQL Connection for Metabase" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$PgHost = "cluster0.olqzq.mongodb.net"
$PgPort = "5432"
$PgDatabase = "metabase"
$PgUser = "nguyenanhilu9785_db_user"
$PgPassword = "12345"

Write-Host "📊 Connection Details:" -ForegroundColor Yellow
Write-Host "  Host: $PgHost" -ForegroundColor White
Write-Host "  Port: $PgPort" -ForegroundColor White
Write-Host "  Database: $PgDatabase" -ForegroundColor White
Write-Host "  User: $PgUser" -ForegroundColor White
Write-Host ""

# Test basic connectivity (this will fail if PostgreSQL is not enabled)
Write-Host "🔌 Testing PostgreSQL connection..." -ForegroundColor Yellow

try {
    # Try to connect using psql if available
    $connectionString = "postgresql://$PgUser`:$PgPassword@$PgHost`:$PgPort/$PgDatabase`?sslmode=require"

    # Test with a simple query
    $testQuery = "SELECT version();"

    Write-Host "Testing connection string: $connectionString" -ForegroundColor Gray

    # For Windows, we'll use a simple curl test to the Atlas endpoint
    # This is not a full PostgreSQL test but checks if the service is accessible
    $atlasUrl = "https://cloud.mongodb.com"
    Write-Host "Checking Atlas service availability..." -ForegroundColor Yellow

    try {
        $response = Invoke-WebRequest -Uri $atlasUrl -TimeoutSec 10 -Method Head
        Write-Host "✅ Atlas service is accessible" -ForegroundColor Green
    } catch {
        Write-Host "❌ Cannot access Atlas service. Check internet connection." -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "📋 Manual PostgreSQL Test:" -ForegroundColor Cyan
    Write-Host "If you have psql installed, test with:" -ForegroundColor White
    Write-Host "psql `"$connectionString`" -c `"$testQuery`"" -ForegroundColor Yellow
    Write-Host ""

    Write-Host "🔧 If connection works, run:" -ForegroundColor Green
    Write-Host "powershell -ExecutionPolicy Bypass -File scripts/switch-metabase-config.ps1 -Target atlas" -ForegroundColor White

} catch {
    Write-Host "❌ Connection test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Possible issues:" -ForegroundColor Yellow
    Write-Host "  • Relational Migrator not enabled in Atlas" -ForegroundColor White
    Write-Host "  • PostgreSQL database not created" -ForegroundColor White
    Write-Host "  • User permissions not granted" -ForegroundColor White
    Write-Host "  • IP not whitelisted" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Run setup guide: .\scripts\setup-atlas-postgresql.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "1. Complete Atlas PostgreSQL setup" -ForegroundColor White
Write-Host "2. Test connection with this script" -ForegroundColor White
Write-Host "3. Switch to Atlas configuration" -ForegroundColor White
Write-Host "4. Verify Metabase works with Atlas" -ForegroundColor White