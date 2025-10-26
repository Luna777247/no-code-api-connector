<?php
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/../');
$dotenv->load();

use App\Services\DataExportService;
use App\Services\DataSearchService;

echo "Testing DataExportService and DataSearchService with real MongoDB data...\n\n";

// Test DataExportService
echo "=== Testing DataExportService ===\n";
$exportService = new DataExportService();

$exportParams = [
    'format' => 'json',
    'includeMetadata' => true,
    'filters' => []
];

$result = $exportService->exportData($exportParams);

if ($result) {
    echo "✅ Export successful!\n";
    echo "Export ID: " . $result['exportId'] . "\n";
    echo "Record Count: " . $result['recordCount'] . "\n";
    echo "Format: " . $result['format'] . "\n";
    echo "File Size: " . $result['size'] . " bytes\n";
} else {
    echo "❌ Export failed or no data found\n";
}

echo "\n=== Testing DataSearchService ===\n";
$searchService = new DataSearchService();

// Test search with empty query (should return all data)
$searchResult = $searchService->search('', [], 1, 10, 'createdAt', 'desc');

echo "Search Results:\n";
echo "Total records found: " . $searchResult['total'] . "\n";
echo "Records returned: " . count($searchResult['results']) . "\n";

if (!empty($searchResult['results'])) {
    echo "Sample record:\n";
    print_r($searchResult['results'][0]);
} else {
    echo "No records found\n";
}

// Test search with filters
echo "\n=== Testing Search with Filters ===\n";
$filterResult = $searchService->applyFilter([
    'filters' => [],
    'sort' => 'createdAt',
    'limit' => 5
]);

echo "Filter Results:\n";
echo "Total records found: " . $filterResult['total'] . "\n";
echo "Records returned: " . count($filterResult['results']) . "\n";

echo "\n=== Test Complete ===\n";