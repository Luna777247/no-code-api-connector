<?php
namespace App\Repositories;

use App\Config\AppConfig;
use App\Exceptions\DatabaseException;

class ParameterModeRepository extends BaseRepository
{
    protected function getCollectionName(): string
    {
        return AppConfig::getParameterModesCollection();
    }

    public function findAll(): array
    {
        try {
            return $this->findWithPagination();
        } catch (DatabaseException $e) {
            // Return empty array on database errors to maintain backward compatibility
            return [];
        }
    }

    public function findById(string $id): ?array
    {
        try {
            return parent::findById($id);
        } catch (DatabaseException $e) {
            // Return null on database errors to maintain backward compatibility
            return null;
        }
    }

    public function insert(array $data): ?array
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $insertData = $data + ['createdAt' => date('c')];
            $id = $bulk->insert($insertData);

            $this->executeBulkWrite($bulk);

            // Return the inserted data with the new ID
            $insertData['_id'] = (string)$id;
            return $this->normalize($insertData);
        } catch (DatabaseException $e) {
            // Return null on database errors to maintain backward compatibility
            return null;
        }
    }

    public function update(string $id, array $data): bool
    {
        try {
            $bulk = new \MongoDB\Driver\BulkWrite();
            $updateData = $data + ['updatedAt' => date('c')];
            $bulk->update(
                ['_id' => new \MongoDB\BSON\ObjectId($id)],
                ['$set' => $updateData]
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

    protected function normalize($document): array
    {
        $data = (array)$document;
        $data['id'] = (string)$data['_id'];
        return $data;
    }
}