<?php
// Test extracted data functionality by checking the logic manually
require_once 'vendor/autoload.php';

// Simulate the response body that would come from an API
$body = json_encode([
    'data' => [
        ['id' => 1, 'name' => 'Test User 1', 'email' => 'test1@example.com'],
        ['id' => 2, 'name' => 'Test User 2', 'email' => 'test2@example.com']
    ],
    'total' => 2
]);

echo 'Mock API Response Body: ' . $body . PHP_EOL;

// Simulate the extracted data logic from PipelineController
$extractedData = null;
$decodedBody = json_decode($body, true);
if (is_array($decodedBody)) {
    // Extract data field if it exists, otherwise use the whole response
    $extractedData = isset($decodedBody['data']) ? $decodedBody['data'] : $decodedBody;
}

echo 'Extracted Data: ' . json_encode($extractedData, JSON_PRETTY_PRINT) . PHP_EOL;

// Simulate records extracted calculation
$recordsExtracted = 0;
if (is_array($decodedBody)) {
    if (isset($decodedBody['data'])) {
        $data = $decodedBody['data'];
        if (is_array($data)) {
            $firstElement = reset($data);
            if (is_array($firstElement) || is_object($firstElement)) {
                $recordsExtracted = count($data);
            } else {
                $recordsExtracted = 1;
            }
        } elseif (is_object($data) || is_array($data)) {
            $recordsExtracted = 1;
        }
    } else {
        $recordsExtracted = is_array($decodedBody) ? count($decodedBody) : 1;
    }
}

echo 'Records Extracted: ' . $recordsExtracted . PHP_EOL;

// Test RunService enrichment
$runService = new \App\Services\RunService();

// Create a test run with extracted data
$runData = [
    'connectionId' => 'test-connection',
    'status' => 'success',
    'recordsExtracted' => $recordsExtracted,
    'extractedData' => $extractedData,
    'response' => $body
];

echo 'Data to insert: ' . json_encode($runData, JSON_PRETTY_PRINT) . PHP_EOL;

$runId = $runService->create($runData);
echo 'Created run with ID: ' . $runId . PHP_EOL;

// Get run details
$run = $runService->getRunDetail($runId);
echo PHP_EOL . 'Retrieved run details: ' . json_encode($run, JSON_PRETTY_PRINT) . PHP_EOL;

if (isset($run['extractedData'])) {
    echo PHP_EOL . '✅ extractedData is properly saved and retrieved' . PHP_EOL;
    echo 'Extracted data contains ' . count($run['extractedData']) . ' records' . PHP_EOL;
} else {
    echo PHP_EOL . '❌ extractedData missing from retrieved run' . PHP_EOL;
}