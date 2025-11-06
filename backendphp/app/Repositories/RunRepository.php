<?php
namespace App\Repositories;

use App\Config\AppConfig;
use App\Exceptions\DatabaseException;

class RunRepository extends BaseRepository
{
    protected function getCollectionName(): string
    {
        return AppConfig::getApiRunsCollection();
    }

    public function findAll(int $limit = 50): array
    {
        try {
            return $this->findWithPagination([], ['limit' => $limit]);
        } catch (DatabaseException $e) {
            // Return empty array on database errors to maintain backward compatibility
            return [];
        }
    }

    public function findByConnectionId(string $connectionId, int $limit = 10): array
    {
        try {
            return $this->findWithPagination(
                ['connectionId' => $connectionId],
                ['limit' => $limit]
            );
        } catch (DatabaseException $e) {
            // Return empty array on database errors to maintain backward compatibility
            return [];
        }
    }

    public function findByScheduleId(string $scheduleId, int $limit = 50, int $offset = 0): array
    {
        try {
            return $this->findWithPagination(
                ['scheduleId' => $scheduleId],
                ['limit' => $limit, 'skip' => $offset, 'sort' => ['createdAt' => -1]]
            );
        } catch (DatabaseException $e) {
            // Return empty array on database errors to maintain backward compatibility
            return [];
        }
    }

    public function findById(string $id): ?array
    {
        try {
            $objectId = new \MongoDB\BSON\ObjectId($id);
        } catch (\MongoDB\Driver\Exception\InvalidArgumentException $e) {
            throw new DatabaseException(
                "Invalid document ID format",
                ['id' => $id],
                0,
                $e
            );
        }

        $results = $this->findWithPagination(['_id' => $objectId], ['limit' => 1]);

        return $results[0] ?? null;
    }

    public function insert(array $data): string
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $insertData = $data + ['createdAt' => date('c')];
            $id = $bulk->insert($insertData);

            $this->executeBulkWrite($bulk);

            return (string)$id;
        } catch (DatabaseException $e) {
            // Return fake ID on database errors to maintain backward compatibility
            return uniqid('run_', true);
        }
    }

    public function delete(string $id): bool
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->delete(
                ['_id' => new \MongoDB\BSON\ObjectId($id)],
                ['limit' => 1]
            );

            $result = $this->executeBulkWrite($bulk);
            return $result->getDeletedCount() > 0;
        } catch (DatabaseException $e) {
            // Return false on database errors to maintain backward compatibility
            return false;
        }
    }

    public function update(string $id, array $data): bool
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->update(
                ['_id' => new \MongoDB\BSON\ObjectId($id)],
                ['$set' => $data + ['updatedAt' => date('c')]],
                ['upsert' => false]
            );

            $result = $this->executeBulkWrite($bulk);
            return $result->getModifiedCount() > 0;
        } catch (DatabaseException $e) {
            // Return false on database errors to maintain backward compatibility
            return false;
        }
    }

    protected function normalize($document): array
    {
        $arr = json_decode(json_encode($document, JSON_PARTIAL_OUTPUT_ON_ERROR), true) ?? [];
        if (isset($arr['_id']['$oid'])) {
            $arr['_id'] = $arr['_id']['$oid'];
        }
        // Map fields FE expects and include all original fields
        return [
            'id' => $arr['_id'] ?? ($arr['id'] ?? ''),
            'connectionId' => $arr['connectionId'] ?? '',
            'status' => $arr['status'] ?? 'completed',
            'startedAt' => $arr['startedAt'] ?? null,
            'createdAt' => $arr['createdAt'] ?? null,
            'duration' => $arr['duration'] ?? null,
            'recordsExtracted' => $arr['recordsExtracted'] ?? null,
            'recordsProcessed' => $arr['recordsProcessed'] ?? null,
            'recordsLoaded' => $arr['recordsLoaded'] ?? null,
            'executionTime' => $arr['executionTime'] ?? null,
            'errorMessage' => $arr['errorMessage'] ?? null,
            'response' => $arr['response'] ?? null,
            'extractedData' => $arr['extractedData'] ?? null,
            'dataTransformation' => $arr['dataTransformation'] ?? null,
            'scheduleId' => $arr['scheduleId'] ?? null,
            'retryOf' => $arr['retryOf'] ?? null,
        ];
    }
}
