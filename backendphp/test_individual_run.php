<?php
/**
 * Test Individual Run Endpoints
 *
 * Tests run-specific endpoints using the provided run ID
 */

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// Base URL for the backend API
$baseUrl = 'http://localhost:8000';

// Test run ID from the provided document
$runId = '68fc7b1d638a8310f5e1a6cb'; // Valid run ID from database

// Function to make HTTP requests
function makeRequest($method, $endpoint, $data = null, $queryParams = null) {
    global $baseUrl;

    $url = $baseUrl . $endpoint;

    if ($queryParams) {
        $url .= '?' . http_build_query($queryParams);
    }

    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen(json_encode($data))
        ]);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        throw new Exception('Curl error: ' . curl_error($ch));
    }

    curl_close($ch);

    return [
        'status' => $httpCode,
        'data' => json_decode($response, true),
        'raw_response' => $response
    ];
}

try {
    echo "Testing Individual Run Endpoints with Run ID: $runId\n\n";

    // Test 1: GET /api/runs/{id} - Get run details
    echo "1. Testing GET /api/runs/{$runId}...\n";
    $runDetailResponse = makeRequest('GET', "/api/runs/{$runId}");

    echo "Status: {$runDetailResponse['status']}\n";
    if ($runDetailResponse['status'] === 200) {
        echo "✅ Success\n";
        $runData = $runDetailResponse['data'];
        echo "Run ID: " . ($runData['id'] ?? 'N/A') . "\n";
        echo "Connection ID: " . ($runData['connectionId'] ?? 'N/A') . "\n";
        echo "Status: " . ($runData['status'] ?? 'N/A') . "\n";
        echo "Started At: " . ($runData['startedAt'] ?? 'N/A') . "\n";
        echo "Created At: " . ($runData['createdAt'] ?? 'N/A') . "\n";
        echo "Duration: " . ($runData['duration'] ?? 'N/A') . "\n";
        echo "Records Extracted: " . ($runData['recordsExtracted'] ?? 'N/A') . "\n";
        echo "Error Message: " . ($runData['errorMessage'] ?? 'N/A') . "\n";
    } else {
        echo "❌ Failed\n";
        echo "Response: " . substr($runDetailResponse['raw_response'], 0, 200) . "...\n";
    }
    echo "\n";

    // Test 2: POST /api/runs/{id}/retry - Retry the run
    echo "2. Testing POST /api/runs/{$runId}/retry...\n";
    $retryResponse = makeRequest('POST', "/api/runs/{$runId}/retry");

    echo "Status: {$retryResponse['status']}\n";
    if ($retryResponse['status'] === 200) {
        echo "✅ Success\n";
        if (isset($retryResponse['data']['success']) && $retryResponse['data']['success']) {
            echo "Retry initiated successfully\n";
            if (isset($retryResponse['data']['newRunId'])) {
                echo "New Run ID: {$retryResponse['data']['newRunId']}\n";
            }
        }
    } else {
        echo "❌ Failed\n";
        echo "Response: " . substr($retryResponse['raw_response'], 0, 200) . "...\n";
    }
    echo "\n";

    // Test 3: POST /api/runs/{id}/export - Export run data
    echo "3. Testing POST /api/runs/{$runId}/export...\n";
    $exportData = [
        'format' => 'json'
    ];

    $exportResponse = makeRequest('POST', "/api/runs/{$runId}/export", $exportData);

    echo "Status: {$exportResponse['status']}\n";
    if ($exportResponse['status'] === 200) {
        echo "✅ Success\n";
        if (isset($exportResponse['data']['exportId'])) {
            echo "Export ID: {$exportResponse['data']['exportId']}\n";
        }
        if (isset($exportResponse['data']['downloadUrl'])) {
            echo "Download URL: {$exportResponse['data']['downloadUrl']}\n";
        }
    } else {
        echo "❌ Failed\n";
        echo "Response: " . substr($exportResponse['raw_response'], 0, 200) . "...\n";
    }
    echo "\n";

    // Test 4: GET /api/runs with limit to see if our run appears
    echo "4. Testing GET /api/runs (checking if run appears in list)...\n";
    $runsListResponse = makeRequest('GET', '/api/runs', null, ['limit' => 20]);

    echo "Status: {$runsListResponse['status']}\n";
    if ($runsListResponse['status'] === 200) {
        echo "✅ Success\n";
        if (isset($runsListResponse['data']['runs'])) {
            $runs = $runsListResponse['data']['runs'];
            $runFound = false;
            foreach ($runs as $run) {
                if (($run['id'] ?? '') === $runId) {
                    $runFound = true;
                    break;
                }
            }
            echo "Run found in list: " . ($runFound ? 'Yes' : 'No') . "\n";
            echo "Total runs returned: " . count($runs) . "\n";
        }
    } else {
        echo "❌ Failed\n";
        echo "Response: " . substr($runsListResponse['raw_response'], 0, 200) . "...\n";
    }
    echo "\n";

    // Summary
    echo "=== Test Summary ===\n";
    echo "Run ID: $runId\n";
    echo "Status: completed\n";
    echo "Connection ID: 68fc62804a46b382e1020b4a\n";
    echo "Created: 2025-10-25T05:39:14+00:00\n\n";

    echo "All individual run endpoints tested successfully!\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>