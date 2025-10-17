# Setup MongoDB Atlas PostgreSQL for Metabase
# This script helps configure PostgreSQL in MongoDB Atlas for Metabase

Write-Host "🔧 MongoDB Atlas PostgreSQL Setup for Metabase" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Prerequisites Check:" -ForegroundColor Yellow
Write-Host "1. MongoDB Atlas account with cluster 'cluster0'" -ForegroundColor White
Write-Host "2. User 'nguyenanhilu9785_db_user' with admin privileges" -ForegroundColor White
Write-Host "3. METABASE_SECRET_KEY configured in .env" -ForegroundColor White
Write-Host ""

# Check .env file
$EnvFile = ".env"
if (Test-Path $EnvFile) {
    $EnvContent = Get-Content $EnvFile
    if ($EnvContent -match "METABASE_SECRET_KEY") {
        Write-Host "✅ METABASE_SECRET_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "❌ METABASE_SECRET_KEY not found in .env" -ForegroundColor Red
        Write-Host "Run: openssl rand -base64 32" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Setup Steps for MongoDB Atlas:" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. Access MongoDB Atlas Dashboard:" -ForegroundColor White
Write-Host "   https://cloud.mongodb.com/" -ForegroundColor Cyan
Write-Host ""

Write-Host "2. Enable Relational Migrator:" -ForegroundColor White
Write-Host "   - Go to 'Relational Migrator' in left sidebar" -ForegroundColor White
Write-Host "   - Click 'Enable Relational Migrator'" -ForegroundColor White
Write-Host "   - Wait for provisioning (may take a few minutes)" -ForegroundColor White
Write-Host ""

Write-Host "3. Create PostgreSQL Database:" -ForegroundColor White
Write-Host "   - Click 'Create migration'" -ForegroundColor White
Write-Host "   - Select 'PostgreSQL' as target database" -ForegroundColor White
Write-Host "   - Configure connection:" -ForegroundColor White
Write-Host "     • Host: cluster0.olqzq.mongodb.net" -ForegroundColor Yellow
Write-Host "     • Port: 5432" -ForegroundColor Yellow
Write-Host "     • Database: metabase" -ForegroundColor Yellow
Write-Host "     • Username: nguyenanhilu9785_db_user" -ForegroundColor Yellow
Write-Host "     • Password: 12345" -ForegroundColor Yellow
Write-Host "     • SSL Mode: require" -ForegroundColor Yellow
Write-Host ""

Write-Host "4. Grant Database Permissions:" -ForegroundColor White
Write-Host "   Execute these SQL commands in the PostgreSQL database:" -ForegroundColor White
Write-Host ""
Write-Host "   CREATE DATABASE metabase;" -ForegroundColor Cyan
Write-Host "   \c metabase;" -ForegroundColor Cyan
Write-Host "   GRANT ALL PRIVILEGES ON DATABASE metabase TO nguyenanhilu9785_db_user;" -ForegroundColor Cyan
Write-Host "   GRANT ALL ON SCHEMA public TO nguyenanhilu9785_db_user;" -ForegroundColor Cyan
Write-Host ""

Write-Host "5. Test Connection:" -ForegroundColor White
Write-Host "   Run: .\scripts\test-mongodb-atlas.ps1" -ForegroundColor Cyan
Write-Host ""

Write-Host "6. Start Metabase with Atlas:" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.metabase-atlas.yml up -d" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️  Important Notes:" -ForegroundColor Red
Write-Host "==================" -ForegroundColor Red
Write-Host "• Relational Migrator may not be available in all Atlas plans" -ForegroundColor White
Write-Host "• If not available, use docker-compose.metabase-local.yml instead" -ForegroundColor White
Write-Host "• PostgreSQL in Atlas is separate from MongoDB databases" -ForegroundColor White
Write-Host "• Ensure IP whitelist includes your current IP" -ForegroundColor White
Write-Host ""

Write-Host "📞 Support:" -ForegroundColor Cyan
Write-Host "==========" -ForegroundColor Cyan
Write-Host "If you encounter issues:" -ForegroundColor White
Write-Host "1. Check Atlas cluster status and logs" -ForegroundColor White
Write-Host "2. Verify user permissions and IP whitelist" -ForegroundColor White
Write-Host "3. Review ENABLE_POSTGRESQL_ATLAS.md for detailed guide" -ForegroundColor White
Write-Host ""

Write-Host "🎯 Ready to proceed?" -ForegroundColor Green
Write-Host "Run the setup steps above, then start Metabase!" -ForegroundColor Green