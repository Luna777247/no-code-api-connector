<?php
namespace App\Services;

use App\Repositories\DataRepository;

class DataExportService
{
    private DataRepository $dataRepo;

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
            // In a real implementation, you would retrieve the export job from database
            // and get the stored file data. For now, we'll generate fresh data
            // based on the exportId (which could contain encoded parameters)

            // For demonstration, get a small sample of data
            $data = $this->dataRepo->getExportData([], [
                'limit' => 10,
                'sort' => ['createdAt' => -1]
            ]);

            $jsonData = json_encode($data, JSON_PRETTY_PRINT);

            return [
                'filename' => 'export_' . $exportId . '.json',
                'mimeType' => 'application/json',
                'path' => 'php://memory', // In real app would be file path
                'data' => $jsonData,
                'size' => strlen($jsonData)
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
        // In real app would save to database
        // For now, just mock storage
    }

    private function exportCsv(array $data, string $filename): array
    {
        if (empty($data)) {
            $csvData = '';
        } else {
            $headers = array_keys($data[0]);
            $csvData = implode(',', $headers) . "\n";
            foreach ($data as $row) {
                $csvData .= implode(',', array_map(function($value) {
                    return '"' . str_replace('"', '""', $value) . '"';
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

    private function exportExcel(array $data, string $filename): array
    {
        // For now, just return JSON as Excel format isn't implemented
        return $this->exportJson($data, $filename);
    }
}