<?php
// List all connections to find the correct IDs
require_once 'vendor/autoload.php';

$connectionRepo = new \App\Repositories\ConnectionRepository();
$connections = $connectionRepo->findAll();

echo 'Available connections:' . PHP_EOL;
foreach ($connections as $conn) {
    echo 'ID: ' . (string)$conn['_id'] . ' - Name: ' . ($conn['name'] ?? 'Unnamed') . PHP_EOL;
}