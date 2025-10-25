<?php
namespace App\Repositories;

use App\Config\AppConfig;
use App\Exceptions\DatabaseException;

class ScheduleRepository extends BaseRepository
{
    protected function getCollectionName(): string
    {
        return AppConfig::getApiSchedulesCollection();
    }

    public function findAll(): array
    {
        try {
            return $this->findWithPagination([], [
                'limit' => 100,
                'maxTimeMS' => $this->getLimitedQueryTimeout()
            ]);
        } catch (DatabaseException $e) {
            // Return empty array on database errors to maintain backward compatibility
            return [];
        }
    }

    public function saveDagId(string $scheduleId, string $dagId): bool
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->update(
                ['_id' => new \MongoDB\BSON\ObjectId($scheduleId)],
                ['$set' => [
                    'dagId' => $dagId,
                    'updatedAt' => new \MongoDB\BSON\UTCDateTime()
                ]],
                ['upsert' => false]
            );

            $result = $this->executeBulkWrite($bulk);
            return $result->getModifiedCount() > 0;
        } catch (DatabaseException $e) {
            // Return false on database errors to maintain backward compatibility
            return false;
        }
    }

    public function insert(array $data): ?array
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $insertData = $data + ['createdAt' => date('c')];
            $id = $bulk->insert($insertData);

            $this->executeBulkWrite($bulk);

            $insertData['_id'] = (string)$id;
            return $this->normalizeDocument($insertData);
        } catch (DatabaseException $e) {
            // Return null on database errors to maintain backward compatibility
            return null;
        }
    }

    public function update(string $id, array $data): bool
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $updateData = $data + ['updatedAt' => new \MongoDB\BSON\UTCDateTime()];
            $bulk->update(
                ['_id' => new \MongoDB\BSON\ObjectId($id)],
                ['$set' => $updateData],
                ['upsert' => false]
            );

            $result = $this->executeBulkWrite($bulk);
            return $result->getModifiedCount() > 0;
        } catch (DatabaseException $e) {
            // Return false on database errors to maintain backward compatibility
            return false;
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

    protected function normalizeDocument($document): array
    {
        // Convert BSON document/stdClass to array recursively and string-cast ObjectId
        $arr = json_decode(json_encode($document, JSON_PARTIAL_OUTPUT_ON_ERROR), true) ?? [];

        if (isset($arr['_id']) && is_array($arr['_id']) && isset($arr['_id']['$oid'])) {
            $arr['_id'] = $arr['_id']['$oid'];
        }

        return $arr;
    }

    protected function normalize($document): array
    {
        return $this->normalizeDocument($document);
    }
}
