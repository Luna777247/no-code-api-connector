# Complete Atlas PostgreSQL Setup and Switch
# This script completes the Atlas setup and switches Metabase configuration

Write-Host "🚀 Complete Atlas PostgreSQL Setup and Switch" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Checklist - Complete these steps in MongoDB Atlas:" -ForegroundColor Yellow
Write-Host "=====================================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "□ 1. Enable Relational Migrator" -ForegroundColor White
Write-Host "   - Go to https://cloud.mongodb.com/" -ForegroundColor Cyan
Write-Host "   - Navigate to 'Relational Migrator'" -ForegroundColor White
Write-Host "   - Click 'Enable Relational Migrator'" -ForegroundColor White
Write-Host ""
Write-Host "□ 2. Create PostgreSQL Database" -ForegroundColor White
Write-Host "   - Click 'Create migration'" -ForegroundColor White
Write-Host "   - Select 'PostgreSQL' as target" -ForegroundColor White
Write-Host "   - Use these settings:" -ForegroundColor White
Write-Host "     • Host: cluster0.olqzq.mongodb.net" -ForegroundColor Yellow
Write-Host "     • Port: 5432" -ForegroundColor Yellow
Write-Host "     • Database: metabase" -ForegroundColor Yellow
Write-Host "     • Username: nguyenanhilu9785_db_user" -ForegroundColor Yellow
Write-Host "     • Password: 12345" -ForegroundColor Yellow
Write-Host "     • SSL Mode: require" -ForegroundColor Yellow
Write-Host ""
Write-Host "□ 3. Grant Permissions" -ForegroundColor White
Write-Host "   - Execute SQL commands in the database:" -ForegroundColor White
Write-Host "     CREATE DATABASE metabase;" -ForegroundColor Cyan
Write-Host "     \c metabase;" -ForegroundColor Cyan
Write-Host "     GRANT ALL PRIVILEGES ON DATABASE metabase TO nguyenanhilu9785_db_user;" -ForegroundColor Cyan
Write-Host "     GRANT ALL ON SCHEMA public TO nguyenanhilu9785_db_user;" -ForegroundColor Cyan
Write-Host ""

$confirmation = Read-Host "Have you completed all Atlas setup steps? (y/n)"

if ($confirmation -eq 'y' -or $confirmation -eq 'Y') {
    Write-Host ""
    Write-Host "🔄 Switching to Atlas PostgreSQL configuration..." -ForegroundColor Green

    # Test connection first
    Write-Host "🔍 Testing Atlas PostgreSQL connection..." -ForegroundColor Yellow
    & "$PSScriptRoot\test-atlas-postgresql.ps1"

    Write-Host ""
    $testConfirmation = Read-Host "Does the connection test look good? (y/n)"

    if ($testConfirmation -eq 'y' -or $testConfirmation -eq 'Y') {
        Write-Host ""
        Write-Host "🚀 Switching Metabase to Atlas configuration..." -ForegroundColor Green
        & "$PSScriptRoot\switch-metabase-config.ps1" -Target atlas

        Write-Host ""
        Write-Host "✅ Migration to Atlas Complete!" -ForegroundColor Green
        Write-Host "🌐 Access Metabase at: http://localhost:3001" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "📊 Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Complete Metabase initial setup" -ForegroundColor White
        Write-Host "2. Add MongoDB Atlas as data source" -ForegroundColor White
        Write-Host "3. Create dashboards from your ETL data" -ForegroundColor White
        Write-Host "4. Share dashboard URLs with your team" -ForegroundColor White

    } else {
        Write-Host ""
        Write-Host "⚠️  Connection test failed. Please check your Atlas setup." -ForegroundColor Red
        Write-Host "Run: .\scripts\setup-atlas-postgresql.ps1 for detailed guide" -ForegroundColor Yellow
    }

} else {
    Write-Host ""
    Write-Host "⏳ Please complete the Atlas setup steps first." -ForegroundColor Yellow
    Write-Host "Run this script again when ready." -ForegroundColor White
    Write-Host ""
    Write-Host "📖 Setup Guide: .\scripts\setup-atlas-postgresql.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "💡 Alternative: Use local PostgreSQL if Atlas setup is not available" -ForegroundColor Cyan
Write-Host "   powershell -ExecutionPolicy Bypass -File scripts/switch-metabase-config.ps1 -Target local" -ForegroundColor White