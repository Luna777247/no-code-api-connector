# Test MongoDB Atlas Connection
# Run this script to verify your MongoDB Atlas connection

Write-Host "🔍 Testing MongoDB Atlas connection..." -ForegroundColor Cyan

$MongoUri = "mongodb+srv://nguyenanhilu9785_db_user:12345@cluster0.olqzq.mongodb.net/"
$TestCommand = "db.adminCommand('ismaster'); print('✅ MongoDB Atlas connection successful');"

try {
    # Test connection using mongo shell (if available)
    $result = & mongo $MongoUri --eval $TestCommand 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB Atlas connection successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB Atlas connection failed" -ForegroundColor Red
        Write-Host "Error: $result" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Troubleshooting steps:" -ForegroundColor Cyan
        Write-Host "1. Check if MongoDB shell is installed"
        Write-Host "2. Verify IP whitelist in Atlas includes your IP"
        Write-Host "3. Confirm username/password are correct"
        Write-Host "4. Check cluster status in Atlas dashboard"
    }
} catch {
    Write-Host "❌ Error testing connection: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Test connection manually with:" -ForegroundColor Cyan
    Write-Host "mongo `"$MongoUri`" --eval `"$TestCommand`""
}

Write-Host ""
Write-Host "📋 Next steps for Metabase migration:" -ForegroundColor Cyan
Write-Host "1. Enable PostgreSQL support in your Atlas cluster"
Write-Host "2. Create a PostgreSQL database named 'metabase'"
Write-Host "3. Run: docker-compose -f docker-compose.metabase-atlas.yml up -d"
Write-Host "4. Access Metabase at http://localhost:3001"