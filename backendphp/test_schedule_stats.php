<?php
// Test schedule statistics update when creating a run
require_once 'vendor/autoload.php';

echo "Testing schedule statistics update..." . PHP_EOL;

// First, check for existing connections
$connectionRepo = new \App\Repositories\ConnectionRepository();
$connections = $connectionRepo->findAll();

if (empty($connections)) {
    echo "❌ No connections found. Please create a connection first." . PHP_EOL;
    exit(1);
}

$connection = $connections[0];
$connectionId = (string)($connection['_id'] ?? $connection['id']);
$connectionName = $connection['name'] ?? 'Test Connection';

echo "Using connection ID: {$connectionId}, Name: {$connectionName}" . PHP_EOL;

// Create a test schedule
$scheduleService = new \App\Services\ScheduleService();

$scheduleData = [
    'connectionId' => $connectionId,
    'connectionName' => $connectionName,
    'name' => 'Test Schedule for Stats Update',
    'description' => 'Test schedule to verify statistics update',
    'cronExpression' => '0 */1 * * *', // Every hour
    'timezone' => 'UTC',
    'isActive' => true,
    'parameters' => [],
    'dataTransformation' => null,
];

echo "Creating test schedule..." . PHP_EOL;
$scheduleResult = $scheduleService->createSchedule($scheduleData);

if (!$scheduleResult || !isset($scheduleResult['id'])) {
    echo "❌ Failed to create test schedule" . PHP_EOL;
    exit(1);
}

$scheduleId = $scheduleResult['id'];
echo "✅ Created test schedule with ID: {$scheduleId}" . PHP_EOL;

// Get the schedule repository to check updates
$scheduleRepo = new \App\Repositories\ScheduleRepository();

// Get schedule before creating run
$scheduleBefore = $scheduleRepo->findById($scheduleId);
echo "Schedule before run: " . json_encode($scheduleBefore, JSON_PRETTY_PRINT) . PHP_EOL;

// Create a test run with scheduleId
$runService = new \App\Services\RunService();

$runData = [
    'connectionId' => 'conn_1762399833577_gyhpi3p1w',
    'scheduleId' => $scheduleId,
    'status' => 'success',
    'startedAt' => date('c'),
    'completedAt' => date('c'),
    'executionTime' => 1000,
    'apiUrl' => 'https://hub.juheapi.com/aqi/v1/ip?apikey=test&ip=8.8.8.8',
    'method' => 'GET',
    'successfulRequests' => 1,
    'totalRequests' => 1,
    'recordsExtracted' => 1,
    'recordsProcessed' => 1,
    'recordsLoaded' => 1,
    'failedRequests' => 0,
    'errorMessage' => null,
    'response' => '{"code":"0","msg":"success","data":{"aqi":"13"}}',
    'extractedData' => ['aqi' => '13'],
    'dataTransformation' => null,
];

echo "Creating run with scheduleId..." . PHP_EOL;
$runId = $runService->create($runData);
echo "✅ Created run with ID: {$runId}" . PHP_EOL;

// Check if schedule statistics were updated
$updatedSchedule = $scheduleRepo->findById($scheduleId);
echo "Schedule after run: " . json_encode($updatedSchedule, JSON_PRETTY_PRINT) . PHP_EOL;

// Verify the updates
$lastRunUpdated = isset($updatedSchedule['lastRun']);
$lastStatusUpdated = isset($updatedSchedule['lastStatus']) && $updatedSchedule['lastStatus'] === 'success';
$totalRunsUpdated = isset($updatedSchedule['totalRuns']) && $updatedSchedule['totalRuns'] > ($schedule['totalRuns'] ?? 0);

echo PHP_EOL . "Verification:" . PHP_EOL;
echo "✅ Last run updated: " . ($lastRunUpdated ? 'YES' : 'NO') . PHP_EOL;
echo "✅ Last status updated: " . ($lastStatusUpdated ? 'YES' : 'NO') . PHP_EOL;
echo "✅ Total runs incremented: " . ($totalRunsUpdated ? 'YES' : 'NO') . PHP_EOL;

if ($lastRunUpdated && $lastStatusUpdated && $totalRunsUpdated) {
    echo PHP_EOL . "🎉 Schedule statistics update test PASSED!" . PHP_EOL;
} else {
    echo PHP_EOL . "❌ Schedule statistics update test FAILED!" . PHP_EOL;
}