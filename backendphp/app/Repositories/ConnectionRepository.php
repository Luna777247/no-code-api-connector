<?php
namespace App\Repositories;

use App\Config\AppConfig;
use App\Exceptions\DatabaseException;

class ConnectionRepository extends BaseRepository
{
    protected function getCollectionName(): string
    {
        return AppConfig::getApiConnectionsCollection();
    }

    public function findAll(): array
    {
        try {
            return $this->findAllCached([], ['limit' => 200]);
        } catch (DatabaseException $e) {
            // Return empty array on database errors to maintain backward compatibility
            return [];
        }
    }

    public function findAllLimited(int $limit = 50): array
    {
        try {
            return $this->findAllCached([], [
                'limit' => $limit,
                'maxTimeMS' => $this->getLimitedQueryTimeout()
            ]);
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

    public function findByConnectionId(string $connectionId): ?array
    {
        try {
            $results = $this->findWithPagination(
                ['connectionId' => $connectionId],
                ['limit' => 1, 'maxTimeMS' => $this->getFindTimeout()]
            );

            return $results[0] ?? null;
        } catch (DatabaseException $e) {
            // Return null on database errors to maintain backward compatibility
            return null;
        }
    }

    public function insert(array $data): ?array
    {
        try {
            // Check for duplicate connection based on name and baseUrl
            $name = $data['name'] ?? '';
            $baseUrl = $data['apiConfig']['baseUrl'] ?? ($data['baseUrl'] ?? '');

            if ($name && $baseUrl) {
                $existing = $this->findWithPagination([
                    'name' => $name,
                    'apiConfig.baseUrl' => $baseUrl
                ], ['limit' => 1]);

                if (!empty($existing)) {
                    // Duplicate found, return null to maintain backward compatibility
                    return null;
                }
            }

            $bulk = new \MongoDB\Driver\BulkWrite();
            $insertData = $data + ['createdAt' => date('c')];
            $id = $bulk->insert($insertData);

            $this->executeBulkWrite($bulk);

            $insertData['_id'] = (string)$id;
            $result = $this->normalize($insertData);

            // Invalidate cache after successful insert
            $this->invalidateCacheOnChange();

            return $result;
        } catch (DatabaseException $e) {
            // Return null on database errors to maintain backward compatibility
            return null;
        }
    }

    public function update(string $id, array $data): bool
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $bulk->update(
                ['_id' => new \MongoDB\BSON\ObjectId($id)],
                ['$set' => $data]
            );

            $result = $this->executeBulkWrite($bulk);
            $success = $result->getModifiedCount() >= 0;

            if ($success) {
                // Invalidate cache after successful update
                $this->invalidateCacheOnChange();
            }

            return $success;
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
            $success = $result->getDeletedCount() > 0;

            if ($success) {
                // Invalidate cache after successful delete
                $this->invalidateCacheOnChange();
            }

            return $success;
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
        return $arr;
    }
}
