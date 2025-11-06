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

require 'app/Controllers/StatusController.php';

echo "Testing StatusController...\n";
$controller = new App\Controllers\StatusController();
$response = $controller->index();

echo "Uptime: " . ($response['uptime'] ?? 'N/A') . "\n";
echo "Total Runs: " . ($response['runs']['total'] ?? 'N/A') . "\n";
echo "Last 24h Runs: " . ($response['runs']['last24h'] ?? 'N/A') . "\n";
echo "Success Rate: " . ($response['activity']['successRate'] ?? 'N/A') . "%\n";
echo "Active Connections: " . ($response['connections']['active'] ?? 'N/A') . "\n";
echo "Total Schedules: " . ($response['schedules']['total'] ?? 'N/A') . "\n";
