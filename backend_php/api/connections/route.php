<?php
// Connections list API: GET (mock list), POST (create mock)

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
    $connections = [
        [
            'id' => '1',
            'name' => 'JSONPlaceholder Users API',
            'description' => 'Sample API for testing - fetches user data',
            'baseUrl' => 'https://jsonplaceholder.typicode.com/users',
            'method' => 'GET',
            'isActive' => true,
            'lastRun' => (new DateTimeImmutable('-2 hours', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'totalRuns' => 15,
            'successRate' => 100,
        ],
    ];
    json_response($connections, 200);
}

if ($method === 'POST') {
    try {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw ?: 'null', true);
        if (!is_array($body)) {
            json_response(['error' => 'Invalid JSON body'], 400);
        }
        error_log('[v0] Creating new connection: ' . json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        $newConnection = array_merge([
            'id' => substr(str_replace('.', '', uniqid('', true)), -9),
            'createdAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'isActive' => true,
        ], $body);
        json_response($newConnection, 201);
    } catch (Throwable $e) {
        error_log('[v0] Error creating connection: ' . $e->getMessage());
        json_response(['error' => 'Failed to create connection'], 500);
    }
}

json_response(['error' => 'Method not allowed'], 405);
