<?php
namespace App\Controllers;

use App\Services\ReportService;

class ReportController
{
    private ReportService $service;

    public function __construct()
    {
        $this->service = new ReportService();
    }

    public function index(): array
    {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        return $this->service->listReports($limit, $offset);
    }

    public function show(string $id): array
    {
        $report = $this->service->getReport($id);
        if (!$report) {
            http_response_code(404);
            return ['error' => 'Report not found'];
        }
        return $report;
    }

    public function create(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($input['name']) || empty($input['type'])) {
            http_response_code(400);
            return ['error' => 'name and type are required'];
        }

        $result = $this->service->createReport($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to create report'];
        }
        return $result;
    }

    public function delete(string $id): array
    {
        $result = $this->service->deleteReport($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to delete report'];
        }
        return ['ok' => true];
    }
}
