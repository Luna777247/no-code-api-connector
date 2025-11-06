<?php
namespace App\Controllers;

use App\Services\RunService;
use App\Services\ExecutionService;

class RunDetailController
{
    private RunService $service;
    private ExecutionService $executionService;

    public function __construct()
    {
        $this->service = new RunService();
        $this->executionService = new ExecutionService();
    }

    public function show(string $id): array
    {
        $run = $this->service->getRunDetail($id);
        if (!$run) {
            http_response_code(404);
            return ['error' => 'Run not found'];
        }
        return $run;
    }

    public function retry(string $id): array
    {
        $result = $this->service->retryRun($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to retry run'];
        }
        return $result;
    }

    public function export(string $id): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $format = $input['format'] ?? 'json'; // json, csv, excel
        
        $result = $this->service->exportRun($id, $format);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to export run'];
        }
        return $result;
    }

    public function logs(string $id): array
    {
        $logs = $this->service->getRunLogs($id);
        return $logs;
    }

    public function requests(string $id): array
    {
        $requests = $this->service->getRunRequests($id);
        return $requests;
    }

    public function execute(string $id): array
    {
        $result = $this->executionService->executeApiCall($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to execute run'];
        }
        return ['success' => true, 'message' => 'Run executed successfully'];
    }
}
