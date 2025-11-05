<?php
namespace App\Services;

use App\Repositories\DataRepository;

class DataExportService
{
    private DataRepository $dataRepo;
    private array $exportStorage = []; // Simple in-memory storage for demo

    public function __construct()
    {
        $this->dataRepo = new DataRepository();
    }

    public function exportData(array $params): ?array
    {
        $format = $params['format'] ?? 'json';
        $filters = $params['filters'] ?? [];
        $dateRange = $params['dateRange'] ?? null;
        $includeMetadata = $params['includeMetadata'] ?? false;

        // Generate unique export ID
        $exportId = uniqid('export_', true);

        try {
            // Get real data from MongoDB collections
            $data = $this->dataRepo->getExportData($filters, [
                'limit' => 10000, // Reasonable limit for exports
                'sort' => ['createdAt' => -1]
            ]);

            // Apply date range filter if provided
            if ($dateRange && isset($dateRange['start']) && isset($dateRange['end'])) {
                $data = $this->applyDateRangeFilter($data, $dateRange);
            }

            // Apply additional filters if provided
            if (!empty($filters)) {
                $data = $this->applyFilters($data, $filters);
            }

            // Generate export file
            $exportResult = $this->generateExportFile($data, $format, $exportId, $includeMetadata);

            if (!$exportResult) {
                return null;
            }

            // Store export job info (in real app would save to database)
            $this->storeExportJob($exportId, $exportResult);

            return [
                'exportId' => $exportId,
                'status' => 'completed',
                'estimatedTime' => '2 seconds',
                'filename' => $exportResult['filename'],
                'size' => $exportResult['size'],
                'format' => $format,
                'recordCount' => count($data)
            ];
        } catch (\Throwable $e) {
            error_log("Export failed: " . $e->getMessage());
            return null;
        }
    }

    public function getExportFile(string $exportId): ?array
    {
        try {
            // Check if export exists in storage
            if (!isset($this->exportStorage[$exportId])) {
                return null;
            }

            $storedExport = $this->exportStorage[$exportId];

            // Determine MIME type based on format
            $mimeType = match ($storedExport['format']) {
                'csv' => 'text/csv',
                'json' => 'application/json',
                'excel' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                default => 'application/octet-stream'
            };

            return [
                'filename' => $storedExport['filename'],
                'mimeType' => $mimeType,
                'data' => $storedExport['data'],
                'size' => $storedExport['size']
            ];
        } catch (\Throwable $e) {
            error_log("Failed to get export file: " . $e->getMessage());
            return null;
        }
    }

    private function applyFilters(array $data, array $filters): array
    {
        // Simple filter implementation
        return array_filter($data, function($item) use ($filters) {
            foreach ($filters as $filter) {
                $field = $filter['field'] ?? '';
                $operator = $filter['operator'] ?? 'equals';
                $value = $filter['value'] ?? '';

                if (!isset($item[$field])) {
                    return false;
                }

                switch ($operator) {
                    case 'equals':
                        if ($item[$field] != $value) return false;
                        break;
                    case 'contains':
                        if (stripos($item[$field], $value) === false) return false;
                        break;
                }
            }
            return true;
        });
    }

    private function applyDateRangeFilter(array $data, array $dateRange): array
    {
        $startDate = strtotime($dateRange['start']);
        $endDate = strtotime($dateRange['end']);

        return array_filter($data, function($item) use ($startDate, $endDate) {
            $itemDate = strtotime($item['createdAt'] ?? $item['updatedAt'] ?? date('c'));
            return $itemDate >= $startDate && $itemDate <= $endDate;
        });
    }

    private function generateExportFile(array $data, string $format, string $exportId, bool $includeMetadata): array
    {
        $filename = 'export_' . date('Y-m-d_H-i-s') . '_' . $exportId;

        switch ($format) {
            case 'csv':
                return $this->exportCsv($data, $filename);
            case 'json':
                return $this->exportJson($data, $filename, $includeMetadata);
            case 'excel':
                return $this->exportExcel($data, $filename);
            default:
                return $this->exportJson($data, $filename, $includeMetadata);
        }
    }

    private function exportJson(array $data, string $filename, bool $includeMetadata = false): array
    {
        $exportData = $data;
        if ($includeMetadata) {
            $exportData = [
                'metadata' => [
                    'exportedAt' => date('c'),
                    'recordCount' => count($data),
                    'version' => '1.0'
                ],
                'data' => $data
            ];
        }

        $jsonData = json_encode($exportData, JSON_PRETTY_PRINT);
        return [
            'filename' => $filename . '.json',
            'data' => $jsonData,
            'size' => strlen($jsonData),
            'format' => 'json'
        ];
    }

    private function storeExportJob(string $exportId, array $exportResult): void
    {
        // Store in memory for demo purposes
        $this->exportStorage[$exportId] = [
            'filename' => $exportResult['filename'],
            'data' => $exportResult['data'],
            'size' => $exportResult['size'],
            'format' => $exportResult['format'],
            'createdAt' => time()
        ];
    }

    private function exportCsv(array $data, string $filename): array
    {
        if (empty($data)) {
            $csvData = '';
        } else {
            $headers = array_keys($data[0]);
            $csvData = implode(',', $headers) . "\n";
            foreach ($data as $row) {
                $csvData .= @implode(',', array_map(function($value) {
                    $stringValue = $this->convertToString($value);
                    // Ensure it's a string before str_replace
                    if (!is_string($stringValue)) {
                        $stringValue = (string)$stringValue;
                    }
                    return '"' . @str_replace('"', '""', $stringValue) . '"';
                }, array_values($row))) . "\n";
            }
        }

        return [
            'filename' => $filename . '.csv',
            'data' => $csvData,
            'size' => strlen($csvData),
            'format' => 'csv'
        ];
    }

    private function convertToString($value): string
    {
        if ($value === null) {
            return '';
        }

        if (is_scalar($value)) {
            return (string)$value;
        }

        if (is_array($value) || is_object($value)) {
            // Handle special cases
            if (is_object($value) && method_exists($value, '__toString')) {
                return (string)$value;
            }
            try {
                return json_encode($value);
            } catch (\Exception $e) {
                return '[complex_object]';
            }
        }

        // Fallback for any other type (resources, etc.)
        try {
            return (string)$value;
        } catch (\Exception $e) {
            return '[unconvertible_value]';
        }
    }

    private function exportExcel(array $data, string $filename): array
    {
        // For now, just return JSON as Excel format isn't implemented
        return $this->exportJson($data, $filename);
    }
}