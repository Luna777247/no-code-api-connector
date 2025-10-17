<?php
// POST/GET /api/scheduler - Manage Airflow schedules (PHP equivalent)

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

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

try {
    if ($method === 'POST') {
        // Parse JSON body with fallbacks
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $raw = file_get_contents('php://input');
        $rawTrim = is_string($raw) ? trim($raw) : '';
        $isJson = stripos($contentType, 'application/json') !== false;
        $body = null;

        if ($isJson && $rawTrim !== '') {
            $body = json_decode($rawTrim, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON body', 'message' => json_last_error_msg()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }
        } elseif (isset($_POST['payload'])) {
            $payload = (string)$_POST['payload'];
            $body = json_decode($payload, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid JSON body (payload)', 'message' => json_last_error_msg()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }
        } else {
            $body = [];
        }

        if (!is_array($body)) { $body = []; }
        $connectionId = $body['connectionId'] ?? null;
        $scheduleType = $body['scheduleType'] ?? null;
        $cronExpression = $body['cronExpression'] ?? null;
        $workflowConfig = $body['workflowConfig'] ?? null;

        error_log('[v0] Creating Airflow schedule for connection: ' . json_encode($connectionId));
        error_log('[v0] Schedule type: ' . json_encode($scheduleType));
        error_log('[v0] CRON expression: ' . json_encode($cronExpression));

        if (!$connectionId || !$cronExpression) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: connectionId, cronExpression'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }

        // Attempt to use a PHP Airflow client if available; otherwise fallback to mock
        $clientClasses = ['\\App\\AirflowClient', 'AirflowClient'];
        $usedClient = null;
        foreach ($clientClasses as $cls) {
            if (class_exists($cls)) { $usedClient = $cls; break; }
        }

        try {
            if ($usedClient) {
                $client = new $usedClient();
                if (!method_exists($client, 'createDag')) { throw new RuntimeException('Airflow client missing createDag()'); }
                $dagId = $client->createDag($connectionId, $cronExpression, $workflowConfig);
                if (method_exists($client, 'pauseDag')) { $client->pauseDag($dagId, false); }

                $schedule = [
                    'id' => $dagId,
                    'connectionId' => $connectionId,
                    'scheduleType' => $scheduleType,
                    'cronExpression' => $cronExpression,
                    'isActive' => true,
                    'airflowDagId' => $dagId,
                    'nextRun' => (new DateTimeImmutable('+1 day', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                    'createdAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                ];
                http_response_code(201);
                echo json_encode($schedule, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            } else {
                throw new RuntimeException('Airflow client not available');
            }
        } catch (Throwable $airflowError) {
            error_log('[v0] Airflow integration error: ' . $airflowError->getMessage());
            error_log('[v0] Falling back to mock scheduler');
            $schedule = [
                'id' => substr(strtolower(bin2hex(random_bytes(6))), 0, 9),
                'connectionId' => $connectionId,
                'scheduleType' => $scheduleType,
                'cronExpression' => $cronExpression,
                'isActive' => true,
                'airflowError' => $airflowError->getMessage(),
                'nextRun' => (new DateTimeImmutable('+1 day', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'createdAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            ];
            http_response_code(201);
            echo json_encode($schedule, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    if ($method === 'GET') {
        error_log('[v0] Fetching schedules from Airflow');

        $clientClasses = ['\\App\\AirflowClient', 'AirflowClient'];
        $usedClient = null;
        foreach ($clientClasses as $cls) {
            if (class_exists($cls)) { $usedClient = $cls; break; }
        }

        try {
            if ($usedClient) {
                $client = new $usedClient();
                if (!method_exists($client, 'getDags')) { throw new RuntimeException('Airflow client missing getDags()'); }
                $dags = $client->getDags();
                $etlDags = array_values(array_filter($dags, fn($d) => isset($d['dag_id']) && str_starts_with((string)$d['dag_id'], 'etl_workflow_')));

                $schedules = [];
                foreach ($etlDags as $dag) {
                    $dagId = $dag['dag_id'];
                    $connectionId = str_replace('etl_workflow_', '', (string)$dagId);
                    $lastRun = null; $lastStatus = 'never_run'; $totalRuns = 0;
                    if (method_exists($client, 'getDagRuns')) {
                        try {
                            $dagRuns = $client->getDagRuns($dagId, 5);
                            if (is_array($dagRuns) && count($dagRuns) > 0) {
                                $lastRun = $dagRuns[0]['execution_date'] ?? null;
                                $lastStatus = $dagRuns[0]['state'] ?? 'unknown';
                                $totalRuns = count($dagRuns);
                            }
                        } catch (Throwable $e) {
                            error_log('[v0] Error fetching runs for DAG ' . $dagId . ': ' . $e->getMessage());
                        }
                    }

                    $schedules[] = [
                        'id' => $dagId,
                        'connectionId' => $connectionId,
                        'connectionName' => 'Connection ' . $connectionId,
                        'scheduleType' => (isset($dag['schedule_interval']) && $dag['schedule_interval'] === '0 0 * * *') ? 'daily' : ((isset($dag['schedule_interval']) && $dag['schedule_interval'] === '0 * * * *') ? 'hourly' : 'custom'),
                        'cronExpression' => $dag['schedule_interval'] ?? 'None',
                        'isActive' => !($dag['is_paused'] ?? false),
                        'airflowDagId' => $dagId,
                        'nextRun' => (new DateTimeImmutable('+1 day', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                        'lastRun' => $lastRun,
                        'lastStatus' => $lastStatus,
                        'totalRuns' => $totalRuns,
                        'tags' => $dag['tags'] ?? [],
                        'lastParsed' => $dag['last_parsed_time'] ?? null,
                    ];
                }

                http_response_code(200);
                echo json_encode($schedules, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }

            throw new RuntimeException('Airflow client not available');
        } catch (Throwable $airflowError) {
            error_log('[v0] Airflow fetch error, falling back to mock data: ' . $airflowError->getMessage());
            $schedules = [
                [
                    'id' => '1',
                    'connectionName' => 'JSONPlaceholder Users API',
                    'scheduleType' => 'daily',
                    'cronExpression' => '0 0 * * *',
                    'isActive' => true,
                    'nextRun' => (new DateTimeImmutable('+1 day', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                    'lastRun' => (new DateTimeImmutable('-1 hour', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                    'lastStatus' => 'success',
                    'totalRuns' => 45,
                    'airflowError' => $airflowError->getMessage(),
                ],
            ];
            http_response_code(200);
            echo json_encode($schedules, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed', 'allowed' => ['GET','POST']], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $e) {
    error_log('[v0] Error in scheduler: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to process scheduler', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
