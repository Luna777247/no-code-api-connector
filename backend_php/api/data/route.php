<?php
// GET /api/data - Retrieve and analyze data from recent runs

declare(strict_types=1);

// Resolve project root and composer autoload like the established pattern
define('ROOT_PATH', realpath(__DIR__ . '/../../..'));

// backend base should point to backend_php directory
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

// Load .env
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
    // Query params
    $connectionId = isset($_GET['connectionId']) ? (string)$_GET['connectionId'] : null;
    $limitRaw = $_GET['limit'] ?? '50';
    $skipRaw = $_GET['skip'] ?? '0';
    $format = $_GET['format'] ?? 'json';
    $timeRange = $_GET['timeRange'] ?? '7d'; // 1h, 24h, 7d, 30d

    $limit = (int)$limitRaw;
    if ($limit <= 0) { $limit = 50; }
    if ($limit > 100) { $limit = 100; }
    $skip = (int)$skipRaw;
    if ($skip < 0) { $skip = 0; }

    error_log("[v0] Fetching data from recent runs - connectionId=" . ($connectionId ?? 'null') . " limit={$limit} skip={$skip} format={$format} timeRange={$timeRange}");

    // Mongo connection
    $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
    $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');

    if (!$mongoUri || trim((string)$mongoUri) === '') {
        error_log('[ERROR] Missing MongoDB connection string. Please set MONGODB_URI or DATABASE_URL in .env');
        http_response_code(500);
        echo json_encode([
            'error' => 'Missing MongoDB configuration',
            'details' => 'Set MONGODB_URI or DATABASE_URL in .env at project root',
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // If MongoDB PHP library not installed, return mock response for development
    if (!class_exists('MongoDB\\Client')) {
        error_log('[v0] MongoDB PHP library not found, returning mock response for dev');
        $nowIso = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601);
        $mock = [
            'summary' => [
                'timeRange' => $timeRange,
                'totalRuns' => 0,
                'currentPage' => 1,
                'totalPages' => 0,
                'recordsShown' => 0,
                'totalRecords' => 0,
                'estimatedDataSize' => '0KB'
            ],
            'statistics' => [
                'totalRuns' => 0,
                'totalRecords' => 0,
                'avgExecutionTime' => 0,
                'avgRecordsPerRun' => 0,
                'minExecutionTime' => 0,
                'maxExecutionTime' => 0,
            ],
            'connectionBreakdown' => [],
            'data' => [],
            'metadata' => [
                'generatedAt' => $nowIso,
                'format' => $format,
                'filters' => [
                    'connectionId' => $connectionId ?? 'all',
                    'timeRange' => $timeRange,
                    'status' => 'success',
                ],
                'dbAvailable' => false,
                'dbError' => 'MongoDB PHP library not installed',
            ],
        ];
        http_response_code(200);
        echo json_encode($mock, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $client = new MongoDB\Client($mongoUri);
    $collection = $client->selectCollection($mongoDbName, 'api_runs');

    // Build time filter based on range (on startedAt)
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $gteDate = null;
    switch ($timeRange) {
        case '1h':
            $gteDate = $now->sub(new DateInterval('PT1H'));
            break;
        case '24h':
            $gteDate = $now->sub(new DateInterval('P1D'));
            break;
        case '7d':
            $gteDate = $now->sub(new DateInterval('P7D'));
            break;
        case '30d':
            $gteDate = $now->sub(new DateInterval('P30D'));
            break;
        default:
            $gteDate = $now->sub(new DateInterval('P7D'));
            break;
    }
    $timeFilter = [];
    if ($gteDate) {
        $timeFilter = ['startedAt' => ['$gte' => new MongoDB\BSON\UTCDateTime($gteDate->getTimestamp() * 1000)]];
    }

    // Build query filter
    $filter = array_merge([
        'status' => 'success',
    ], $timeFilter);
    if ($connectionId && trim($connectionId) !== '') {
        $filter['connectionId'] = $connectionId;
    }

    // Projection
    $projection = [
        '_id' => 1,
        'connectionId' => 1,
        'startedAt' => 1,
        'completedAt' => 1,
        'status' => 1,
        'recordsProcessed' => 1,
        'dataPreview' => 1,
        'transformedData' => 1,
        'executionTime' => 1,
    ];

    // Find runs
    $cursor = $collection->find($filter, [
        'projection' => $projection,
        'sort' => ['startedAt' => -1],
        'skip' => $skip,
        'limit' => $limit,
    ]);
    $runsWithData = iterator_to_array($cursor);

    // Total count
    $totalRuns = $collection->countDocuments($filter);

    // Process data
    $processedData = [];
    $totalRecords = 0;
    $totalDataSize = 0;

    foreach ($runsWithData as $run) {
        $runId = $run['_id'] ?? null;
        if ($runId instanceof MongoDB\BSON\ObjectId) {
            $runId = (string)$runId;
        }
        $runStartedAt = $run['startedAt'] ?? null;
        if ($runStartedAt instanceof MongoDB\BSON\UTCDateTime) {
            $runStartedAt = $runStartedAt->toDateTime()->setTimezone(new DateTimeZone('UTC'))->format(DATE_ISO8601);
        }

        $execTime = isset($run['executionTime']) ? (int)$run['executionTime'] : 0;
        $recordsProcessed = isset($run['recordsProcessed']) ? (int)$run['recordsProcessed'] : 0;

        $runData = [
            'runId' => $runId,
            'connectionId' => $run['connectionId'] ?? null,
            'timestamp' => $runStartedAt,
            'executionTime' => $execTime,
            'recordsProcessed' => $recordsProcessed,
            'status' => $run['status'] ?? null,
        ];

        if (isset($run['dataPreview'])) {
            $dp = $run['dataPreview'];
            if (is_array($dp)) {
                $runData['dataPreview'] = array_slice($dp, 0, 5);
            } else {
                $runData['dataPreview'] = $dp;
            }
        }

        if ($format === 'detailed' && isset($run['transformedData'])) {
            $td = $run['transformedData'];
            if (is_array($td)) {
                $runData['transformedData'] = array_slice($td, 0, 10);
            } else {
                $runData['transformedData'] = $td;
            }
        }

        $processedData[] = $runData;
        $totalRecords += $recordsProcessed;
        $totalDataSize += strlen(json_encode($run['transformedData'] ?? new stdClass()));
    }

    // Data statistics aggregation
    $dataStatsCursor = $collection->aggregate([
        ['$match' => $filter],
        ['$group' => [
            '_id' => null,
            'totalRuns' => ['$sum' => 1],
            'totalRecords' => ['$sum' => '$recordsProcessed'],
            'avgExecutionTime' => ['$avg' => '$executionTime'],
            'avgRecordsPerRun' => ['$avg' => '$recordsProcessed'],
            'minExecutionTime' => ['$min' => '$executionTime'],
            'maxExecutionTime' => ['$max' => '$executionTime'],
        ]],
    ]);
    $dataStatsArr = iterator_to_array($dataStatsCursor);
    $dataStats = $dataStatsArr[0] ?? null;
    if ($dataStats) {
        unset($dataStats['_id']);
    } else {
        $dataStats = [
            'totalRuns' => 0,
            'totalRecords' => 0,
            'avgExecutionTime' => 0,
            'avgRecordsPerRun' => 0,
            'minExecutionTime' => 0,
            'maxExecutionTime' => 0,
        ];
    }

    // Connection breakdown aggregation
    $connBreakCursor = $collection->aggregate([
        ['$match' => $filter],
        ['$group' => [
            '_id' => '$connectionId',
            'runCount' => ['$sum' => 1],
            'totalRecords' => ['$sum' => '$recordsProcessed'],
            'avgExecutionTime' => ['$avg' => '$executionTime'],
            'lastRun' => ['$max' => '$startedAt'],
        ]],
        ['$sort' => ['runCount' => -1]],
        ['$limit' => 10],
    ]);
    $connBreakArr = iterator_to_array($connBreakCursor);

    $connectionBreakdown = array_map(function ($conn) {
        $id = $conn['_id'] ?? null;
        $lastRun = $conn['lastRun'] ?? null;
        if ($lastRun instanceof MongoDB\BSON\UTCDateTime) {
            $lastRun = $lastRun->toDateTime()->setTimezone(new DateTimeZone('UTC'))->format(DATE_ISO8601);
        }
        return [
            'connectionId' => $id,
            'runCount' => (int)($conn['runCount'] ?? 0),
            'totalRecords' => (int)($conn['totalRecords'] ?? 0),
            'avgExecutionTime' => (int) round($conn['avgExecutionTime'] ?? 0),
            'lastRun' => $lastRun,
        ];
    }, $connBreakArr);

    $nowIso = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601);

    $result = [
        'summary' => [
            'timeRange' => $timeRange,
            'totalRuns' => (int)$totalRuns,
            'currentPage' => (int)floor($skip / ($limit > 0 ? $limit : 1)) + 1,
            'totalPages' => (int)ceil(($totalRuns) / ($limit > 0 ? $limit : 1)),
            'recordsShown' => count($processedData),
            'totalRecords' => (int)$totalRecords,
            'estimatedDataSize' => sprintf('%dKB', (int)round($totalDataSize / 1024)),
        ],
        'statistics' => $dataStats,
        'connectionBreakdown' => $connectionBreakdown,
        'data' => $processedData,
        'metadata' => [
            'generatedAt' => $nowIso,
            'format' => $format,
            'filters' => [
                'connectionId' => $connectionId ?? 'all',
                'timeRange' => $timeRange,
                'status' => 'success',
            ],
        ],
    ];

    error_log('[v0] Retrieved ' . count($processedData) . ' data records from ' . (int)$totalRuns . ' total runs');
    http_response_code(200);
    echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (MongoDB\Driver\Exception\Exception $e) {
    error_log('[v0] Error fetching data: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch data', 'message' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (Exception $e) {
    error_log('[v0] Error fetching data: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch data', 'message' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
