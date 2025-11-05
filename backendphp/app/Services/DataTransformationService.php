<?php
namespace App\Services;

use App\Repositories\DataRepository;

class DataTransformationService
{
    private DataRepository $dataRepo;

    public function __construct()
    {
        $this->dataRepo = new DataRepository();
    }

    /**
     * Transform API response data according to field mappings and save to collection
     */
    public function transformAndSave(string $connectionId, string $tableName, array $fieldMappings, string $responseBody): array
    {
        try {
            // Parse the API response
            $apiData = json_decode($responseBody, true);
            if (!$apiData) {
                return ['error' => 'Invalid JSON response'];
            }

            // Transform data according to field mappings
            $transformedRecords = $this->transformData($apiData, $fieldMappings);

            if (empty($transformedRecords)) {
                return ['error' => 'No records to save after transformation'];
            }

            // Save to collection
            $savedCount = 0;
            foreach ($transformedRecords as $record) {
                // Add metadata
                $record['_connectionId'] = $connectionId;
                $record['_updatedAt'] = date('c');
                $record['_source'] = 'api';

                // Try to find existing record to update, or insert new
                $existingRecord = $this->findExistingRecord($tableName, $record);
                if ($existingRecord) {
                    // Update existing record
                    $this->updateInCollection($tableName, $existingRecord['_id'], $record);
                } else {
                    // Insert new record
                    $this->insertIntoCollection($tableName, $record);
                }
                $savedCount++;
            }

            return [
                'success' => true,
                'recordsProcessed' => count($transformedRecords),
                'recordsSaved' => $savedCount,
                'tableName' => $tableName
            ];

        } catch (\Throwable $e) {
            error_log('Data transformation error: ' . $e->getMessage());
            return ['error' => 'Transformation failed: ' . $e->getMessage()];
        }
    }

    /**
     * Insert data into a specific collection
     */
    private function insertIntoCollection(string $collectionName, array $data): bool
    {
        return $this->dataRepo->insertIntoCollection($collectionName, $data);
    }

    /**
     * Update data in a specific collection
     */
    private function updateInCollection(string $collectionName, string $id, array $data): bool
    {
        return $this->dataRepo->updateInCollection($collectionName, $id, $data);
    }

    /**
     * Find existing record for upsert logic
     */
    private function findExistingRecord(string $collectionName, array $record): ?array
    {
        // Try to find by unique identifiers (id, _id, or other unique fields)
        $filter = [];

        // If record has an 'id' field, use it for matching
        if (isset($record['id'])) {
            $filter['id'] = $record['id'];
        }
        // If record has '_connectionId', use it with another unique field
        elseif (isset($record['_connectionId'])) {
            // For API data, we might want to match on connection + some unique field
            // For now, just return null to always insert (can be improved later)
            return null;
        }

        if (empty($filter)) {
            return null;
        }

        return $this->dataRepo->findExistingRecord($collectionName, $filter);
    }

    /**
     * Transform API data according to field mappings
     */
    private function transformData(array $apiData, array $fieldMappings): array
    {
        $records = [];

        // Handle different API response structures
        if ($this->isArrayOfObjects($apiData)) {
            // API returns array of objects directly
            foreach ($apiData as $item) {
                if (is_array($item)) {
                    $transformed = $this->transformSingleRecord($item, $fieldMappings);
                    if ($transformed) {
                        $records[] = $transformed;
                    }
                }
            }
        } elseif (is_array($apiData) && count($apiData) === 1 && is_array($apiData[0])) {
            // API returns array with single object
            $transformed = $this->transformSingleRecord($apiData[0], $fieldMappings);
            if ($transformed) {
                $records[] = $transformed;
            }
        } elseif (is_object($apiData) || is_array($apiData)) {
            // API returns single object or complex structure
            // Try to extract arrays from the response
            $arrays = $this->extractArraysFromObject($apiData);
            foreach ($arrays as $arrayData) {
                if (is_array($arrayData)) {
                    foreach ($arrayData as $item) {
                        if (is_array($item)) {
                            $transformed = $this->transformSingleRecord($item, $fieldMappings);
                            if ($transformed) {
                                $records[] = $transformed;
                            }
                        }
                    }
                }
            }

            // If no arrays found, treat the whole object as a single record
            if (empty($records) && !empty($apiData)) {
                $transformed = $this->transformSingleRecord($apiData, $fieldMappings);
                if ($transformed) {
                    $records[] = $transformed;
                }
            }
        }

        return $records;
    }

    /**
     * Transform a single record according to field mappings
     */
    private function transformSingleRecord(array $record, array $fieldMappings): ?array
    {
        $transformed = [];

        foreach ($fieldMappings as $mapping) {
            if (!isset($mapping['isSelected']) || !$mapping['isSelected']) {
                continue;
            }

            $sourcePath = $mapping['sourcePath'] ?? '';
            $targetField = $mapping['targetField'] ?? '';
            $dataType = $mapping['dataType'] ?? 'string';

            if (empty($sourcePath) || empty($targetField)) {
                continue;
            }

            // Extract value from source path
            $value = $this->extractValueByPath($record, $sourcePath);

            // Convert data type if needed
            $value = $this->convertDataType($value, $dataType);

            $transformed[$targetField] = $value;
        }

        return empty($transformed) ? null : $transformed;
    }

    /**
     * Extract value from object/array using dot notation path
     */
    private function extractValueByPath(array $data, string $path)
    {
        // Remove leading $ if present
        $path = ltrim($path, '$');

        if (empty($path)) {
            return $data;
        }

        $keys = explode('.', $path);
        $current = $data;

        foreach ($keys as $key) {
            // Handle array access like [0]
            if (preg_match('/^(.+)\[(\d+)\]$/', $key, $matches)) {
                $arrayKey = $matches[1];
                $index = (int)$matches[2];

                if (!isset($current[$arrayKey]) || !is_array($current[$arrayKey])) {
                    return null;
                }

                $current = $current[$arrayKey];
                if (isset($current[$index])) {
                    $current = $current[$index];
                } else {
                    return null;
                }
            } else {
                if (!isset($current[$key])) {
                    return null;
                }
                $current = $current[$key];
            }
        }

        return $current;
    }

    /**
     * Convert value to specified data type
     */
    private function convertDataType($value, string $dataType)
    {
        if ($value === null) {
            return null;
        }

        switch (strtolower($dataType)) {
            case 'integer':
            case 'int':
                return (int)$value;
            case 'float':
            case 'double':
                return (float)$value;
            case 'boolean':
            case 'bool':
                return (bool)$value;
            case 'string':
            default:
                return (string)$value;
        }
    }

    /**
     * Check if data is an array of objects
     */
    private function isArrayOfObjects($data): bool
    {
        if (!is_array($data)) {
            return false;
        }

        if (empty($data)) {
            return true; // Empty array is considered array of objects
        }

        foreach ($data as $item) {
            if (!is_array($item)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Extract arrays from complex object structure
     */
    private function extractArraysFromObject($data): array
    {
        $arrays = [];

        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (is_array($value) && $this->isArrayOfObjects($value)) {
                    $arrays[] = $value;
                } elseif (is_array($value)) {
                    // Recursively search nested structures
                    $nestedArrays = $this->extractArraysFromObject($value);
                    $arrays = array_merge($arrays, $nestedArrays);
                }
            }
        }

        return $arrays;
    }
}