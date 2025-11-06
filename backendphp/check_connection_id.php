<?php
require_once 'vendor/autoload.php';

$repo = new \App\Repositories\ConnectionRepository();

// Check the connection ID from runs
$conn = $repo->findByConnectionId('conn_1762399833577_gyhpi3p1w');
if ($conn) {
    echo 'Found connection: ' . json_encode($conn, JSON_PRETTY_PRINT) . PHP_EOL;
} else {
    echo 'Connection not found with ID: conn_1762399833577_gyhpi3p1w' . PHP_EOL;
}

// Check if there's a connection with that URL
$connections = $repo->findAll();
foreach ($connections as $c) {
    if (isset($c['baseUrl']) && strpos($c['baseUrl'], 'hub.juheapi.com') !== false) {
        echo 'Found JUHE API connection: ID=' . $c['_id'] . ', connectionId=' . ($c['connectionId'] ?? 'none') . PHP_EOL;
        break;
    }
}