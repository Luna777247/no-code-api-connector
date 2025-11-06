<?php
require 'vendor/autoload.php';
require 'app/Controllers/DataController.php';

echo "=== TESTING /api/data ENDPOINT ===\n\n";

$controller = new App\Controllers\DataController();
$result = $controller->index();

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
