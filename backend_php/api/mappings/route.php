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

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
    $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');

    if (!$mongoUri || trim((string)$mongoUri) === '') {
        error_log('[mappings] Missing MongoDB connection string');
    }

    $client = null;
    $collection = null;
    if ($mongoUri && class_exists('MongoDB\\Client')) {
        $client = new MongoDB\Client($mongoUri);
        $collection = $client->selectCollection($mongoDbName, 'api_field_mappings');
    }

    if (strtoupper($method) === 'GET') {
        $connectionId = isset($_GET['connectionId']) ? (string)$_GET['connectionId'] : null;
        $page = (int)($_GET['page'] ?? '1');
        if ($page <= 0) { $page = 1; }
        $limit = (int)($_GET['limit'] ?? '20');
        if ($limit <= 0) { $limit = 20; }

        error_log("[v0] Fetching field mappings: connectionId=" . ($connectionId ?? 'null') . " page={$page} limit={$limit}");

        $filters = [];
        if ($connectionId && trim($connectionId) !== '') {
            $filters['connectionId'] = $connectionId;
        }

        $mappings = [];
        $total = 0;

        if ($collection) {
            $cursor = $collection->find(
                $filters,
                [
                    'sort' => ['createdAt' => -1],
                    'skip' => ($page - 1) * $limit,
                    'limit' => $limit,
                ]
            );
            $docs = iterator_to_array($cursor);
            foreach ($docs as $doc) {
                // Convert BSON types to JSON-friendly
                if (isset($doc['_id']) && $doc['_id'] instanceof MongoDB\BSON\ObjectId) {
                    $doc['_id'] = (string)$doc['_id'];
                }
                foreach (['createdAt','updatedAt','lastUsed'] as $dtField) {
                    if (isset($doc[$dtField]) && $doc[$dtField] instanceof MongoDB\BSON\UTCDateTime) {
                        $doc[$dtField] = $doc[$dtField]->toDateTime()->setTimezone(new DateTimeZone('UTC'))->format(DATE_ISO8601);
                    }
                }
                $mappings[] = $doc;
            }
            $total = $collection->countDocuments($filters);
        }

        if (!$collection || count($mappings) === 0) {
            $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
            $mockMappings = [
                [
                    'id' => 'mapping_001',
                    'connectionId' => 'conn_123',
                    'connectionName' => 'Places API',
                    'name' => 'User Data Mapping',
                    'description' => 'Map user data from API response to database schema',
                    'mappings' => [
                        [
                            'sourcePath' => '$.data[*].id',
                            'targetField' => 'user_id',
                            'dataType' => 'string',
                            'required' => true,
                            'defaultValue' => null,
                            'transformation' => null,
                        ],
                        [
                            'sourcePath' => '$.data[*].name',
                            'targetField' => 'full_name',
                            'dataType' => 'string',
                            'required' => true,
                            'defaultValue' => 'Unknown',
                            'transformation' => 'trim|title_case',
                        ],
                        [
                            'sourcePath' => '$.data[*].email',
                            'targetField' => 'email_address',
                            'dataType' => 'email',
                            'required' => false,
                            'defaultValue' => null,
                            'transformation' => 'lowercase|validate_email',
                        ],
                        [
                            'sourcePath' => '$.data[*].created_at',
                            'targetField' => 'registration_date',
                            'dataType' => 'datetime',
                            'required' => true,
                            'defaultValue' => 'NOW()',
                            'transformation' => 'parse_iso_date',
                        ],
                    ],
                    'isActive' => true,
                    'createdAt' => $now->sub(new DateInterval('P1D'))->format(DATE_ISO8601),
                    'updatedAt' => $now->format(DATE_ISO8601),
                    'lastUsed' => $now->sub(new DateInterval('PT1H'))->format(DATE_ISO8601),
                    'usageCount' => 25,
                ],
                [
                    'id' => 'mapping_002',
                    'connectionId' => 'conn_456',
                    'connectionName' => 'Weather API',
                    'name' => 'Weather Data Mapping',
                    'description' => 'Transform weather API data to analytics format',
                    'mappings' => [
                        [
                            'sourcePath' => '$.weather.temp',
                            'targetField' => 'temperature_celsius',
                            'dataType' => 'decimal',
                            'required' => true,
                            'defaultValue' => 0,
                            'transformation' => 'round_2_decimal',
                        ],
                        [
                            'sourcePath' => '$.weather.humidity',
                            'targetField' => 'humidity_percent',
                            'dataType' => 'integer',
                            'required' => false,
                            'defaultValue' => null,
                            'transformation' => 'clamp_0_100',
                        ],
                    ],
                    'isActive' => true,
                    'createdAt' => $now->sub(new DateInterval('P2D'))->format(DATE_ISO8601),
                    'updatedAt' => $now->sub(new DateInterval('PT2H'))->format(DATE_ISO8601),
                    'lastUsed' => $now->sub(new DateInterval('PT30M'))->format(DATE_ISO8601),
                    'usageCount' => 45,
                ],
            ];

            if ($connectionId) {
                $mockMappings = array_values(array_filter($mockMappings, function ($m) use ($connectionId) {
                    return ($m['connectionId'] ?? null) === $connectionId;
                }));
            }

            $total = count($mockMappings);
            $offset = ($page - 1) * $limit;
            $mappings = array_slice($mockMappings, $offset, $limit);
        }

        $resp = [
            'mappings' => $mappings,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int)ceil(($limit > 0 ? $total / $limit : 0)),
            ],
            'filters' => [ 'connectionId' => $connectionId ],
        ];

        http_response_code(200);
        echo json_encode($resp, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    if (strtoupper($method) === 'POST') {
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

        error_log('[v0] Creating field mapping: ' . ($rawTrim !== '' ? $rawTrim : json_encode($body)));

        if (!is_array($body)) { $body = []; }
        if (!isset($body['name']) || !isset($body['connectionId']) || !isset($body['mappings'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required fields: name, connectionId, mappings'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }

        if (!is_array($body['mappings'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid mapping structure. Each mapping requires: sourcePath, targetField, dataType'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }

        foreach ($body['mappings'] as $m) {
            if (!is_array($m) || !isset($m['sourcePath']) || !isset($m['targetField']) || !isset($m['dataType'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid mapping structure. Each mapping requires: sourcePath, targetField, dataType'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        $mappingId = substr(strtolower(bin2hex(random_bytes(6))), 0, 9);
        $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));

        $newMapping = array_merge([
            'mappingId' => $mappingId,
            'isActive' => true,
            'createdAt' => new MongoDB\BSON\UTCDateTime($now->getTimestamp() * 1000),
            'updatedAt' => new MongoDB\BSON\UTCDateTime($now->getTimestamp() * 1000),
            'lastUsed' => null,
            'usageCount' => 0,
        ], $body);

        if ($collection) {
            $collection->insertOne($newMapping);
        }

        // Normalize dates to ISO for response
        $respMapping = $newMapping;
        foreach (['createdAt','updatedAt','lastUsed'] as $dtField) {
            if ($respMapping[$dtField] instanceof MongoDB\BSON\UTCDateTime) {
                $respMapping[$dtField] = $respMapping[$dtField]->toDateTime()->setTimezone(new DateTimeZone('UTC'))->format(DATE_ISO8601);
            } elseif ($respMapping[$dtField] === null) {
                // leave as null
            }
        }

        http_response_code(201);
        echo json_encode($respMapping, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed', 'allowed' => ['GET','POST']], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (MongoDB\Driver\Exception\Exception $e) {
    error_log('[v0] Error fetching/creating field mappings: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to process field mappings', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (Throwable $e) {
    error_log('[v0] Error fetching/creating field mappings: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to process field mappings', 'details' => $e->getMessage()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
