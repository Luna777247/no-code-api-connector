<?php
// Test creating a new run with extracted data
require_once 'vendor/autoload.php';

// Simulate the response from the API that was used
$body = '{"code":"0","msg":"success","data":{"city":"Redwood City, San Mateo, California","aqi":"13","co":"3.4","no2":"5.9","o3":"9.6","pm10":"","pm25":"13","so2":"","geo":{"lat":"37.48293","lon":"-122.20348"}}}';

echo 'API Response Body: ' . $body . PHP_EOL;

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

// Create a new run with the extracted data
$runService = new \App\Services\RunService();

$runData = [
    'connectionId' => 'conn_1762399833577_gyhpi3p1w',
    'status' => 'success',
    'startedAt' => date('c'),
    'completedAt' => date('c'),
    'executionTime' => 6355,
    'apiUrl' => 'https://hub.juheapi.com/aqi/v1/ip?apikey=434306d581f376e3aa290e7c7df966fc&ip=8.8.8.8',
    'method' => 'GET',
    'successfulRequests' => 1,
    'totalRequests' => 1,
    'recordsExtracted' => $recordsExtracted,
    'recordsProcessed' => $recordsExtracted,
    'recordsLoaded' => $recordsExtracted,
    'failedRequests' => 0,
    'errorMessage' => null,
    'response' => $body,
    'extractedData' => $extractedData,
    'dataTransformation' => null,
];

$runId = $runService->create($runData);
echo 'Created new run with ID: ' . $runId . PHP_EOL;

// Get run details
$run = $runService->getRunDetail($runId);
echo PHP_EOL . 'New run details: ' . json_encode($run, JSON_PRETTY_PRINT) . PHP_EOL;

if (isset($run['extractedData'])) {
    echo PHP_EOL . '✅ New run has extractedData: ' . json_encode($run['extractedData']) . PHP_EOL;
} else {
    echo PHP_EOL . '❌ New run missing extractedData' . PHP_EOL;
}