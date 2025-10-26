<?php
namespace App\Repositories;

use App\Config\AppConfig;
use App\Exceptions\DatabaseException;

class DataRepository extends BaseRepository
{
    protected function getCollectionName(): string
    {
        // This repository works across multiple collections
        return '';
    }

    public function searchAcrossCollections(string $query, array $filters = [], array $options = []): array
    {
        $collections = [
            AppConfig::getApiConnectionsCollection(),
            AppConfig::getApiRunsCollection(),
            AppConfig::getApiSchedulesCollection(),
            AppConfig::getParameterModesCollection()
        ];

        $allResults = [];
        $totalCount = 0;

        foreach ($collections as $collectionName) {
            try {
                $results = $this->searchInCollection($collectionName, $query, $filters, $options);
                $allResults = array_merge($allResults, $results['data']);
                $totalCount += $results['total'];
            } catch (DatabaseException $e) {
                // Continue with other collections if one fails
                continue;
            }
        }

        return [
            'data' => $allResults,
            'total' => $totalCount
        ];
    }

    public function searchInCollection(string $collectionName, string $query, array $filters = [], array $options = []): array
    {
        $limit = $options['limit'] ?? 50;
        $offset = $options['offset'] ?? 0;
        $sort = $options['sort'] ?? ['createdAt' => -1];

        // Build MongoDB query
        $mongoQuery = [];

        // Text search across multiple fields
        if (!empty($query)) {
            $searchFields = ['name', 'description', 'status', 'connectionId', 'scheduleId', 'runId'];
            $textConditions = [];

            foreach ($searchFields as $field) {
                $textConditions[] = [$field => ['$regex' => $query, '$options' => 'i']];
            }

            $mongoQuery['$or'] = $textConditions;
        }

        // Apply filters
        if (!empty($filters)) {
            foreach ($filters as $filter) {
                $field = $filter['field'] ?? '';
                $operator = $filter['operator'] ?? 'equals';
                $value = $filter['value'] ?? '';

                if (empty($field)) continue;

                switch ($operator) {
                    case 'equals':
                        $mongoQuery[$field] = $value;
                        break;
                    case 'contains':
                        $mongoQuery[$field] = ['$regex' => $value, '$options' => 'i'];
                        break;
                    case 'starts_with':
                        $mongoQuery[$field] = ['$regex' => '^' . preg_quote($value), '$options' => 'i'];
                        break;
                    case 'ends_with':
                        $mongoQuery[$field] = ['$regex' => preg_quote($value) . '$', '$options' => 'i'];
                        break;
                    case 'greater_than':
                        $mongoQuery[$field] = ['$gt' => $value];
                        break;
                    case 'less_than':
                        $mongoQuery[$field] = ['$lt' => $value];
                        break;
                    case 'between':
                        if (is_array($value) && count($value) === 2) {
                            $mongoQuery[$field] = ['$gte' => $value[0], '$lte' => $value[1]];
                        }
                        break;
                    case 'in':
                        if (is_array($value)) {
                            $mongoQuery[$field] = ['$in' => $value];
                        }
                        break;
                }
            }
        }

        // If no query and no filters, match all documents
        $hasQuery = !empty($query) || !empty($filters);

        try {
            $manager = \App\Config\Database::mongoManager();
            $dbName = \App\Config\Database::mongoDbName();

            if (!$manager || !$dbName) {
                throw new DatabaseException("MongoDB connection not available");
            }

            // Count documents using aggregation
            $countPipeline = [];

            if ($hasQuery) {
                $countPipeline[] = ['$match' => $mongoQuery];
            }

            $countPipeline[] = ['$count' => 'total'];

            $countCommand = new \MongoDB\Driver\Command([
                'aggregate' => $collectionName,
                'pipeline' => $countPipeline,
                'cursor' => new \stdClass()
            ]);

            $countCursor = $manager->executeCommand($dbName, $countCommand);
            $countResult = $countCursor->toArray();
            $total = !empty($countResult) ? $countResult[0]->total : 0;

            // Get actual data with pagination
            $pipeline = [];

            // Only add $match stage if we have a query
            if ($hasQuery) {
                $pipeline[] = ['$match' => $mongoQuery];
            }

            $pipeline[] = ['$sort' => $sort];
            $pipeline[] = ['$skip' => $offset];
            $pipeline[] = ['$limit' => $limit];

            $command = new \MongoDB\Driver\Command([
                'aggregate' => $collectionName,
                'pipeline' => $pipeline,
                'cursor' => new \stdClass()
            ]);

            $cursor = $manager->executeCommand($dbName, $command);
            $documents = $cursor->toArray();

            $data = [];
            foreach ($documents as $document) {
                $data[] = $this->normalizeDocument($document, $collectionName);
            }

            return [
                'data' => $data,
                'total' => $total
            ];

        } catch (\Throwable $e) {
            throw new DatabaseException(
                "Failed to search in collection {$collectionName}",
                ['query' => $query, 'filters' => $filters],
                0,
                $e
            );
        }
    }

    public function getExportData(array $filters = [], array $options = []): array
    {
        $collections = [
            AppConfig::getApiConnectionsCollection(),
            AppConfig::getApiRunsCollection(),
            AppConfig::getApiSchedulesCollection(),
            AppConfig::getParameterModesCollection()
        ];

        $allData = [];

        foreach ($collections as $collectionName) {
            try {
                $data = $this->getCollectionData($collectionName, $filters, $options);
                $allData = array_merge($allData, $data);
            } catch (DatabaseException $e) {
                // Continue with other collections if one fails
                continue;
            }
        }

        return $allData;
    }

    private function getCollectionData(string $collectionName, array $filters = [], array $options = []): array
    {
        $limit = $options['limit'] ?? 10000; // Higher limit for exports
        $sort = $options['sort'] ?? ['createdAt' => -1];

        // Build MongoDB query for filters
        $mongoQuery = [];
        $hasQuery = false;

        if (!empty($filters)) {
            $hasQuery = true;
            foreach ($filters as $filter) {
                $field = $filter['field'] ?? '';
                $operator = $filter['operator'] ?? 'equals';
                $value = $filter['value'] ?? '';

                if (empty($field)) continue;

                switch ($operator) {
                    case 'equals':
                        $mongoQuery[$field] = $value;
                        break;
                    case 'contains':
                        $mongoQuery[$field] = ['$regex' => $value, '$options' => 'i'];
                        break;
                    case 'greater_than':
                        $mongoQuery[$field] = ['$gt' => $value];
                        break;
                    case 'less_than':
                        $mongoQuery[$field] = ['$lt' => $value];
                        break;
                    case 'between':
                        if (is_array($value) && count($value) === 2) {
                            $mongoQuery[$field] = ['$gte' => $value[0], '$lte' => $value[1]];
                        }
                        break;
                    case 'in':
                        if (is_array($value)) {
                            $mongoQuery[$field] = ['$in' => $value];
                        }
                        break;
                }
            }
        }

        try {
            $manager = \App\Config\Database::mongoManager();
            $dbName = \App\Config\Database::mongoDbName();

            if (!$manager || !$dbName) {
                throw new DatabaseException("MongoDB connection not available");
            }

            $pipeline = [];

            // Only add $match stage if we have filters
            if ($hasQuery) {
                $pipeline[] = ['$match' => $mongoQuery];
            }

            $pipeline[] = ['$sort' => $sort];
            $pipeline[] = ['$limit' => $limit];

            $command = new \MongoDB\Driver\Command([
                'aggregate' => $collectionName,
                'pipeline' => $pipeline,
                'cursor' => new \stdClass()
            ]);

            $cursor = $manager->executeCommand($dbName, $command);
            $documents = $cursor->toArray();

            $data = [];
            foreach ($documents as $document) {
                $normalized = $this->normalizeDocument($document, $collectionName);
                // Add collection type for export context
                $normalized['_collection'] = $collectionName;
                $data[] = $normalized;
            }

            return $data;

        } catch (\Throwable $e) {
            throw new DatabaseException(
                "Failed to get data from collection {$collectionName}",
                ['filters' => $filters],
                0,
                $e
            );
        }
    }

    private function normalizeDocument($document, string $collectionName): array
    {
        $data = json_decode(json_encode($document), true);

        // Convert MongoDB ObjectId to string
        if (isset($data['_id']) && is_array($data['_id'])) {
            $data['id'] = (string)$data['_id']['$oid'];
            unset($data['_id']);
        } elseif (isset($data['_id'])) {
            $data['id'] = (string)$data['_id'];
            unset($data['_id']);
        }

        // Add collection type
        $data['_collection'] = $collectionName;

        return $data;
    }

    protected function normalize($document): array
    {
        // This method is required by BaseRepository but not used in this implementation
        return $this->normalizeDocument($document, '');
    }
}