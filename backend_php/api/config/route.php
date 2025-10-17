<?php
// System configuration API (GET/PUT)

declare(strict_types=1);

define('ROOT_PATH', realpath(__DIR__ . '/../../..'));

$__autoload_paths = [
    realpath(__DIR__ . '/../..') . '/vendor/autoload.php',
    ROOT_PATH . '/vendor/autoload.php',
];

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

if (class_exists(Dotenv\Dotenv::class)) {
    Dotenv\Dotenv::createImmutable(ROOT_PATH)->safeLoad();
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

function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'GET') {
    try {
        error_log('[v0] Fetching system configuration');

        $url = (isset($_SERVER['REQUEST_SCHEME']) ? $_SERVER['REQUEST_SCHEME'] : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . ($_SERVER['REQUEST_URI'] ?? '/');
        $query = [];
        parse_str(parse_url($url, PHP_URL_QUERY) ?? '', $query);

        $category = $query['category'] ?? null; // system, api, database, security, environment
        $format = $query['format'] ?? 'json';
        $includeSecrets = ($query['includeSecrets'] ?? 'false') === 'true';

        // Base system configuration
        $systemConfig = [
            'version' => '1.0.0',
            'environment' => (string)env('NODE_ENV', 'development'),
            'buildTimestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'platform' => [
                'php' => PHP_VERSION,
                'platform' => PHP_OS_FAMILY,
                'architecture' => php_uname('m') ?: null,
                'timezone' => date_default_timezone_get(),
            ],
            'runtime' => [
                'scriptUptimeSec' => isset($_SERVER['REQUEST_TIME_FLOAT']) ? (int)round(microtime(true) - (float)$_SERVER['REQUEST_TIME_FLOAT']) : null,
                'memory' => [
                    'used' => function_exists('memory_get_usage') ? (int)round(memory_get_usage(true) / 1024 / 1024) : null,
                    'limit' => ini_get('memory_limit') ?: null,
                ],
            ],
        ];

        // API Configuration
        $apiConfig = [
            'endpoints' => [
                'base' => '/api',
                'version' => 'v1',
                'timeout' => 30000,
                'maxRetries' => 3,
                'rateLimit' => [
                    'windowMs' => 15 * 60 * 1000,
                    'maxRequests' => 100,
                ],
            ],
            'features' => [
                'connections' => ['enabled' => true, 'maxConnections' => 100],
                'runs' => ['enabled' => true, 'maxConcurrent' => 10, 'historyRetention' => '30d'],
                'schedules' => ['enabled' => true, 'maxSchedules' => 50],
                'mappings' => ['enabled' => true, 'maxMappingsPerConnection' => 20],
                'analytics' => ['enabled' => true, 'cacheTtl' => 300],
                'monitoring' => ['enabled' => true, 'healthCheckInterval' => 60],
            ],
            'formats' => ['json', 'xml', 'csv'],
            'authentication' => [
                'methods' => ['bearer', 'apikey', 'basic'],
                'headerSupport' => true,
                'queryParamSupport' => false,
            ],
        ];

        // Database Configuration (default)
        $databaseConfig = [
            'type' => 'MongoDB',
            'status' => 'unknown',
            'collections' => [
                'api_connections' => ['indexed' => true, 'estimated_size' => 'unknown'],
                'api_runs' => ['indexed' => true, 'estimated_size' => 'unknown'],
                'api_schedules' => ['indexed' => true, 'estimated_size' => 'unknown'],
                'api_field_mappings' => ['indexed' => true, 'estimated_size' => 'unknown'],
            ],
            'indexes' => [
                'performance_optimized' => true,
                'text_search_enabled' => false,
            ],
        ];

        // Try to get actual database info using MongoDB
        try {
            if (class_exists('\\MongoDB\\Client')) {
                $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
                $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');
                if ($mongoUri) {
                    $client = new \MongoDB\Client($mongoUri);
                    $db = $client->selectDatabase($mongoDbName);

                    // db stats
                    $dbStats = [];
                    try {
                        $cursor = $db->command(['dbStats' => 1, 'scale' => 1]);
                        $dbStats = $cursor->toArray()[0] ?? [];
                    } catch (Throwable $e) {
                        error_log('[WARN] dbStats failed: ' . $e->getMessage());
                    }

                    $collections = iterator_to_array($db->listCollections());

                    $databaseConfig = array_merge($databaseConfig, [
                        'status' => 'connected',
                        'info' => [
                            'name' => $mongoDbName,
                            'collections' => is_countable($collections) ? count($collections) : null,
                            'dataSize' => isset($dbStats['dataSize']) ? (string)round(((float)$dbStats['dataSize']) / 1024 / 1024) . 'MB' : null,
                            'storageSize' => isset($dbStats['storageSize']) ? (string)round(((float)$dbStats['storageSize']) / 1024 / 1024) . 'MB' : null,
                            'indexes' => $dbStats['indexes'] ?? null,
                            'avgObjSize' => isset($dbStats['avgObjSize']) ? (int)round((float)$dbStats['avgObjSize']) : null,
                        ],
                        'collections' => [],
                    ]);

                    foreach ($collections as $collInfo) {
                        $name = $collInfo->getName();
                        try {
                            $count = $db->selectCollection($name)->estimatedDocumentCount();
                        } catch (Throwable $e) {
                            $count = null;
                        }
                        $databaseConfig['collections'][$name] = [
                            'documents' => $count,
                            'indexed' => true,
                            'type' => method_exists($collInfo, 'getType') ? $collInfo->getType() : 'collection',
                        ];
                    }
                } else {
                    $databaseConfig['status'] = 'unconfigured';
                }
            } else {
                $databaseConfig['status'] = 'library_missing';
            }
        } catch (Throwable $dbError) {
            error_log('[v0] Could not fetch database info: ' . $dbError->getMessage());
            $databaseConfig['status'] = 'error';
            $databaseConfig['error'] = 'Connection failed';
        }

        // Security Configuration
        $securityConfig = [
            'cors' => [
                'enabled' => true,
                'origins' => env('ALLOWED_ORIGINS', '*'),
                'methods' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            ],
            'headers' => [
                'contentSecurityPolicy' => true,
                'xFrameOptions' => true,
                'crossOriginEmbedderPolicy' => false,
            ],
            'encryption' => [
                'https' => env('NODE_ENV', 'development') === 'production',
                'apiKeys' => 'encrypted',
                'secrets' => $includeSecrets ? 'visible' : 'hidden',
            ],
            'rateLimit' => [
                'enabled' => true,
                'strategy' => 'sliding_window',
            ],
        ];

        // Environment Variables (filtered)
        $envConfig = [
            'NODE_ENV' => env('NODE_ENV', null),
            'PORT' => env('PORT', '3000'),
        ];
        if ($includeSecrets) {
            $envConfig = array_merge($envConfig, [
                'DATABASE_URL' => env('DATABASE_URL') ? '***configured***' : 'not_set',
                'REDIS_URL' => env('REDIS_URL') ? '***configured***' : 'not_set',
                'API_SECRET' => env('API_SECRET') ? '***configured***' : 'not_set',
            ]);
        }

        // Build base response
        $responseConfig = [
            'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'system' => $systemConfig,
            'api' => $apiConfig,
            'database' => $databaseConfig,
            'security' => $securityConfig,
            'environment' => $envConfig,
        ];

        // Filter by category if specified
        if ($category) {
            $validCategories = ['system', 'api', 'database', 'security', 'environment'];
            if (!in_array($category, $validCategories, true)) {
                json_response([
                    'error' => 'Invalid category',
                    'validCategories' => $validCategories,
                ], 400);
            }
            $responseConfig = [
                'timestamp' => $responseConfig['timestamp'],
                'category' => $category,
                'config' => $responseConfig[$category] ?? null,
            ];
        }

        // Add metadata (format is informational; response is JSON like TS)
        $responseConfig['metadata'] = [
            'generatedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'format' => $format,
            'category' => $category ?? 'all',
            'includeSecrets' => $includeSecrets,
            'configVersion' => '1.0',
        ];

        json_response($responseConfig, 200);
    } catch (Throwable $e) {
        error_log('[v0] Error fetching configuration: ' . $e->getMessage());
        json_response([
            'error' => 'Failed to fetch configuration',
            'message' => $e->getMessage(),
            'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
        ], 500);
    }
}

if ($method === 'PUT') {
    try {
        error_log('[v0] Updating system configuration');
        $raw = file_get_contents('php://input');
        $body = json_decode($raw ?: 'null', true);
        $category = $body['category'] ?? null;
        $settings = $body['settings'] ?? null;

        if (!$category || !$settings) {
            json_response([
                'error' => 'Category and settings are required',
                'requiredFields' => ['category', 'settings'],
            ], 400);
        }

        $validCategories = ['api', 'features', 'rateLimit'];
        if (!in_array($category, $validCategories, true)) {
            json_response([
                'error' => 'Invalid configuration category',
                'validCategories' => $validCategories,
            ], 400);
        }

        // Simulate update
        $updateResult = [
            'success' => true,
            'category' => $category,
            'updatedSettings' => $settings,
            'appliedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'message' => 'Configuration update simulated (no persistence implemented)',
            'note' => 'In production, this would update the actual configuration store',
        ];

        json_response($updateResult, 200);
    } catch (Throwable $e) {
        error_log('[v0] Error updating configuration: ' . $e->getMessage());
        json_response([
            'error' => 'Failed to update configuration',
            'message' => $e->getMessage(),
        ], 500);
    }
}

// Method not allowed
json_response(['error' => 'Method not allowed'], 405);