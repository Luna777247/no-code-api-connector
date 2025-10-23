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
            $query = new \MongoDB\Driver\Query([], [ 'sort' => ['_id' => -1], 'limit' => 100 ]);
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
