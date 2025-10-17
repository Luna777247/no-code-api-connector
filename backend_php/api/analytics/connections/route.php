<?php
// Analytics API for connection metrics - performance and health data

declare(strict_types=1);

define('ROOT_PATH', realpath(__DIR__ . '/../../../..'));

$__backend_base = realpath(__DIR__ . '/../../..');
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

// Read query params
$period = $_GET['period'] ?? 'daily'; // daily, hourly, weekly
$daysRaw = $_GET['days'] ?? '30';

// validate days
$days = intval($daysRaw);
if ($days <= 0) {
	$days = 30;
}

error_log("[v0] Fetching connections metrics - period={$period} days={$days}");

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
	// Ensure we have a date range available even when MongoDB PHP library is missing
	$endDate = new DateTimeImmutable('now', new DateTimeZone('UTC'));
	$startDate = $endDate->sub(new DateInterval('P' . $days . 'D'));

	// Use MongoDB client from mongodb/mongodb (composer) if available
		if (!class_exists('\MongoDB\Client')) {
			// Return mock response for development when PHP MongoDB library is not installed
			error_log('[v0] MongoDB PHP library not found, returning mock response for dev');
			$mockResponse = [
				'metrics' => [],
				'health' => [
					[
						'connectionId' => 'mock_conn_1',
						'totalRecords' => 0,
						'firstSeen' => null,
						'lastSeen' => null,
						'activeDays' => 0,
						'avgRecordsPerDay' => 0,
						'daysSinceLastData' => null,
						'healthStatus' => 'healthy'
					]
				],
				'systemMetrics' => [
					'totalConnections' => 1,
					'healthyConnections' => 1,
					'warningConnections' => 0,
					'errorConnections' => 0,
					'totalRecords' => 0,
					'avgRecordsPerConnection' => 0
				],
				'metadata' => [
					'period' => $period,
					'days' => $days,
					'dateRange' => [
						'start' => $startDate->format(DATE_ISO8601),
						'end' => $endDate->format(DATE_ISO8601)
					],
					'generatedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
					'dbAvailable' => false,
					'dbError' => 'MongoDB PHP library not installed'
				]
			];
			http_response_code(200);
			echo json_encode($mockResponse, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
			exit;
		}

		$client = new \MongoDB\Client($mongoUri);
	$collection = $client->selectCollection($mongoDbName, 'api_data_transformed');

	// Calculate date range
	$endDate = new DateTimeImmutable('now', new DateTimeZone('UTC'));
	$startDate = $endDate->sub(new DateInterval('P' . $days . 'D'));

	// Convert to MongoDB BSON UTCDateTime
	$endUtc = new \MongoDB\BSON\UTCDateTime($endDate->getTimestamp() * 1000);
	$startUtc = new \MongoDB\BSON\UTCDateTime($startDate->getTimestamp() * 1000);

	// Determine grouping format based on period
	$dateFormat = "%Y-%m-%d";
	$groupByPeriod = "day";
	if ($period === 'hourly') {
		$dateFormat = "%Y-%m-%d %H:00";
		$groupByPeriod = "hour";
	} elseif ($period === 'weekly') {
		$dateFormat = "%Y-W%U";
		$groupByPeriod = "week";
	}

	// Build aggregation pipeline (metrics)
	$pipeline = [
		['$match' => ['_insertedAt' => ['$gte' => $startUtc, '$lte' => $endUtc]]],
		['$group' => [
			'_id' => [
				'connectionId' => '$_connectionId',
				'period' => ['$dateToString' => ['format' => $dateFormat, 'date' => '$_insertedAt']]
			],
			'recordCount' => ['$sum' => 1],
			'firstRecord' => ['$min' => '$_insertedAt'],
			'lastRecord' => ['$max' => '$_insertedAt'],
			'fieldCount' => ['$sum' => ['$size' => ['$objectToArray' => '$$ROOT']]],
			'avgFieldCount' => ['$avg' => ['$size' => ['$objectToArray' => '$$ROOT']]]
		]],
		['$project' => [
			'_id' => 0,
			'connectionId' => '$_id.connectionId',
			'period' => '$_id.period',
			'recordCount' => 1,
			'firstRecord' => 1,
			'lastRecord' => 1,
			'avgFieldCount' => ['$round' => ['$avgFieldCount', 2]],
			'processingDuration' => ['$divide' => [['$subtract' => ['$lastRecord', '$firstRecord']], 1000]],
			'recordsPerSecond' => [
				'$cond' => [
					'if' => ['$gt' => [['$subtract' => ['$lastRecord', '$firstRecord']], 0]],
					'then' => ['$divide' => ['$recordCount', ['$divide' => [['$subtract' => ['$lastRecord', '$firstRecord']], 1000]]]],
					'else' => 0
				]
			]
		]],
		['$sort' => ['period' => -1, 'connectionId' => 1]]
	];

	$metricsCursor = $collection->aggregate($pipeline);
	$metrics = iterator_to_array($metricsCursor);

	// Health pipeline
	$healthPipeline = [
		['$match' => ['_insertedAt' => ['$gte' => $startUtc, '$lte' => $endUtc]]],
		['$group' => [
			'_id' => '$_connectionId',
			'totalRecords' => ['$sum' => 1],
			'firstSeen' => ['$min' => '$_insertedAt'],
			'lastSeen' => ['$max' => '$_insertedAt'],
			'daysWithData' => ['$addToSet' => ['$dateToString' => ['format' => '%Y-%m-%d', 'date' => '$_insertedAt']]]
		]],
		['$project' => [
			'_id' => 0,
			'connectionId' => '$_id',
			'totalRecords' => 1,
			'firstSeen' => 1,
			'lastSeen' => 1,
			'activeDays' => ['$size' => '$daysWithData'],
			'avgRecordsPerDay' => ['$divide' => ['$totalRecords', ['$size' => '$daysWithData']]],
			'daysSinceLastData' => ['$divide' => [['$subtract' => [(new \MongoDB\BSON\UTCDateTime((new DateTimeImmutable())->getTimestamp()*1000)), '$lastSeen']], 1000 * 60 * 60 * 24]],
			'healthStatus' => ['$switch' => [
				'branches' => [
					['case' => ['$lt' => [['$divide' => [['$subtract' => [(new \MongoDB\BSON\UTCDateTime((new DateTimeImmutable())->getTimestamp()*1000)), '$lastSeen']], 1000 * 60 * 60 * 24]], 1]], 'then' => 'healthy'],
					['case' => ['$lt' => [['$divide' => [['$subtract' => [(new \MongoDB\BSON\UTCDateTime((new DateTimeImmutable())->getTimestamp()*1000)), '$lastSeen']], 1000 * 60 * 60 * 24]], 7]], 'then' => 'warning']
				],
				'default' => 'error'
			]]
		]],
		['$sort' => ['totalRecords' => -1]]
	];

	$healthCursor = $collection->aggregate($healthPipeline);
	$health = iterator_to_array($healthCursor);

	// Post-process system metrics
	$totalRecords = 0;
	foreach ($health as $h) {
		$totalRecords += $h['totalRecords'] ?? 0;
	}

	$systemMetrics = [
		'totalConnections' => count($health),
		'healthyConnections' => count(array_filter($health, fn($x) => ($x['healthStatus'] ?? '') === 'healthy')),
		'warningConnections' => count(array_filter($health, fn($x) => ($x['healthStatus'] ?? '') === 'warning')),
		'errorConnections' => count(array_filter($health, fn($x) => ($x['healthStatus'] ?? '') === 'error')),
		'totalRecords' => $totalRecords,
		'avgRecordsPerConnection' => count($health) > 0 ? (int) round($totalRecords / count($health)) : 0
	];

	$response = [
		'metrics' => $metrics,
		'health' => $health,
		'systemMetrics' => $systemMetrics,
		'metadata' => [
			'period' => $period,
			'days' => $days,
			'dateRange' => ['start' => $startDate->format(DATE_ISO8601), 'end' => $endDate->format(DATE_ISO8601)],
			'generatedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601)
		]
	];

	http_response_code(200);
	echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
	exit;

} catch (\MongoDB\Driver\Exception\Exception $e) {
	error_log('[v0] Error fetching connection metrics: ' . $e->getMessage());
	http_response_code(500);
	echo json_encode(['error' => 'Failed to fetch connection metrics', 'details' => $e->getMessage()]);
	exit;
} catch (\Exception $e) {
	error_log('[v0] Error fetching connection metrics: ' . $e->getMessage());
	http_response_code(500);
	echo json_encode(['error' => 'Failed to fetch connection metrics', 'details' => $e->getMessage()]);
	exit;
}

?>

