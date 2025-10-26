<?php
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

use App\Repositories\DataRepository;
use App\Config\Database;

echo "Testing DataRepository directly...\n\n";

// First check database connection
echo "=== Checking database connection ===\n";
$manager = Database::mongoManager();
$dbName = Database::mongoDbName();

if (!$manager || !$dbName) {
    echo "❌ Database connection failed\n";
    exit(1);
}

echo "✅ Connected to database: $dbName\n";

// List collections
try {
    $command = new \MongoDB\Driver\Command(['listCollections' => 1]);
    $cursor = $manager->executeCommand($dbName, $command);
    $collections = $cursor->toArray();

    echo "Available collections:\n";
    foreach ($collections as $collection) {
        echo "- " . $collection->name . "\n";
    }
} catch (\Throwable $e) {
    echo "❌ Failed to list collections: " . $e->getMessage() . "\n";
}

echo "\n";

try {
    $dataRepo = new DataRepository();

    // Test search across collections with empty query
    echo "=== Testing searchAcrossCollections with empty query ===\n";
    $result = $dataRepo->searchAcrossCollections('', [], ['limit' => 5]);

    echo "Total results: " . $result['total'] . "\n";
    echo "Data count: " . count($result['data']) . "\n";

    if (!empty($result['data'])) {
        echo "First result:\n";
        print_r($result['data'][0]);
    } else {
        echo "No data returned\n";
    }

    // Test search in specific collection
    echo "\n=== Testing searchInCollection on api_connections ===\n";
    try {
        $collectionResult = $dataRepo->searchInCollection('api_connections', '', [], ['limit' => 5]);

        echo "Collection results: " . $collectionResult['total'] . "\n";
        echo "Data count: " . count($collectionResult['data']) . "\n";

        if (!empty($collectionResult['data'])) {
            echo "First result:\n";
            print_r($collectionResult['data'][0]);
        } else {
            echo "No data from collection\n";
        }
    } catch (\Throwable $e) {
        echo "❌ Error: " . $e->getMessage() . "\n";
        echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
    }

} catch (\Throwable $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}