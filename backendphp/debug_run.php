<?php
require 'vendor/autoload.php';

use App\Config\Database;
use App\Config\AppConfig;

// Get database connection
$manager = Database::mongoManager();
$dbName = Database::mongoDbName();

if (!$manager || !$dbName) {
    echo "Database connection not configured\n";
    exit(1);
}

try {
    $client = new MongoDB\Client(Database::mongoManager()->getServers()[0]->getHost() . ':' . Database::mongoManager()->getServers()[0]->getPort());
    $db = $client->$dbName;

    // Find the specific run
    $run = $db->api_runs->findOne(['_id' => new MongoDB\BSON\ObjectId('690d01398d905db4090e57ec')]);

    if ($run) {
        echo "Run Details:\n";
        echo "ID: " . $run['_id'] . "\n";
        echo "Status: " . ($run['status'] ?? 'unknown') . "\n";
        echo "Connection ID: " . ($run['connectionId'] ?? 'none') . "\n";
        echo "Schedule ID: " . ($run['scheduleId'] ?? 'none') . "\n";
        echo "Executed At: " . ($run['executedAt'] ?? 'none') . "\n";
        echo "Triggered By: " . ($run['triggeredBy'] ?? 'unknown') . "\n";
        echo "Error: " . ($run['error'] ?? 'none') . "\n";
        echo "Response: " . json_encode($run['response'] ?? null) . "\n";
        echo "API Response: " . ($run['apiResponse'] ?? 'none') . "\n";
    } else {
        echo "Run not found\n";
    }

    // Also check if there's a connection with that ID
    if (isset($run['connectionId'])) {
        $connection = $db->api_connections->findOne(['_id' => new MongoDB\BSON\ObjectId($run['connectionId'])]);
        if ($connection) {
            echo "\nConnection Details:\n";
            echo "Name: " . ($connection['name'] ?? 'unknown') . "\n";
            echo "Base URL: " . ($connection['baseUrl'] ?? 'none') . "\n";
            echo "Method: " . ($connection['method'] ?? 'GET') . "\n";
            echo "Headers: " . json_encode($connection['headers'] ?? []) . "\n";
            echo "Parameters: " . json_encode($connection['parameters'] ?? []) . "\n";
        } else {
            echo "\nConnection not found for ID: " . $run['connectionId'] . "\n";
        }
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>