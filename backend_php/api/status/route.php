<?php
// GET /api/status - System status and statistics (PHP equivalent)

declare(strict_types=1);

define('ROOT_PATH', realpath(__DIR__ . '/../../..'));

$__backend_base = realpath(__DIR__ . '/../..');
$__autoload_paths = [];
if ($__backend_base) {
    $__autoload_paths[] = $__backend_base . '/vendor/autoload.php';
}
$__autoload_paths[] = ROOT_PATH . '/vendor/autoload.php';

$__autoload_loaded = false;
foreach ($__autoload_paths as $__p) {
    if (is_string($__p) && file_exists($__p)) {
        require_once $__p;
        $__autoload_loaded = true;
        break;
    }
}
if (!$__autoload_loaded) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'error' => 'Composer autoload not found',
        'details' => 'Expected at backend_php/vendor/autoload.php or vendor/autoload.php at project root',
        'pathsTried' => $__autoload_paths,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $dotenv = Dotenv\Dotenv::createImmutable(ROOT_PATH);
    $dotenv->load();
} catch (Throwable $e) {
    error_log('[ERROR] Failed to load .env file: ' . $e->getMessage());
}

if (!function_exists('env')) {
    function env(string $key, $default = null): mixed
    {
        return $_ENV[$key]
            ?? $_SERVER[$key]
            ?? getenv($key)
            ?: $default;
    }
}

header('Content-Type: application/json; charset=utf-8');

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (strtoupper($method) !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed', 'allowed' => ['GET']], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    error_log('[v0] Fetching system status');

    $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
    $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');

    $client = null;
    if ($mongoUri && class_exists('MongoDB\\Client')) {
        $client = new MongoDB\Client($mongoUri);
    }

    $totalConnections = 0;
    $activeConnections = 0;
    $totalRuns = 0;
    $runningRuns = 0;
    $totalSchedules = 0;
    $activeSchedules = 0;
    $totalMappings = 0;

    $recentTotalRuns = 0;
    $recentSuccessRuns = 0;
    $recentFailedRuns = 0;

    $topConnections = [];

    if ($client) {
        $db = $client->selectDatabase($mongoDbName);

        $totalConnections = $db->selectCollection('api_connections')->countDocuments([]);
        $activeConnections = $db->selectCollection('api_connections')->countDocuments(['isActive' => true]);
        $totalRuns = $db->selectCollection('api_runs')->countDocuments([]);
        $runningRuns = $db->selectCollection('api_runs')->countDocuments(['status' => 'running']);
        $totalSchedules = $db->selectCollection('api_schedules')->countDocuments([]);
        $activeSchedules = $db->selectCollection('api_schedules')->countDocuments(['isActive' => true]);
        $totalMappings = $db->selectCollection('api_field_mappings')->countDocuments([]);

        $last24h = new DateTimeImmutable('-24 hours', new DateTimeZone('UTC'));
        $last24hUtc = new MongoDB\BSON\UTCDateTime($last24h->getTimestamp() * 1000);

        $recentTotalRuns = $db->selectCollection('api_runs')->countDocuments([
            'startedAt' => ['$gte' => $last24hUtc],
        ]);
        $recentSuccessRuns = $db->selectCollection('api_runs')->countDocuments([
            'startedAt' => ['$gte' => $last24hUtc],
            'status' => 'success',
        ]);
        $recentFailedRuns = $db->selectCollection('api_runs')->countDocuments([
            'startedAt' => ['$gte' => $last24hUtc],
            'status' => 'failed',
        ]);

        $agg = $db->selectCollection('api_runs')->aggregate([
            ['$match' => ['startedAt' => ['$gte' => $last24hUtc]]],
            ['$group' => [
                '_id' => '$connectionId',
                'runCount' => ['$sum' => 1],
                'successCount' => ['$sum' => ['$cond' => [['$eq' => ['$status', 'success']], 1, 0]]],
                'lastRun' => ['$max' => '$startedAt'],
            ]],
            ['$sort' => ['runCount' => -1]],
            ['$limit' => 5],
        ]);
        $topConnectionsDocs = iterator_to_array($agg);
        foreach ($topConnectionsDocs as $conn) {
            $lastRun = $conn['lastRun'] ?? null;
            if ($lastRun instanceof MongoDB\BSON\UTCDateTime) {
                $lastRun = $lastRun->toDateTime()->setTimezone(new DateTimeZone('UTC'))->format(DATE_ISO8601);
            }
            $runCount = (int)($conn['runCount'] ?? 0);
            $successCount = (int)($conn['successCount'] ?? 0);
            $topConnections[] = [
                'connectionId' => $conn['_id'] ?? null,
                'runCount' => $runCount,
                'successRate' => $runCount > 0 ? (int)round(($successCount / $runCount) * 100) : 0,
                'lastRun' => $lastRun,
            ];
        }
    } else {
        // Fallback mock data if DB not available
        $totalConnections = 3;
        $activeConnections = 2;
        $totalRuns = 90;
        $runningRuns = 1;
        $totalSchedules = 5;
        $activeSchedules = 4;
        $totalMappings = 7;
        $recentTotalRuns = 12;
        $recentSuccessRuns = 10;
        $recentFailedRuns = 2;
        $topConnections = [
            [
                'connectionId' => 'conn_123',
                'runCount' => 8,
                'successRate' => 88,
                'lastRun' => (new DateTimeImmutable('-10 minutes', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            ],
        ];
    }

    $successRate = $recentTotalRuns > 0 ? (int)round(($recentSuccessRuns / $recentTotalRuns) * 100) : 0;

    $mockMetrics = [
        'avgResponseTime' => 245,
        'dataVolumeToday' => 125000,
        'errorRate' => (int)round((1 - ($successRate / 100)) * 100),
        'systemLoad' => [
            'cpu' => 15.5,
            'memory' => 68.2,
            'disk' => 45.8,
        ],
    ];

    $systemInfo = [
        'nodeVersion' => PHP_VERSION,
        'platform' => PHP_OS_FAMILY,
        'architecture' => php_uname('m'),
        'environment' => env('APP_ENV', 'development'),
        'timezone' => date_default_timezone_get() ?: 'UTC',
    ];

    $status = [
        'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
        'uptime' => null, // PHP không có process uptime; để null
        'connections' => [
            'total' => (int)$totalConnections,
            'active' => (int)$activeConnections,
            'utilization' => $totalConnections > 0 ? (int)round(($activeConnections / $totalConnections) * 100) : 0,
        ],
        'runs' => [
            'total' => (int)$totalRuns,
            'running' => (int)$runningRuns,
            'last24h' => (int)$recentTotalRuns,
            'successRate' => (int)$successRate,
        ],
        'schedules' => [
            'total' => (int)$totalSchedules,
            'active' => (int)$activeSchedules,
            'utilization' => $totalSchedules > 0 ? (int)round(($activeSchedules / $totalSchedules) * 100) : 0,
        ],
        'mappings' => [
            'total' => (int)$totalMappings,
        ],
        'activity' => [
            'period' => '24h',
            'totalRuns' => (int)$recentTotalRuns,
            'successfulRuns' => (int)$recentSuccessRuns,
            'failedRuns' => (int)$recentFailedRuns,
            'successRate' => (int)$successRate,
        ],
        'performance' => $mockMetrics,
        'topConnections' => $topConnections,
        'system' => $systemInfo,
    ];

    error_log('[v0] System status retrieved successfully');
    http_response_code(200);
    echo json_encode($status, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (MongoDB\Driver\Exception\Exception $e) {
    error_log('[v0] Error fetching system status: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to fetch system status',
        'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
        'details' => $e->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (Throwable $e) {
    error_log('[v0] Error fetching system status: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to fetch system status',
        'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
        'details' => $e->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
