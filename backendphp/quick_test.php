<?php
require 'vendor/autoload.php';

spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = __DIR__ . '/app/';
    if (str_starts_with($class, $prefix)) {
        $relative = substr($class, strlen($prefix));
        $path = $baseDir . str_replace('\\', '/', $relative) . '.php';
        if (is_file($path)) {
            require_once $path;
        }
    }
});

require 'app/Controllers/DataController.php';

// Test controller
$controller = new App\Controllers\DataController();
$response = $controller->index();

// JSON encode (same as what index.php does)
$json = json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

echo "Response valid: " . ($json ? "YES" : "NO") . "\n";
echo "Response size: " . strlen($json) . " bytes\n";
echo "Can decode: " . (json_decode($json, true) ? "YES" : "NO") . "\n";
echo "Has data: " . (count($response) > 0 ? "YES" : "NO") . "\n";
