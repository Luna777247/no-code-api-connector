<?php
namespace App\Repositories;

use App\Config\Database;

class ScheduleRepository
{
    private const COLLECTION = 'api_schedules';

    public function findAll(): array
    {
        // If MongoDB PHP driver is missing, return empty array (frontend will show empty state)
        if (!class_exists('MongoDB\\Driver\\Manager')) {
            return [];
        }

        $manager = Database::mongoManager();
        $dbName = Database::mongoDbName();
        if (!$manager || !$dbName) {
            return [];
        }

        try {
            $query = new \MongoDB\Driver\Query([], [
                'sort' => ['_id' => -1],
                'limit' => 100,
                'maxTimeMS' => 10000 // 10 second timeout
            ]);
            $cursor = $manager->executeQuery($dbName . '.' . self::COLLECTION, $query);

            $items = [];
            foreach ($cursor as $doc) {
                $items[] = $this->normalizeDocument($doc);
            }
            return $items;
        } catch (\Throwable $e) {
            // Return safe empty result; controller will handle error if necessary
            return [];
        }
    }

    public function saveDagId(string $scheduleId, string $dagId): bool
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) {
            return false;
        }

        $manager = Database::mongoManager();
        $dbName = Database::mongoDbName();
        if (!$manager || !$dbName) {
            return false;
        }

        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->update(
                ['_id' => new \MongoDB\BSON\ObjectId($scheduleId)],
                ['$set' => ['dagId' => $dagId, 'updatedAt' => new \MongoDB\BSON\UTCDateTime()]],
                ['upsert' => false]
            );
            $manager->executeBulkWrite($dbName . '.' . self::COLLECTION, $bulk);
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function insert(array $data): ?array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) {
            return $data + ['_id' => uniqid('schedule_', true)];
        }

        $manager = Database::mongoManager();
        $dbName = Database::mongoDbName();
        if (!$manager || !$dbName) {
            return null;
        }

        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $id = $bulk->insert($data + ['createdAt' => date('c')]);
            $manager->executeBulkWrite($dbName . '.' . self::COLLECTION, $bulk);
            
            $data['_id'] = (string)$id;
            return $this->normalizeDocument($data);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function normalizeDocument(object|array $doc): array
    {
        // Convert BSON document/stdClass to array recursively and string-cast ObjectId
        $arr = json_decode(json_encode($doc, JSON_PARTIAL_OUTPUT_ON_ERROR), true) ?? [];

        if (isset($arr['_id']) && is_array($arr['_id']) && isset($arr['_id']['$oid'])) {
            $arr['_id'] = $arr['_id']['$oid'];
        }

        return $arr;
    }
}
