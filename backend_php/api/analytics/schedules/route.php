<?php
// Analytics API for Airflow scheduling metrics and performance

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

$daysRaw = $_GET['days'] ?? '7';
$days = (int)$daysRaw;
if ($days <= 0) {
    $days = 7;
}

error_log('[v0] Fetching Airflow scheduling analytics');

$mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
$mongoDbName = env('MONGODB_DB', 'smart_travel_v2');

$airflowBaseUrl = rtrim((string)env('AIRFLOW_BASE_URL', ''), '/');
$airflowToken = env('AIRFLOW_TOKEN', null);
$airflowUsername = env('AIRFLOW_USERNAME', null);
$airflowPassword = env('AIRFLOW_PASSWORD', null);

$airflowData = null;
$airflowError = null;

// Helper to perform GET requests
$httpGet = function (string $url) use ($airflowToken, $airflowUsername, $airflowPassword) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $headers = ['Accept: application/json'];
    if ($airflowToken) {
        $headers[] = 'Authorization: Bearer ' . $airflowToken;
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if (!$airflowToken && $airflowUsername && $airflowPassword) {
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
        curl_setopt($ch, CURLOPT_USERPWD, $airflowUsername . ':' . $airflowPassword);
    }
    $resp = curl_exec($ch);
    if ($resp === false) {
        $err = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('HTTP request failed: ' . $err);
    }
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($code < 200 || $code >= 300) {
        throw new RuntimeException('HTTP status ' . $code . ' for ' . $url);
    }
    $data = json_decode($resp, true);
    if (!is_array($data)) {
        throw new RuntimeException('Invalid JSON from ' . $url);
    }
    return $data;
};

try {
    if ($airflowBaseUrl !== '') {
        $dagsResp = $httpGet($airflowBaseUrl . '/api/v1/dags');
        $dags = $dagsResp['dags'] ?? $dagsResp ?? [];
        if (!is_array($dags)) {
            $dags = [];
        }
        $etlDags = array_values(array_filter($dags, function ($dag) {
            return is_array($dag) && isset($dag['dag_id']) && str_starts_with((string)$dag['dag_id'], 'etl_workflow_');
        }));

        $dagRuns = [];
        foreach ($etlDags as $dag) {
            $dagId = (string)$dag['dag_id'];
            try {
                $runsResp = $httpGet($airflowBaseUrl . '/api/v1/dags/' . rawurlencode($dagId) . '/dagRuns?order_by=-execution_date&limit=20');
                $runs = $runsResp['dag_runs'] ?? $runsResp ?? [];
                if (!is_array($runs)) $runs = [];
                $mappedRuns = array_map(function ($run) {
                    $start = $run['start_date'] ?? null;
                    $end = $run['end_date'] ?? null;
                    $duration = null;
                    if ($start && $end) {
                        $duration = (int)(strtotime($end) * 1000 - strtotime($start) * 1000);
                    }
                    return [
                        'runId' => $run['dag_run_id'] ?? null,
                        'executionDate' => $run['execution_date'] ?? null,
                        'startDate' => $start,
                        'endDate' => $end,
                        'state' => $run['state'] ?? null,
                        'duration' => $duration,
                    ];
                }, $runs);

                $dagRuns[] = [
                    'dagId' => $dagId,
                    'connectionId' => str_replace('etl_workflow_', '', $dagId),
                    'scheduleInterval' => $dag['schedule_interval'] ?? null,
                    'isPaused' => $dag['is_paused'] ?? null,
                    'runs' => $mappedRuns,
                ];
            } catch (Throwable $e) {
                error_log('[v0] Error fetching runs for DAG ' . $dagId . ': ' . $e->getMessage());
                $dagRuns[] = [
                    'dagId' => $dagId,
                    'connectionId' => str_replace('etl_workflow_', '', $dagId),
                    'scheduleInterval' => $dag['schedule_interval'] ?? null,
                    'isPaused' => $dag['is_paused'] ?? null,
                    'runs' => [],
                    'error' => $e->getMessage(),
                ];
            }
        }

        $airflowData = [
            'totalDags' => count($etlDags),
            'activeDags' => count(array_filter($etlDags, fn($d) => empty($d['is_paused']))),
            'pausedDags' => count(array_filter($etlDags, fn($d) => !empty($d['is_paused']))),
            'dags' => $dagRuns,
        ];
    } else {
        $airflowError = 'AIRFLOW_BASE_URL not configured';
    }
} catch (Throwable $e) {
    error_log('[v0] Airflow API error: ' . $e->getMessage());
    $airflowError = $e->getMessage();
}

try {
    // If MongoDB library is missing, return response without performance data
    if (!class_exists('\\MongoDB\\Client')) {
        error_log('[v0] MongoDB PHP library not found, returning partial response (no performance)');
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
        $start = $now->sub(new DateInterval('P' . $days . 'D'));
        $response = [
            'airflow' => $airflowData,
            'performance' => [],
            'scheduleAdherence' => null,
            'metadata' => [
                'days' => $days,
                'dateRange' => [
                    'start' => $start->format(DATE_ISO8601),
                    'end' => $now->format(DATE_ISO8601),
                ],
                'airflowAvailable' => $airflowError === null,
                'airflowError' => $airflowError,
                'generatedAt' => $now->format(DATE_ISO8601),
            ],
        ];
        http_response_code(200);
        echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $client = new \MongoDB\Client($mongoUri);
    $collection = $client->selectCollection($mongoDbName, 'api_data_transformed');

    $endDate = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $startDate = $endDate->sub(new DateInterval('P' . $days . 'D'));

    $startUtc = new \MongoDB\BSON\UTCDateTime($startDate->getTimestamp() * 1000);
    $endUtc = new \MongoDB\BSON\UTCDateTime($endDate->getTimestamp() * 1000);

    $performancePipeline = [
        ['$match' => ['_insertedAt' => ['$gte' => $startUtc, '$lte' => $endUtc]]],
        ['$group' => [
            '_id' => [
                'connectionId' => '$_connectionId',
                'date' => ['$dateToString' => ['format' => '%Y-%m-%d', 'date' => '$_insertedAt']],
            ],
            'recordCount' => ['$sum' => 1],
            'minTime' => ['$min' => '$_insertedAt'],
            'maxTime' => ['$max' => '$_insertedAt'],
        ]],
        ['$group' => [
            '_id' => '$_id.connectionId',
            'dailyStats' => ['$push' => [
                'date' => '$_id.date',
                'recordCount' => '$recordCount',
                'minTime' => '$minTime',
                'maxTime' => '$maxTime',
                'duration' => ['$subtract' => ['$maxTime', '$minTime']],
            ]],
            'totalRecords' => ['$sum' => '$recordCount'],
            'avgRecordsPerDay' => ['$avg' => '$recordCount'],
            'activeDays' => ['$sum' => 1],
        ]],
        ['$project' => [
            '_id' => 0,
            'connectionId' => '$_id',
            'totalRecords' => 1,
            'avgRecordsPerDay' => ['$round' => ['$avgRecordsPerDay', 2]],
            'activeDays' => 1,
            'dailyStats' => 1,
            'consistency' => ['$divide' => ['$activeDays', $days]],
        ]],
        ['$sort' => ['totalRecords' => -1]],
    ];

    $performanceCursor = $collection->aggregate($performancePipeline);
    $performance = iterator_to_array($performanceCursor);

    $scheduleAdherence = null;
    if (is_array($airflowData)) {
        $scheduleAdherence = array_map(function ($dag) {
            $runs = $dag['runs'] ?? [];
            $successfulRuns = count(array_filter($runs, fn($r) => ($r['state'] ?? null) === 'success'));
            $totalRuns = count($runs);
            $successRate = $totalRuns > 0 ? ($successfulRuns / $totalRuns) * 100 : 0;
            // average duration
            $durations = array_values(array_filter(array_map(fn($r) => $r['duration'] ?? null, $runs), fn($d) => $d !== null));
            $avgDuration = 0;
            $n = count($durations);
            if ($n > 0) {
                $sum = array_reduce($durations, fn($acc, $d) => $acc + $d, 0);
                $avgDuration = $sum / $n;
            }
            $lastRunDate = $totalRuns > 0 ? ($runs[0]['executionDate'] ?? null) : null;
            return [
                'connectionId' => $dag['connectionId'] ?? null,
                'dagId' => $dag['dagId'] ?? null,
                'scheduleInterval' => $dag['scheduleInterval'] ?? null,
                'isPaused' => $dag['isPaused'] ?? null,
                'totalRuns' => $totalRuns,
                'successfulRuns' => $successfulRuns,
                'failedRuns' => count(array_filter($runs, fn($r) => ($r['state'] ?? null) === 'failed')),
                'successRate' => round($successRate, 2),
                'avgDuration' => $avgDuration,
                'lastRunDate' => $lastRunDate,
            ];
        }, $airflowData['dags'] ?? []);
    }

    $response = [
        'airflow' => $airflowData,
        'performance' => $performance,
        'scheduleAdherence' => $scheduleAdherence,
        'metadata' => [
            'days' => $days,
            'dateRange' => [
                'start' => $startDate->format(DATE_ISO8601),
                'end' => $endDate->format(DATE_ISO8601),
            ],
            'airflowAvailable' => $airflowError === null,
            'airflowError' => $airflowError,
            'generatedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
        ],
    ];

    http_response_code(200);
    echo json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (\MongoDB\Driver\Exception\Exception $e) {
    error_log('[v0] Error fetching scheduling analytics: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch scheduling analytics', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (\Throwable $e) {
    error_log('[v0] Error fetching scheduling analytics: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch scheduling analytics', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
