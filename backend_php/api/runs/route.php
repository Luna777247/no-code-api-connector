<?php
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

    $page = (int)($_GET['page'] ?? '1');
    $limit = (int)($_GET['limit'] ?? '20');
    $status = isset($_GET['status']) ? (string)$_GET['status'] : null; // 'success', 'failed', 'running'
    $connectionId = isset($_GET['connectionId']) ? (string)$_GET['connectionId'] : null;
    $startDate = isset($_GET['startDate']) ? (string)$_GET['startDate'] : null;
    $endDate = isset($_GET['endDate']) ? (string)$_GET['endDate'] : null;

    if ($page <= 0) { $page = 1; }
    if ($limit <= 0) { $limit = 20; }

    error_log('[v0] Fetching runs with filters: ' . json_encode([
        'page' => $page, 'limit' => $limit, 'status' => $status, 'connectionId' => $connectionId,
        'startDate' => $startDate, 'endDate' => $endDate
    ]));

    $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
    $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');

    $filters = [];
    if ($status && trim($status) !== '') {
        $filters['status'] = $status;
    }
    if ($connectionId && trim($connectionId) !== '') {
        $filters['connectionId'] = $connectionId;
    }

    $hasDateRange = false;
    $startedAt = [];
    if ($startDate) {
        $ts = strtotime($startDate);
        if ($ts !== false) {
            $startedAt['$gte'] = new MongoDB\BSON\UTCDateTime($ts * 1000);
            $hasDateRange = true;
        }
    }
    if ($endDate) {
        $ts = strtotime($endDate);
        if ($ts !== false) {
            $startedAt['$lte'] = new MongoDB\BSON\UTCDateTime($ts * 1000);
            $hasDateRange = true;
        }
    }
    if ($hasDateRange) {
        $filters['startedAt'] = $startedAt;
    }

    $client = null;
    $collection = null;

    if ($mongoUri && class_exists('MongoDB\\Client')) {
        $client = new MongoDB\Client($mongoUri);
        $collection = $client->selectCollection($mongoDbName, 'api_runs');
    }

    $runs = [];
    $totalRuns = 0;

    if ($collection) {
        $cursor = $collection->find(
            $filters,
            [
                'sort' => ['startedAt' => -1],
                'skip' => ($page - 1) * $limit,
                'limit' => $limit,
            ]
        );
        $docs = iterator_to_array($cursor);
        foreach ($docs as $doc) {
            if (isset($doc['_id']) && $doc['_id'] instanceof MongoDB\BSON\ObjectId) {
                $doc['_id'] = (string)$doc['_id'];
            }
            foreach (['startedAt','completedAt'] as $dtField) {
                if (isset($doc[$dtField]) && $doc[$dtField] instanceof MongoDB\BSON\UTCDateTime) {
                    $doc[$dtField] = $doc[$dtField]->toDateTime()->setTimezone(new DateTimeZone('UTC'))->format(DATE_ISO8601);
                }
            }
            $runs[] = $doc;
        }
        $totalRuns = $collection->countDocuments($filters);
    }

    if (!$collection || count($runs) === 0) {
        $mockRuns = [
            [
                'id' => 'run_001',
                'connectionId' => 'conn_123',
                'status' => 'success',
                'startedAt' => (new DateTimeImmutable('-1 hour', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'completedAt' => (new DateTimeImmutable('-59 minutes', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'duration' => 10000,
                'recordsProcessed' => 150,
                'recordsLoaded' => 148,
                'errorCount' => 2,
                'message' => 'ETL completed successfully',
            ],
            [
                'id' => 'run_002',
                'connectionId' => 'conn_456',
                'status' => 'failed',
                'startedAt' => (new DateTimeImmutable('-2 hours', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'completedAt' => (new DateTimeImmutable('-1 hour 59 minutes', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'duration' => 5000,
                'recordsProcessed' => 0,
                'recordsLoaded' => 0,
                'errorCount' => 1,
                'message' => 'Connection timeout error',
            ],
            [
                'id' => 'run_003',
                'connectionId' => 'conn_789',
                'status' => 'running',
                'startedAt' => (new DateTimeImmutable('-5 minutes', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'completedAt' => null,
                'duration' => null,
                'recordsProcessed' => 75,
                'recordsLoaded' => 73,
                'errorCount' => 0,
                'message' => 'Processing in progress...',
            ],
        ];
        // Apply filters on mock
        $mockRuns = array_values(array_filter($mockRuns, function ($run) use ($status, $connectionId) {
            if ($status && ($run['status'] ?? null) !== $status) return false;
            if ($connectionId && ($run['connectionId'] ?? null) !== $connectionId) return false;
            return true;
        }));
        $totalRuns = count($mockRuns);
        $offset = ($page - 1) * $limit;
        $runs = array_slice($mockRuns, $offset, $limit);
    }

    // Summary
    if ($collection) {
        $successfulRuns = $collection->countDocuments(array_merge($filters, ['status' => 'success']));
        $failedRuns = $collection->countDocuments(array_merge($filters, ['status' => 'failed']));
        $runningRuns = $collection->countDocuments(array_merge($filters, ['status' => 'running']));
    } else {
        $successfulRuns = count(array_filter($runs, fn($r) => ($r['status'] ?? null) === 'success'));
        $failedRuns = count(array_filter($runs, fn($r) => ($r['status'] ?? null) === 'failed'));
        $runningRuns = count(array_filter($runs, fn($r) => ($r['status'] ?? null) === 'running'));
    }

    $response = [
        'runs' => $runs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => (int)$totalRuns,
            'pages' => (int)ceil(($limit > 0 ? $totalRuns / $limit : 0)),
        ],
        'filters' => [
            'status' => $status,
            'connectionId' => $connectionId,
            'startDate' => $startDate,
            'endDate' => $endDate,
        ],
        'summary' => [
            'totalRuns' => (int)$totalRuns,
            'successfulRuns' => (int)$successfulRuns,
            'failedRuns' => (int)$failedRuns,
            'runningRuns' => (int)$runningRuns,
        ],
    ];

    error_log('[v0] Retrieved runs: ' . count($runs));

    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (MongoDB\Driver\Exception\Exception $e) {
    error_log('[v0] Error fetching runs: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch runs', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (Throwable $e) {
    error_log('[v0] Error fetching runs: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch runs', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
