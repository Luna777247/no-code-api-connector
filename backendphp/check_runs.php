<?php
require 'vendor/autoload.php';

$config = new App\Config\AppConfig();
$client = new MongoDB\Client($config->getMongoUri());
$db = $client->selectDatabase('dataplatform_db');
$collection = $db->selectCollection('api_runs');

$count = $collection->countDocuments();
echo "Total runs in database: $count\n";

if ($count > 0) {
    $runs = $collection->find([], ['limit' => 5, 'sort' => ['createdAt' => -1]]);
    echo "\nRecent runs:\n";
    foreach ($runs as $run) {
        echo "- ID: " . ($run['_id'] ?? 'N/A') . "\n";
        echo "  Connection: " . ($run['connectionId'] ?? 'N/A') . "\n";
        echo "  Status: " . ($run['status'] ?? 'N/A') . "\n";
        echo "  Created: " . ($run['createdAt'] ?? 'N/A') . "\n";
        echo "\n";
    }
} else {
    echo "No runs found in database.\n";
}
?>