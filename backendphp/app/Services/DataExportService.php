<?php
namespace App\Services;

class DataExportService
{
    public function exportData(array $params): ?array
    {
        $format = $params['format'] ?? 'json';
        $data = $params['data'] ?? [];
        $filename = $params['filename'] ?? 'export_' . date('Y-m-d_H-i-s');

        // Basic implementation - in a real app this would handle CSV, Excel, etc.
        switch ($format) {
            case 'csv':
                return $this->exportCsv($data, $filename);
            case 'json':
                return $this->exportJson($data, $filename);
            case 'excel':
                return $this->exportExcel($data, $filename);
            default:
                return null;
        }
    }

    private function exportJson(array $data, string $filename): array
    {
        $jsonData = json_encode($data, JSON_PRETTY_PRINT);
        return [
            'filename' => $filename . '.json',
            'data' => $jsonData,
            'size' => strlen($jsonData),
            'format' => 'json'
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