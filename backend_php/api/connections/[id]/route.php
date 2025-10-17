<?php
// Connections API: GET/PUT/DELETE by connectionId (provide via query param `id`)

declare(strict_types=1);

define('ROOT_PATH', realpath(__DIR__ . '/../../../..'));

$__autoload_paths = [
    realpath(__DIR__ . '/../../..') . '/vendor/autoload.php',
    ROOT_PATH . '/vendor/autoload.php',
];
$__autoload_loaded = false;
foreach ($__autoload_paths as $__p) {
    if (is_string($__p) && file_exists($__p)) {
        require_once $__p;
        $__autoload_loaded = true;
        break;
    }
}
if (!$__autoload_loaded) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Composer autoload not found',
        'details' => 'Expected at backend_php/vendor/autoload.php or vendor/autoload.php at project root',
        'pathsTried' => $__autoload_paths,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if (class_exists(Dotenv\Dotenv::class)) {
    Dotenv\Dotenv::createImmutable(ROOT_PATH)->safeLoad();
}

if (!function_exists('env')) {
    function env(string $key, $default = null): mixed
    {
        return $_ENV[$key]
            ?? $_SERVER[$key]
            ?? getenv($key)
            ?: $default;
    }
}

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function json_response(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function get_mongo_collection(): ?\MongoDB\Collection {
    if (!class_exists('\\MongoDB\\Client')) {
        return null;
    }
    $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
    $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');
    if (!$mongoUri) {
        return null;
    }
    $client = new \MongoDB\Client($mongoUri);
    return $client->selectCollection($mongoDbName, 'api_connections');
}

// Read id from query: /api/connections/[id]/route.php?id=YOUR_ID
parse_str(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_QUERY) ?? '', $query);
$connectionId = $query['id'] ?? null;

if ($method === 'GET') {
    try {
        if (!$connectionId) {
            json_response(['error' => 'Missing id'], 400);
        }

        $coll = get_mongo_collection();
        if (!$coll) {
            // Mock when DB unavailable
            $mock = [
                'id' => $connectionId,
                'name' => 'Connection ' . $connectionId,
                'description' => 'Sample connection for testing',
                'baseUrl' => 'https://api.example.com/data',
                'method' => 'GET',
                'headers' => ['Content-Type' => 'application/json'],
                'authType' => 'none',
                'isActive' => true,
                'createdAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'lastRun' => (new DateTimeImmutable('-1 hour', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'totalRuns' => 10,
                'successRate' => 95.5,
                'avgResponseTime' => 250,
            ];
            json_response($mock, 200);
        }

        $connection = $coll->findOne(['connectionId' => $connectionId]);
        if (!$connection) {
            $mock = [
                'id' => $connectionId,
                'name' => 'Connection ' . $connectionId,
                'description' => 'Sample connection for testing',
                'baseUrl' => 'https://api.example.com/data',
                'method' => 'GET',
                'headers' => ['Content-Type' => 'application/json'],
                'authType' => 'none',
                'isActive' => true,
                'createdAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'lastRun' => (new DateTimeImmutable('-1 hour', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                'totalRuns' => 10,
                'successRate' => 95.5,
                'avgResponseTime' => 250,
            ];
            json_response($mock, 200);
        }
        // Convert BSONDocument to array
        if ($connection instanceof \MongoDB\Model\BSONDocument) {
            $connection = $connection->getArrayCopy();
        }
        json_response($connection, 200);
    } catch (\Throwable $e) {
        error_log('[v0] Error fetching connection: ' . $e->getMessage());
        json_response(['error' => 'Failed to fetch connection', 'details' => $e->getMessage()], 500);
    }
}

if ($method === 'PUT') {
    try {
        if (!$connectionId) {
            json_response(['error' => 'Missing id'], 400);
        }
        $raw = file_get_contents('php://input');
        $updateData = json_decode($raw ?: 'null', true);
        if (!is_array($updateData)) {
            json_response(['error' => 'Invalid JSON body'], 400);
        }

        $coll = get_mongo_collection();
        if (!$coll) {
            json_response(['error' => 'Database not available'], 503);
        }

        $result = $coll->updateOne(
            ['connectionId' => $connectionId],
            ['$set' => array_merge($updateData, ['updatedAt' => new \MongoDB\BSON\UTCDateTime()])]
        );

        if ($result->getMatchedCount() === 0) {
            $newConnection = array_merge(
                ['connectionId' => $connectionId],
                $updateData,
                [
                    'createdAt' => new \MongoDB\BSON\UTCDateTime(),
                    'updatedAt' => new \MongoDB\BSON\UTCDateTime(),
                ]
            );
            $coll->insertOne($newConnection);
            json_response($newConnection, 201);
        }

        $updated = $coll->findOne(['connectionId' => $connectionId]);
        if ($updated instanceof \MongoDB\Model\BSONDocument) {
            $updated = $updated->getArrayCopy();
        }
        json_response($updated ?? ['connectionId' => $connectionId], 200);
    } catch (\Throwable $e) {
        error_log('[v0] Error updating connection: ' . $e->getMessage());
        json_response(['error' => 'Failed to update connection', 'details' => $e->getMessage()], 500);
    }
}

if ($method === 'DELETE') {
    try {
        if (!$connectionId) {
            json_response(['error' => 'Missing id'], 400);
        }
        if (!class_exists('\\MongoDB\\Client')) {
            json_response(['error' => 'Database not available'], 503);
        }
        $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
        $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');
        if (!$mongoUri) {
            json_response(['error' => 'Database not configured'], 503);
        }
        $client = new \MongoDB\Client($mongoUri);
        $db = $client->selectDatabase($mongoDbName);

        $connColl = $db->selectCollection('api_connections');
        $runsColl = $db->selectCollection('api_runs');

        $connection = $connColl->findOne(['connectionId' => $connectionId]);
        if (!$connection) {
            json_response(['error' => 'Connection not found'], 404);
        }

        $relatedRuns = $runsColl->countDocuments(['connectionId' => $connectionId]);

        $deleteResult = $connColl->deleteOne(['connectionId' => $connectionId]);
        if ($deleteResult->getDeletedCount() === 0) {
            json_response(['error' => 'Connection not found'], 404);
        }

        json_response([
            'message' => 'Connection deleted successfully',
            'connectionId' => $connectionId,
            'relatedRuns' => $relatedRuns,
            'warning' => $relatedRuns > 0 ? ($relatedRuns . ' related runs still exist') : null,
        ], 200);
    } catch (\Throwable $e) {
        error_log('[v0] Error deleting connection: ' . $e->getMessage());
        json_response(['error' => 'Failed to delete connection', 'details' => $e->getMessage()], 500);
    }
}

json_response(['error' => 'Method not allowed'], 405);
