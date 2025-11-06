<?php
require_once 'vendor/autoload.php';

$runService = new \App\Services\RunService();
$run = $runService->getRunDetail('690ce0fd8d905db4090e57ae');

echo 'Run details: ' . json_encode($run, JSON_PRETTY_PRINT) . PHP_EOL;

if (isset($run['extractedData'])) {
    echo PHP_EOL . '✅ extractedData exists: ' . json_encode($run['extractedData']) . PHP_EOL;
} else {
    echo PHP_EOL . '❌ extractedData missing' . PHP_EOL;
}