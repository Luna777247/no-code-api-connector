<?php
namespace App\Repositories;

use App\Config\Database;

class ConnectionRepository
{
    private const COLLECTION = 'api_connections';

    public function findAll(): array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) {
            return [];
        }
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return [];

        try {
            $query = new \MongoDB\Driver\Query([], [
                'sort' => ['_id' => -1],
                'limit' => 200,
                'maxTimeMS' => 15000 // 15 second timeout
            ]);
            $cursor = $manager->executeQuery($db.'.'.self::COLLECTION, $query);
            $out = [];
            foreach ($cursor as $doc) $out[] = $this->normalize($doc);
            return $out;
        } catch (\MongoDB\Driver\Exception\ExecutionTimeoutException $e) {
            // Return empty array on timeout
            return [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    public function findAllLimited(int $limit = 50): array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) {
            return [];
        }
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return [];

        try {
            // Set a reasonable timeout for the query
            $query = new \MongoDB\Driver\Query([], [
                'sort' => ['_id' => -1],
                'limit' => $limit,
                'maxTimeMS' => 10000 // 10 second timeout
            ]);
            $cursor = $manager->executeQuery($db.'.'.self::COLLECTION, $query);
            $out = [];
            foreach ($cursor as $doc) $out[] = $this->normalize($doc);
            return $out;
        } catch (\MongoDB\Driver\Exception\ExecutionTimeoutException $e) {
            // Return empty array on timeout
            return [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    public function findById(string $id): ?array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return null;
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return null;

        $filter = ['_id' => new \MongoDB\BSON\ObjectId($id)];
        $query = new \MongoDB\Driver\Query($filter, ['limit' => 1]);
        $cursor = $manager->executeQuery($db.'.'.self::COLLECTION, $query);
        $docs = $cursor->toArray();
        if (!$docs) return null;
        return $this->normalize($docs[0]);
    }

    public function findByConnectionId(string $connectionId): ?array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return null;
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return null;

        try {
            $filter = ['connectionId' => $connectionId];
            $query = new \MongoDB\Driver\Query($filter, [
                'limit' => 1,
                'maxTimeMS' => 5000 // 5 second timeout
            ]);
            $cursor = $manager->executeQuery($db.'.'.self::COLLECTION, $query);
            $docs = $cursor->toArray();
            if (!$docs) return null;
            return $this->normalize($docs[0]);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function insert(array $data): ?array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return $data + ['_id' => uniqid('fake_', true)];
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return null;

        $bulk = new \MongoDB\Driver\BulkWrite();
        $id = $bulk->insert($data + ['createdAt' => date('c')]);
        $manager->executeBulkWrite($db.'.'.self::COLLECTION, $bulk);
        $data['_id'] = (string)$id;
        return $this->normalize($data);
    }

    public function update(string $id, array $data): bool
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return true;
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return false;

        $bulk = new \MongoDB\Driver\BulkWrite();
        $bulk->update(['_id' => new \MongoDB\BSON\ObjectId($id)], ['$set' => $data]);
        $result = $manager->executeBulkWrite($db.'.'.self::COLLECTION, $bulk);
        return $result->getModifiedCount() >= 0;
    }

    public function delete(string $id): bool
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return true;
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return false;

        $bulk = new \MongoDB\Driver\BulkWrite();
        $bulk->delete(['_id' => new \MongoDB\BSON\ObjectId($id)], ['limit' => 1]);
        $result = $manager->executeBulkWrite($db.'.'.self::COLLECTION, $bulk);
        return $result->getDeletedCount() > 0;
    }

    private function normalize(object|array $doc): array
    {
        $arr = json_decode(json_encode($doc, JSON_PARTIAL_OUTPUT_ON_ERROR), true) ?? [];
        if (isset($arr['_id']['$oid'])) $arr['_id'] = $arr['_id']['$oid'];
        return $arr;
    }
}
