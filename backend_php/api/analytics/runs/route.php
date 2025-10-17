<?php
// Analytics API for ETL runs summary - optimized for Metabase dashboards

declare(strict_types=1);

define('ROOT_PATH', realpath(__DIR__ . '/../../../..'));

require_once __DIR__ . '/../../../vendor/autoload.php';

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

// Read query params
$startDateStr = $_GET['start_date'] ?? null;
$endDateStr = $_GET['end_date'] ?? null;
$connectionId = $_GET['connection_id'] ?? null;
$status = $_GET['status'] ?? null; // Not used in current pipelines but kept for parity
$limitRaw = $_GET['limit'] ?? '100';
$limit = (int)$limitRaw;
if ($limit <= 0) {
    $limit = 100;
}

error_log('[v0] Fetching ETL runs analytics');

// MongoDB connection settings
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

try {
    // Fallback when MongoDB PHP library is not installed
    if (!class_exists('\\MongoDB\\Client')) {
        error_log('[v0] MongoDB PHP library not found, returning mock response for dev');
        $response = [
            'runs' => [],
            'summary' => [],
            'metadata' => [
                'totalRuns' => 0,
                'dateRange' => [
                    'start' => $startDateStr,
                    'end' => $endDateStr,
                ],
                'filters' => [
                    'connectionId' => $connectionId,
                    'status' => $status,
                ],
                'generatedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'cached' => false,
                'dbAvailable' => false,
                'dbError' => 'MongoDB PHP library not installed',
            ],
        ];
        http_response_code(200);
        echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $client = new \MongoDB\Client($mongoUri);
    $collection = $client->selectCollection($mongoDbName, 'api_data_transformed');

    // Build filters
    $filters = [];

    if ($startDateStr !== null || $endDateStr !== null) {
        $dateFilter = [];
        if ($startDateStr !== null) {
            try {
                $startDt = new DateTimeImmutable($startDateStr, new DateTimeZone('UTC'));
                $dateFilter['$gte'] = new \MongoDB\BSON\UTCDateTime($startDt->getTimestamp() * 1000);
            } catch (Throwable $e) {
                error_log('[WARN] Invalid start_date: ' . $startDateStr . ' - ' . $e->getMessage());
            }
        }
        if ($endDateStr !== null) {
            try {
                $endDt = new DateTimeImmutable($endDateStr, new DateTimeZone('UTC'));
                $dateFilter['$lte'] = new \MongoDB\BSON\UTCDateTime($endDt->getTimestamp() * 1000);
            } catch (Throwable $e) {
                error_log('[WARN] Invalid end_date: ' . $endDateStr . ' - ' . $e->getMessage());
            }
        }
        if (!empty($dateFilter)) {
            $filters['_insertedAt'] = $dateFilter;
        }
    }

    if ($connectionId !== null && $connectionId !== '') {
        $filters['_connectionId'] = $connectionId;
    }

    // Aggregation pipeline for ETL runs summary
    $pipeline = [
        ['$match' => $filters],
        ['$group' => [
            '_id' => [
                'connectionId' => '$_connectionId',
                'date' => ['$dateToString' => [
                    'format' => '%Y-%m-%d',
                    'date' => '$_insertedAt',
                ]],
            ],
            'totalRecords' => ['$sum' => 1],
            'firstRecord' => ['$min' => '$_insertedAt'],
            'lastRecord' => ['$max' => '$_insertedAt'],
            'sampleData' => ['$first' => '$$ROOT'],
        ]],
        ['$project' => [
            '_id' => 0,
            'connectionId' => '$_id.connectionId',
            'date' => '$_id.date',
            'totalRecords' => 1,
            'firstRecord' => 1,
            'lastRecord' => 1,
            'duration' => ['$subtract' => ['$lastRecord', '$firstRecord']],
            'sampleFields' => ['$objectToArray' => '$sampleData'],
        ]],
        ['$sort' => ['date' => -1, 'connectionId' => 1]],
        ['$limit' => $limit],
    ];

    $runsCursor = $collection->aggregate($pipeline);
    $runs = iterator_to_array($runsCursor);

    // Get connection summary statistics
    $summaryPipeline = [
        ['$match' => $filters],
        ['$group' => [
            '_id' => '$_connectionId',
            'totalRecords' => ['$sum' => 1],
            'firstSeen' => ['$min' => '$_insertedAt'],
            'lastSeen' => ['$max' => '$_insertedAt'],
            'avgRecordsPerDay' => ['$avg' => 1],
        ]],
        ['$project' => [
            '_id' => 0,
            'connectionId' => '$_id',
            'totalRecords' => 1,
            'firstSeen' => 1,
            'lastSeen' => 1,
            'daysActive' => ['$ceil' => ['$divide' => [['$subtract' => ['$lastSeen', '$firstSeen']], 1000 * 60 * 60 * 24]]],
        ]],
    ];

    $summaryCursor = $collection->aggregate($summaryPipeline);
    $summary = iterator_to_array($summaryCursor);

    $response = [
        'runs' => $runs,
        'summary' => $summary,
        'metadata' => [
            'totalRuns' => count($runs),
            'dateRange' => [
                'start' => $startDateStr,
                'end' => $endDateStr,
            ],
            'filters' => [
                'connectionId' => $connectionId,
                'status' => $status,
            ],
            'generatedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'cached' => false,
        ],
    ];

    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (\MongoDB\Driver\Exception\Exception $e) {
    error_log('[v0] Error fetching runs analytics: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch runs analytics', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (\Throwable $e) {
    error_log('[v0] Error fetching runs analytics: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch runs analytics', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
