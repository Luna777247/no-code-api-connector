<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Config\Database;
use App\Config\AppConfig;

/**
 * Script để xóa tất cả dữ liệu trong DB và tạo dữ liệu mẫu với liên kết đúng
 */

// Khởi tạo kết nối DB
$dbManager = Database::mongoManager();
$dbName = Database::mongoDbName();

if (!$dbManager || !$dbName) {
    die("Không thể kết nối đến MongoDB. Vui lòng kiểm tra MONGODB_URI và MONGODB_DATABASE trong .env\n");
}

// Danh sách các collection cần xóa
$collections = [
    AppConfig::getApiConnectionsCollection(),
    AppConfig::getApiRunsCollection(),
    AppConfig::getApiSchedulesCollection(),
    AppConfig::getParameterModesCollection()
];

echo "=== XÓA TẤT CẢ DỮ LIỆU ===\n";

foreach ($collections as $collectionName) {
    try {
        $bulk = new MongoDB\Driver\BulkWrite();
        $bulk->delete([]);

        $command = new MongoDB\Driver\Command([
            'delete' => $collectionName,
            'deletes' => [['q' => (object)[], 'limit' => 0]]
        ]);

        $dbManager->executeCommand($dbName, $command);
        echo "✓ Đã xóa collection: $collectionName\n";
    } catch (Exception $e) {
        echo "✗ Lỗi khi xóa collection $collectionName: " . $e->getMessage() . "\n";
    }
}

echo "\n=== TẠO DỮ LIỆU MẪU ===\n";

// 1. Tạo connections mẫu
$connections = [
    [
        'name' => 'JSONPlaceholder Users API',
        'baseUrl' => 'https://jsonplaceholder.typicode.com/users',
        'method' => 'GET',
        'headers' => ['Accept' => 'application/json'],
        'description' => 'API lấy danh sách users mẫu',
        'createdAt' => new MongoDB\BSON\UTCDateTime(),
        'updatedAt' => new MongoDB\BSON\UTCDateTime()
    ],
    [
        'name' => 'JSONPlaceholder Posts API',
        'baseUrl' => 'https://jsonplaceholder.typicode.com/posts',
        'method' => 'GET',
        'headers' => ['Accept' => 'application/json'],
        'description' => 'API lấy danh sách posts mẫu',
        'createdAt' => new MongoDB\BSON\UTCDateTime(),
        'updatedAt' => new MongoDB\BSON\UTCDateTime()
    ],
    [
        'name' => 'GitHub API',
        'baseUrl' => 'https://api.github.com/users/octocat',
        'method' => 'GET',
        'headers' => ['Accept' => 'application/vnd.github.v3+json'],
        'description' => 'GitHub user API',
        'createdAt' => new MongoDB\BSON\UTCDateTime(),
        'updatedAt' => new MongoDB\BSON\UTCDateTime()
    ]
];

$connectionIds = [];
foreach ($connections as $conn) {
    $bulk = new MongoDB\Driver\BulkWrite();
    $id = $bulk->insert($conn);
    $result = $dbManager->executeBulkWrite($dbName . '.' . AppConfig::getApiConnectionsCollection(), $bulk);
    $connectionIds[] = (string)$id;
    echo "✓ Tạo connection: {$conn['name']} (ID: " . (string)$id . ")\n";
}

// 2. Tạo schedules mẫu liên kết với connections
$schedules = [];
foreach ($connectionIds as $index => $connId) {
    $schedule = [
        'connectionId' => $connId,
        'name' => 'Schedule cho ' . $connections[$index]['name'],
        'cronExpression' => '0 */6 * * *', // Mỗi 6 giờ
        'enabled' => true,
        'description' => 'Schedule tự động cho connection ' . $connections[$index]['name'],
        'createdAt' => new MongoDB\BSON\UTCDateTime(),
        'updatedAt' => new MongoDB\BSON\UTCDateTime()
    ];
    $schedules[] = $schedule;
}

$scheduleIds = [];
foreach ($schedules as $schedule) {
    $bulk = new MongoDB\Driver\BulkWrite();
    $id = $bulk->insert($schedule);
    $result = $dbManager->executeBulkWrite($dbName . '.' . AppConfig::getApiSchedulesCollection(), $bulk);
    $scheduleIds[] = (string)$id;
    echo "✓ Tạo schedule: {$schedule['name']} (ID: " . (string)$id . ")\n";
}

// 3. Tạo runs mẫu liên kết với connections và schedules
for ($i = 0; $i < 10; $i++) {
    $connIndex = $i % count($connectionIds);
    $connId = $connectionIds[$connIndex];
    $scheduleId = $scheduleIds[$connIndex];

    $run = [
        'connectionId' => $connId,
        'scheduleId' => $scheduleId,
        'status' => rand(0, 1) ? 'success' : 'failed',
        'startedAt' => date('c', strtotime("-{$i} hours")),
        'completedAt' => date('c', strtotime("-{$i} hours +5 minutes")),
        'executionTime' => rand(1000, 5000), // ms
        'apiUrl' => $connections[$connIndex]['baseUrl'],
        'method' => $connections[$connIndex]['method'],
        'successfulRequests' => rand(1, 5),
        'totalRequests' => rand(1, 5),
        'recordsProcessed' => rand(0, 100),
        'failedRequests' => rand(0, 2),
        'errorMessage' => rand(0, 1) ? null : 'Connection timeout',
        'response' => json_encode(['status' => 'sample data']),
        'createdAt' => new MongoDB\BSON\UTCDateTime(strtotime("-{$i} hours") * 1000),
        'updatedAt' => new MongoDB\BSON\UTCDateTime(strtotime("-{$i} hours") * 1000)
    ];

    $bulk = new MongoDB\Driver\BulkWrite();
    $bulk->insert($run);
    $result = $dbManager->executeBulkWrite($dbName . '.' . AppConfig::getApiRunsCollection(), $bulk);
    echo "✓ Tạo run cho connection: {$connections[$connIndex]['name']}\n";
}

// 4. Tạo parameter modes mẫu
$parameterModes = [
    [
        'name' => 'Default Parameters',
        'description' => 'Default parameter mode for basic API calls',
        'parameters' => [
            ['name' => 'limit', 'value' => '10', 'type' => 'query'],
            ['name' => 'offset', 'value' => '0', 'type' => 'query']
        ],
        'createdAt' => new MongoDB\BSON\UTCDateTime(),
        'updatedAt' => new MongoDB\BSON\UTCDateTime()
    ],
    [
        'name' => 'Pagination Mode',
        'description' => 'Parameter mode for paginated API calls',
        'parameters' => [
            ['name' => 'page', 'value' => '1', 'type' => 'query'],
            ['name' => 'per_page', 'value' => '50', 'type' => 'query']
        ],
        'createdAt' => new MongoDB\BSON\UTCDateTime(),
        'updatedAt' => new MongoDB\BSON\UTCDateTime()
    ]
];

foreach ($parameterModes as $mode) {
    $bulk = new MongoDB\Driver\BulkWrite();
    $bulk->insert($mode);
    $result = $dbManager->executeBulkWrite($dbName . '.' . AppConfig::getParameterModesCollection(), $bulk);
    echo "✓ Tạo parameter mode: {$mode['name']}\n";
}

echo "\n=== HOÀN THÀNH ===\n";
echo "Đã xóa tất cả dữ liệu cũ và tạo dữ liệu mẫu với các liên kết:\n";
echo "- Connections: " . count($connections) . "\n";
echo "- Schedules: " . count($schedules) . "\n";
echo "- Runs: 10\n";
echo "- Parameter Modes: " . count($parameterModes) . "\n";
echo "\nTất cả dữ liệu đã được đồng bộ và liên kết đúng cách!\n";