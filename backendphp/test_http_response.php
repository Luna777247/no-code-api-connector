<?php
// Test the actual HTTP response that would be sent
require 'vendor/autoload.php';

// Set up autoloader
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

echo "=== SIMULATING HTTP RESPONSE ===\n\n";

// Simulate what the controller returns
$controller = new App\Controllers\DataController();
$response = $controller->index();

// This is what gets JSON encoded and sent
echo "PHP Array Response:\n";
echo "- Keys: " . implode(", ", array_keys($response)) . "\n";
echo "- Summary keys: " . implode(", ", array_keys($response['summary'])) . "\n";
echo "- Connection Breakdown count: " . count($response['connectionBreakdown']) . "\n\n";

// This is what gets sent to the client
$jsonResponse = json_encode($response, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
echo "JSON Response (first 500 chars):\n";
echo substr($jsonResponse, 0, 500) . "...\n\n";

// Verify it can be decoded
$decoded = json_decode($jsonResponse, true);
echo "Decoded successfully: " . ($decoded ? "YES" : "NO") . "\n";
echo "Decoded structure:\n";
echo "- Is array: " . (is_array($decoded) ? "YES" : "NO") . "\n";
echo "- Has summary: " . (isset($decoded['summary']) ? "YES" : "NO") . "\n";
echo "- Has connectionBreakdown: " . (isset($decoded['connectionBreakdown']) ? "YES" : "NO") . "\n";
