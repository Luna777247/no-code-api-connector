<?php
require_once __DIR__ . '/../vendor/autoload.php';

// Test execution service
use App\Services\ExecutionService;
use App\Repositories\RunRepository;

$executionService = new ExecutionService();
$runRepo = new RunRepository();

// Create a test run
$testRunData = [
    'connectionId' => 'test_connection',
    'scheduleId' => 'test_schedule',
    'status' => 'pending',
    'apiUrl' => 'https://httpbin.org/get',
    'method' => 'GET'
];

$runId = $runRepo->insert($testRunData);
echo "Created test run: $runId\n";

// Execute the run
$result = $executionService->executeApiCall($runId);
echo "Execution result: " . ($result ? 'Success' : 'Failed') . "\n";

// Get updated run data
$updatedRun = $runRepo->findById($runId);
echo "Updated run data:\n";
print_r($updatedRun);