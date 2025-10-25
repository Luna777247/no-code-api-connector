<?php
namespace App\Repositories;

use App\Config\Database;

class RunRepository
{
    private function getCollectionName(): string
    {
        return getenv('API_RUNS_COLLECTION') ?: 'api_runs';
    }

    public function findAll(int $limit = 200): array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return [];
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return [];
        $query = new \MongoDB\Driver\Query([], ['sort' => ['_id' => -1], 'limit' => $limit]);
        $cursor = $manager->executeQuery($db . '.' . $this->getCollectionName(), $query);
        $out = [];
        foreach ($cursor as $doc) $out[] = $this->normalize($doc);
        return $out;
    }

    public function findByConnectionId(string $connectionId, int $limit = 10): array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return [];
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return [];
        $filter = ['connectionId' => $connectionId];
        $query = new \MongoDB\Driver\Query($filter, ['sort' => ['_id' => -1], 'limit' => $limit]);
        $cursor = $manager->executeQuery($db.'.'.$this->getCollectionName(), $query);
        $out = [];
        foreach ($cursor as $doc) $out[] = $this->normalize($doc);
        return $out;
    }

    public function insert(array $data): string
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return uniqid('run_', true);
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return uniqid('run_', true);
        $bulk = new \MongoDB\Driver\BulkWrite();
        $id = $bulk->insert($data + ['createdAt' => date('c')]);
        $manager->executeBulkWrite($db.'.'.$this->getCollectionName(), $bulk);
        return (string)$id;
    }

    private function normalize(object|array $doc): array
    {
        $arr = json_decode(json_encode($doc, JSON_PARTIAL_OUTPUT_ON_ERROR), true) ?? [];
        if (isset($arr['_id']['$oid'])) $arr['_id'] = $arr['_id']['$oid'];
        // Map fields FE expects
        return [
            'id' => $arr['_id'] ?? ($arr['id'] ?? ''),
            'connectionId' => $arr['connectionId'] ?? '',
            'status' => $arr['status'] ?? 'completed',
            'startedAt' => $arr['startedAt'] ?? date('c'),
            'duration' => $arr['duration'] ?? null,
            'recordsExtracted' => $arr['recordsExtracted'] ?? null,
            'recordsProcessed' => $arr['recordsProcessed'] ?? null,
            'executionTime' => $arr['executionTime'] ?? null,
            'errorMessage' => $arr['errorMessage'] ?? null,
        ];
    }
}
