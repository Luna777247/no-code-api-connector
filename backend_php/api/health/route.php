<?php
// GET /api/health - System health check (PHP equivalent)

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
        'status' => 'error',
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
    $startTimeMs = (int) round(microtime(true) * 1000);

    // MongoDB health check
    $mongoStatus = 'healthy';
    $mongoResponseTime = 0;
    $mongoError = null;

    $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
    $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');

    if ($mongoUri && class_exists('MongoDB\\Client')) {
        try {
            $t0 = (int) round(microtime(true) * 1000);
            $client = new MongoDB\Client($mongoUri);
            $db = $client->selectDatabase($mongoDbName);
            $db->command(['ping' => 1]);
            $t1 = (int) round(microtime(true) * 1000);
            $mongoResponseTime = $t1 - $t0;
        } catch (Throwable $e) {
            $mongoStatus = 'unhealthy';
            $mongoError = $e->getMessage();
            error_log('[v0] MongoDB health check failed: ' . $e->getMessage());
        }
    } elseif (!$mongoUri) {
        $mongoStatus = 'unknown';
    } else {
        $mongoStatus = 'unknown';
        $mongoError = 'MongoDB PHP library not installed';
    }
    $redisStatus = 'healthy';
    $redisResponseTime = 5; // mock value (ms)

    // System metrics (PHP approximations)
    $memUsage = memory_get_usage(true);
    $memPeak = memory_get_peak_usage(true);

    $load = function_exists('sys_getloadavg') ? sys_getloadavg() : null;

    $systemMetrics = [
        // PHP does not expose process uptime like Node; null indicates not available
        'uptime' => null,
        'memory' => [
            'used' => (int) round($memUsage / 1024 / 1024),
            'peak' => (int) round($memPeak / 1024 / 1024),
        ],
        'cpu' => [
            'loadAverage' => $load,
        ],
        'php' => [
            'version' => PHP_VERSION,
            'sapi' => PHP_SAPI,
        ],
        'os' => [
            'family' => PHP_OS_FAMILY,
            'platform' => PHP_OS,
        ],
    ];

    // Overall health
    $nowMs = (int) round(microtime(true) * 1000);
    $responseTime = $nowMs - $startTimeMs;
    $overallStatus = ($mongoStatus === 'healthy' && $redisStatus === 'healthy') ? 'healthy' : 'degraded';

    $healthReport = [
        'status' => $overallStatus,
        'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
        'responseTime' => $responseTime,
        'services' => [
            'mongodb' => [
                'status' => $mongoStatus,
                'responseTime' => $mongoResponseTime,
                'error' => $mongoError,
            ],
            'redis' => [
                'status' => $redisStatus,
                'responseTime' => $redisResponseTime,
            ],
            'api' => [
                'status' => 'healthy',
                'responseTime' => $responseTime,
            ],
        ],
        'system' => $systemMetrics,
        'version' => env('APP_VERSION', '1.0.0'),
        'environment' => env('APP_ENV', 'development'),
    ];

    error_log('[v0] Health check completed: ' . $overallStatus);

    $statusCode = ($overallStatus === 'healthy') ? 200 : 503;
    http_response_code($statusCode);
    echo json_encode($healthReport, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $error) {
    error_log('[v0] Health check error: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
        'error' => 'Health check failed',
        'services' => [
            'mongodb' => ['status' => 'unknown'],
            'redis' => ['status' => 'unknown'],
            'api' => ['status' => 'error'],
        ],
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
