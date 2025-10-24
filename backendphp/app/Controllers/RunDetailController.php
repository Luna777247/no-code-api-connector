<?php
namespace App\Controllers;

use App\Services\RunService;

class RunDetailController
{
    private RunService $service;

    public function __construct()
    {
        $this->service = new RunService();
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
}
