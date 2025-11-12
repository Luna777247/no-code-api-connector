<?php
namespace App\Services;

abstract class BaseService
{
    /**
     * Execute cascading delete for related entities
     *
     * @param array $items Array of items to delete
     * @param string $entityType Entity type name for logging
     * @return bool True if all deletes succeeded, false otherwise
     */
    protected function deleteCascade(array $items, string $entityType): bool
    {
        $success = true;

        foreach ($items as $item) {
            $id = $item['_id'] ?? $item['id'];
            if ($id && !$this->deleteEntity($id)) {
                error_log("Failed to delete {$entityType} {$id}");
                $success = false;
            }
        }

        return $success;
    }

    /**
     * Delete a single entity by ID
     * Must be implemented by concrete services
     *
     * @param string $id Entity ID to delete
     * @return bool True if delete succeeded
     */
    abstract protected function deleteEntity(string $id): bool;
}