<?php
namespace App\Repositories;

use App\Config\Database;

class ParameterModeRepository
{
    private function getCollectionName(): string
    {
        return getenv('PARAMETER_MODES_COLLECTION') ?: 'parameter_modes';
    }

    public function findAll(): array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) {
            return [];
        }
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return [];

        $query = new \MongoDB\Driver\Query([], ['sort' => ['_id' => -1]]);
        $cursor = $manager->executeQuery($db.'.'.$this->getCollectionName(), $query);
        $out = [];
        foreach ($cursor as $doc) $out[] = $this->normalize($doc);
        return $out;
    }

    public function findById(string $id): ?array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return null;
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return null;

        $filter = ['_id' => new \MongoDB\BSON\ObjectId($id)];
        $query = new \MongoDB\Driver\Query($filter, ['limit' => 1]);
        $cursor = $manager->executeQuery($db.'.'.$this->getCollectionName(), $query);
        $docs = $cursor->toArray();
        if (!$docs) return null;
        return $this->normalize($docs[0]);
    }

    public function insert(array $data): ?array
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return $data + ['_id' => uniqid('fake_', true)];
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return null;

        $bulk = new \MongoDB\Driver\BulkWrite();
        $id = $bulk->insert($data + ['createdAt' => date('c')]);
        $manager->executeBulkWrite($db.'.'.$this->getCollectionName(), $bulk);
        return $this->findById((string)$id);
    }

    public function update(string $id, array $data): bool
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return true;
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return false;

        $bulk = new \MongoDB\Driver\BulkWrite();
        $filter = ['_id' => new \MongoDB\BSON\ObjectId($id)];
        $bulk->update($filter, ['$set' => $data + ['updatedAt' => date('c')]]);
        $result = $manager->executeBulkWrite($db.'.'.$this->getCollectionName(), $bulk);
        return $result->getModifiedCount() > 0;
    }

    public function delete(string $id): bool
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) return true;
        $manager = Database::mongoManager();
        $db = Database::mongoDbName();
        if (!$manager || !$db) return false;

        $bulk = new \MongoDB\Driver\BulkWrite();
        $filter = ['_id' => new \MongoDB\BSON\ObjectId($id)];
        $bulk->delete($filter);
        $result = $manager->executeBulkWrite($db.'.'.$this->getCollectionName(), $bulk);
        return $result->getDeletedCount() > 0;
    }

    private function normalize($doc): array
    {
        $data = (array)$doc;
        $data['id'] = (string)$data['_id'];
        return $data;
    }
}