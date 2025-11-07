<?php
// Load environment variables
require_once __DIR__ . '/../vendor/autoload.php';
// $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
// $dotenv->load();

// Minimal autoloader for classes under app/
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/../app/';
    if (str_starts_with($class, $prefix)) {
        $relative = substr($class, strlen($prefix));
        $path = $baseDir . str_replace('\\', '/', $relative) . '.php';
        if (is_file($path)) {
            require_once $path;
        }
    }
});

use App\Support\Router;

// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Max-Age: 86400');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$router = new Router();

// Load routes
require __DIR__ . '/../routes/api.php';
file_put_contents('/tmp/debug.log', '[INDEX] Routes loaded' . "\n", FILE_APPEND);

// Dispatch
try {
    $response = $router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', $_SERVER['REQUEST_URI'] ?? '/');
    file_put_contents('/tmp/debug.log', '[INDEX] Response type: ' . gettype($response) . "\n", FILE_APPEND);
    if (is_array($response)) {
        file_put_contents('/tmp/debug.log', '[INDEX] Response keys: ' . implode(', ', array_keys($response)) . "\n", FILE_APPEND);
    }
} catch (Exception $e) {
    http_response_code(500);
    $response = [
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ];
}

// Emit JSON by default
header('Content-Type: application/json');
$json = json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
file_put_contents('/tmp/debug.log', '[INDEX] JSON length: ' . strlen($json) . "\n", FILE_APPEND);
echo $json;
exit;
