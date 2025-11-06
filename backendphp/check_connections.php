<?php
require_once 'vendor/autoload.php';

$repo = new \App\Repositories\ConnectionRepository();
$connections = $repo->findAll();

echo "Connections in database:\n";
foreach ($connections as $conn) {
    echo 'ID: ' . $conn['_id'] . ', Name: ' . ($conn['name'] ?? 'No name') . ', URL: ' . ($conn['baseUrl'] ?? 'No URL') . "\n";
}

// Also check runs
$runRepo = new \App\Repositories\RunRepository();
$runs = $runRepo->findAll(10);

echo "\nRuns in database:\n";
foreach ($runs as $run) {
    echo 'ID: ' . $run['id'] . ', ConnectionID: ' . ($run['connectionId'] ?? 'No conn') . ', Status: ' . ($run['status'] ?? 'No status') . "\n";
}