<?php
require_once 'vendor/autoload.php';

$runService = new \App\Services\RunService();
$run = $runService->getRunDetail('690ce0fd8d905db4090e57ae');

echo 'Run extractedData: ' . json_encode($run['extractedData'], JSON_PRETTY_PRINT) . PHP_EOL;

if ($run['extractedData']) {
    echo '✅ Old run now has extractedData!' . PHP_EOL;
} else {
    echo '❌ Still no extractedData' . PHP_EOL;
}