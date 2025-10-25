<?php
/**
 * Test Run Operations Endpoints
 *
 * Tests all Run Operations endpoints:
 * - GET /api/runs (list all runs)
 * - GET /api/runs/{id} (get run details)
 * - POST /api/runs/{id}/retry (retry run)
 * - POST /api/runs/{id}/export (export run data)
 * - POST /api/execute-run (execute run immediately)
 */

require_once __DIR__ . '/vendor/autoload.php';

// Test configuration
$baseUrl = 'http://localhost:8000'; // Adjust if your server runs on different port
$testRunId = '68fc7b1d638a8310f5e1a6cb'; // Valid run ID from database

echo "Testing Run Operations Endpoints\n";
echo "=================================\n\n";

$results = [];

// Helper function to make HTTP requests
function makeRequest($method, $url, $data = null) {
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
    $error = curl_error($ch);

    curl_close($ch);

    return [
        'response' => $response,
        'http_code' => $httpCode,
        'error' => $error
    ];
}

// Test 1: GET /api/runs - List all runs
echo "1. Testing GET /api/runs (List all runs)...\n";
$result = makeRequest('GET', $baseUrl . '/api/runs?limit=5');
$results['list_runs'] = $result;

if ($result['http_code'] === 200) {
    $data = json_decode($result['response'], true);
    echo "✅ Status: {$result['http_code']}\n";
    echo "   Found " . (is_array($data) ? count($data) : 0) . " runs\n";
    if (is_array($data) && count($data) > 0) {
        echo "   Sample run: ID=" . ($data[0]['id'] ?? 'N/A') . ", Status=" . ($data[0]['status'] ?? 'N/A') . "\n";
    }
} else {
    echo "❌ Status: {$result['http_code']}\n";
    echo "   Error: " . ($result['error'] ?: 'Unknown error') . "\n";
}
echo "\n";

// Test 2: GET /api/runs/{id} - Get run details
echo "2. Testing GET /api/runs/{$testRunId} (Get run details)...\n";
$result = makeRequest('GET', $baseUrl . '/api/runs/' . $testRunId);
$results['get_run_details'] = $result;

if ($result['http_code'] === 200) {
    $data = json_decode($result['response'], true);
    echo "✅ Status: {$result['http_code']}\n";
    if (is_array($data)) {
        echo "   Run ID: " . ($data['id'] ?? 'N/A') . "\n";
        echo "   Connection ID: " . ($data['connectionId'] ?? 'N/A') . "\n";
        echo "   Status: " . ($data['status'] ?? 'N/A') . "\n";
        echo "   Connection Name: " . ($data['connectionName'] ?? 'N/A') . "\n";
    } else {
        echo "   Response is not an array\n";
    }
} else {
    echo "❌ Status: {$result['http_code']}\n";
    echo "   Error: " . ($result['error'] ?: 'Unknown error') . "\n";
    if ($result['response']) {
        echo "   Response: " . substr($result['response'], 0, 200) . "\n";
    }
}
echo "\n";

// Test 3: POST /api/runs/{id}/retry - Retry run
echo "3. Testing POST /api/runs/{$testRunId}/retry (Retry run)...\n";
$result = makeRequest('POST', $baseUrl . '/api/runs/' . $testRunId . '/retry');
$results['retry_run'] = $result;

if ($result['http_code'] === 200) {
    $data = json_decode($result['response'], true);
    echo "✅ Status: {$result['http_code']}\n";
    if (is_array($data)) {
        echo "   Success: " . (($data['success'] ?? false) ? 'true' : 'false') . "\n";
        echo "   New Run ID: " . ($data['newRunId'] ?? 'N/A') . "\n";
    }
} else {
    echo "❌ Status: {$result['http_code']}\n";
    echo "   Error: " . ($result['error'] ?: 'Unknown error') . "\n";
    if ($result['response']) {
        echo "   Response: " . substr($result['response'], 0, 200) . "\n";
    }
}
echo "\n";

// Test 4: POST /api/runs/{id}/export - Export run data
echo "4. Testing POST /api/runs/{$testRunId}/export (Export run data)...\n";
$exportData = ['format' => 'json'];
$result = makeRequest('POST', $baseUrl . '/api/runs/' . $testRunId . '/export', $exportData);
$results['export_run'] = $result;

if ($result['http_code'] === 200) {
    $data = json_decode($result['response'], true);
    echo "✅ Status: {$result['http_code']}\n";
    if (is_array($data)) {
        echo "   Export ID: " . ($data['exportId'] ?? 'N/A') . "\n";
        echo "   Download URL: " . ($data['downloadUrl'] ?? 'N/A') . "\n";
    }
} else {
    echo "❌ Status: {$result['http_code']}\n";
    echo "   Error: " . ($result['error'] ?: 'Unknown error') . "\n";
    if ($result['response']) {
        echo "   Response: " . substr($result['response'], 0, 200) . "\n";
    }
}
echo "\n";

// Test 5: POST /api/execute-run - Execute run immediately
echo "5. Testing POST /api/execute-run (Execute run immediately)...\n";
// First, get a connection with baseUrl to use for the test
$connectionResult = makeRequest('GET', $baseUrl . '/api/connections?limit=5');
$testConnection = null;

if ($connectionResult['http_code'] === 200) {
    $connections = json_decode($connectionResult['response'], true);
    if (is_array($connections) && count($connections) > 0) {
        // Find a connection that has a baseUrl
        foreach ($connections as $conn) {
            if (!empty($conn['baseUrl'])) {
                $testConnection = $conn;
                break;
            }
        }
    }
}

if ($testConnection) {
    $executeData = [
        'connectionId' => $testConnection['id'],
        'apiConfig' => [
            'baseUrl' => $testConnection['baseUrl'],
            'method' => $testConnection['method'] ?? 'GET',
            'headers' => $testConnection['headers'] ?? []
        ],
        'parameters' => ['limit' => 10]
    ];

    $result = makeRequest('POST', $baseUrl . '/api/execute-run', $executeData);
    $results['execute_run'] = $result;

    if ($result['http_code'] === 200) {
        $data = json_decode($result['response'], true);
        echo "✅ Status: {$result['http_code']}\n";
        if (is_array($data)) {
            echo "   Run ID: " . ($data['runId'] ?? 'N/A') . "\n";
            echo "   Status: " . ($data['status'] ?? 'N/A') . "\n";
        }
    } else {
        echo "❌ Status: {$result['http_code']}\n";
        echo "   Error: " . ($result['error'] ?: 'Unknown error') . "\n";
        if ($result['response']) {
            echo "   Response: " . substr($result['response'], 0, 200) . "\n";
        }
    }
} else {
    echo "❌ Cannot test execute-run: No connections with baseUrl available\n";
    $results['execute_run'] = ['error' => 'No connections with baseUrl available'];
}
echo "\n";

// Summary
echo "=== Test Summary ===\n";
$successCount = 0;
$totalTests = 5;

foreach ($results as $test => $result) {
    $status = ($result['http_code'] ?? 0) === 200 ? '✅' : '❌';
    echo "$status $test: " . ($result['http_code'] ?? 'N/A') . "\n";
    if (($result['http_code'] ?? 0) === 200) {
        $successCount++;
    }
}

echo "\nTotal: $successCount/$totalTests endpoints working correctly\n";

if ($successCount === $totalTests) {
    echo "🎉 All Run Operations endpoints are functional!\n";
} else {
    echo "⚠️  Some endpoints need attention.\n";
}

echo "\nTest completed at: " . date('Y-m-d H:i:s') . "\n";
?>