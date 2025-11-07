<?php

namespace App\Repositories;

use App\Config\Database;
use App\Config\AppConfig;
use App\Exceptions\DatabaseException;
use App\Support\ErrorHandler;
use App\Cache\Cacheable;

/**
 * Base repository class with common MongoDB operations and error handling
 */
abstract class BaseRepository
{
    use Cacheable;

    public function __construct()
    {
        $this->initCache();
    }
    /**
     * Get the collection name for this repository
     */
    abstract protected function getCollectionName(): string;

    /**
     * Normalize a MongoDB document to array
     */
    abstract protected function normalize($document): array;

    /**
     * Get query timeout in milliseconds
     */
    protected function getQueryTimeout(): int
    {
        return AppConfig::getMongoQueryTimeout();
    }

    /**
     * Get limited query timeout in milliseconds
     */
    protected function getLimitedQueryTimeout(): int
    {
        return AppConfig::getMongoLimitedQueryTimeout();
    }

    /**
     * Get find timeout in milliseconds
     */
    protected function getFindTimeout(): int
    {
        return AppConfig::getMongoFindTimeout();
    }

    /**
     * Get MongoDB manager instance
     */
    protected function getManager()
    {
        if (!class_exists('MongoDB\\Driver\\Manager')) {
            throw new DatabaseException("MongoDB driver not available");
        }

        $manager = Database::mongoManager();
        if (!$manager) {
            throw new DatabaseException("MongoDB manager not initialized");
        }

        return $manager;
    }

    /**
     * Get database name
     */
    protected function getDatabaseName(): string
    {
        $db = Database::mongoDbName();
        if (!$db) {
            throw new DatabaseException("Database name not configured");
        }

        return $db;
    }

    /**
     * Execute a query with error handling
     */
    protected function executeQuery(\MongoDB\Driver\Query $query, ?string $collection = null): array
    {
        $collection = $collection ?? $this->getCollectionName();

        try {
            $manager = $this->getManager();
            $db = $this->getDatabaseName();

            $cursor = $manager->executeQuery($db . '.' . $collection, $query);
            $results = [];

            foreach ($cursor as $doc) {
                $results[] = $this->normalize($doc);
            }

            return $results;
        } catch (\MongoDB\Driver\Exception\ExecutionTimeoutException $e) {
            throw new DatabaseException(
                "Query execution timed out",
                ['collection' => $collection, 'timeout' => $this->getQueryTimeout()],
                0,
                $e
            );
        } catch (\MongoDB\Driver\Exception\Exception $e) {
            throw new DatabaseException(
                "Database query failed: " . $e->getMessage(),
                ['collection' => $collection],
                0,
                $e
            );
        } catch (\Throwable $e) {
            ErrorHandler::handle($e);
            throw new DatabaseException(
                "Unexpected error during query execution",
                ['collection' => $collection],
                0,
                $e
            );
        }
    }

    /**
     * Execute a bulk write operation with error handling
     */
    protected function executeBulkWrite(\MongoDB\Driver\BulkWrite $bulk, ?string $collection = null): \MongoDB\Driver\WriteResult
    {
        $collection = $collection ?? $this->getCollectionName();

        try {
            $manager = $this->getManager();
            $db = $this->getDatabaseName();

            return $manager->executeBulkWrite($db . '.' . $collection, $bulk);
        } catch (\MongoDB\Driver\Exception\Exception $e) {
            throw new DatabaseException(
                "Database write operation failed: " . $e->getMessage(),
                ['collection' => $collection],
                0,
                $e
            );
        } catch (\Throwable $e) {
            ErrorHandler::handle($e);
            throw new DatabaseException(
                "Unexpected error during write operation",
                ['collection' => $collection],
                0,
                $e
            );
        }
    }

    /**
     * Find documents with pagination
     */
    protected function findWithPagination(array $filter = [], array $options = []): array
    {
        $defaultOptions = [
            'sort' => ['_id' => -1],
            'limit' => min($options['limit'] ?? 100, 1000), // Cap at 1000 to prevent memory issues
            'maxTimeMS' => $this->getQueryTimeout()
        ];

        $options = array_merge($defaultOptions, $options);
        $query = new \MongoDB\Driver\Query($filter, $options);

        return $this->executeQuery($query);
    }

    /**
     * Find a single document by ID
     */
    protected function findById(string $id): ?array
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

    /**
     * Count documents matching filter
     */
    protected function countDocuments(array $filter = []): int
    {
        try {
            ini_set('error_log', 'php://stderr');
            error_log("[BaseRepository.countDocuments] Filter: " . json_encode($filter) . ", collection: " . $this->getCollectionName());
            $manager = $this->getManager();
            $db = $this->getDatabaseName();

            $command = new \MongoDB\Driver\Command([
                'count' => $this->getCollectionName(),
                'query' => $filter,
                'maxTimeMS' => $this->getLimitedQueryTimeout()
            ]);

            $cursor = $manager->executeCommand($db, $command);
            $resultArray = $cursor->toArray();
            $result = $resultArray[0] ?? null;
            $count = $result ? ($result->n ?? 0) : 0;
            error_log("[BaseRepository.countDocuments] Result array count: " . count($resultArray) . ", count: $count");
            return $count;
        } catch (\MongoDB\Driver\Exception\Exception $e) {
            error_log("[BaseRepository.countDocuments] Exception: " . $e->getMessage());
            throw new DatabaseException(
                "Count operation failed: " . $e->getMessage(),
                ['collection' => $this->getCollectionName()],
                0,
                $e
            );
        }
    }

    /**
     * Find all documents with caching
     */
    protected function findAllCached(array $filter = [], array $options = []): array
    {
        $cacheKey = 'findAll:' . md5(serialize($filter) . serialize($options));

        return $this->getCached($cacheKey, function() use ($filter, $options) {
            return $this->findWithPagination($filter, $options);
        });
    }

    /**
     * Find single document by ID with caching
     */
    protected function findByIdCached(string $id): ?array
    {
        $cacheKey = "findById:{$id}";

        return $this->getCached($cacheKey, function() use ($id) {
            return $this->findById($id);
        });
    }

    /**
     * Invalidate cache when data is modified
     */
    protected function invalidateCacheOnChange(): void
    {
        // Invalidate all cache for this entity when data changes
        $this->invalidateEntityCache();
    }
}