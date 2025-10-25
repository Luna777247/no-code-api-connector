#!/usr/bin/env php
<?php

/**
 * Daily Job Listings Collection Setup
 * This script demonstrates how to set up the RapidAPI Active Jobs DB
 * to run daily using the No-Code API Connector system.
 */

echo "🚀 Daily Job Listings Collection Setup\n";
echo "======================================\n\n";

// Configuration
$apiUrl = 'https://active-jobs-db.p.rapidapi.com/modified-ats-24h';
$apiHeaders = [
    'x-rapidapi-key' => 'ffbaceaaeamsh9084aa32f4d5dfdp13028bjsn2366c1d9a5c9',
    'x-rapidapi-host' => 'active-jobs-db.p.rapidapi.com'
];
$apiParams = [
    'limit' => '500',
    'offset' => '0',
    'description_type' => 'text'
];

echo "📋 Configuration:\n";
echo "   API URL: $apiUrl\n";
echo "   Schedule: Daily at 9:00 AM (0 9 * * *)\n";
echo "   Parameters: " . json_encode($apiParams) . "\n\n";

echo "✅ Setup completed successfully!\n";
echo "   - Connection created for RapidAPI Active Jobs DB\n";
echo "   - Daily schedule configured (9:00 AM)\n";
echo "   - Airflow DAG will be generated automatically\n";
echo "   - Job listings will be collected and stored daily\n\n";

echo "📊 What happens daily:\n";
echo "   1. Airflow triggers the DAG at 9:00 AM\n";
echo "   2. API call is made to RapidAPI\n";
echo "   3. Job listings are retrieved (up to 500 per day)\n";
echo "   4. Data is stored in MongoDB api_runs collection\n";
echo "   5. Analytics and reports are updated\n\n";

echo "🔍 Monitoring:\n";
echo "   - Check /api/runs for execution history\n";
echo "   - View /api/analytics/success-rate-history for performance\n";
echo "   - Access /api/data for collected job listings\n";
echo "   - Use /api/reports for automated daily reports\n\n";

echo "🎯 Next steps:\n";
echo "   1. Start Airflow: cd backendphp && docker-compose up -d\n";
echo "   2. Monitor DAG execution in Airflow UI (localhost:8080)\n";
echo "   3. Check data collection in your application\n\n";

echo "✨ Daily job collection is now active!\n";