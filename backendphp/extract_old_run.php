<?php
require_once 'vendor/autoload.php';

$runService = new \App\Services\RunService();
$run = $runService->getRunDetail('690ce0fd8d905db4090e57ae');

$response = $run['response'];
echo 'Raw response: ' . $response . PHP_EOL;

$decoded = json_decode($response, true);
if (isset($decoded['data'])) {
    echo 'Extracted data: ' . json_encode($decoded['data'], JSON_PRETTY_PRINT) . PHP_EOL;
} else {
    echo 'No data field found in response' . PHP_EOL;
}

// Test the extraction logic
$extractedData = null;
if (is_array($decoded)) {
    $extractedData = isset($decoded['data']) ? $decoded['data'] : $decoded;
}

echo PHP_EOL . 'Final extractedData: ' . json_encode($extractedData, JSON_PRETTY_PRINT) . PHP_EOL;