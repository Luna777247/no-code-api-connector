<?php
namespace App\Services;

class ReportService
{
    public function listReports(int $limit = 50, int $offset = 0): array
    {
        // Basic implementation - in a real app this would query a database
        return [
            [
                'id' => 'report_1',
                'name' => 'Sample Report',
                'description' => 'A sample report',
                'createdAt' => date('c'),
                'type' => 'summary'
            ]
        ];
    }

    public function getReport(string $id): ?array
    {
        // Basic implementation
        if ($id === 'report_1') {
            return [
                'id' => $id,
                'name' => 'Sample Report',
                'description' => 'A sample report',
                'data' => [],
                'createdAt' => date('c'),
                'type' => 'summary'
            ];
        }
        return null;
    }

    public function createReport(array $data): ?array
    {
        // Basic implementation
        return array_merge($data, [
            'id' => 'report_' . uniqid(),
            'createdAt' => date('c')
        ]);
    }

    public function updateReport(string $id, array $data): bool
    {
        // Basic implementation
        return true;
    }

    public function deleteReport(string $id): bool
    {
        // Basic implementation
        return true;
    }
}