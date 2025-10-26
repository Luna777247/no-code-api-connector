<?php
namespace App\Controllers;

use App\Services\DataExportService;

class DataExportController
{
    private DataExportService $service;

    public function __construct()
    {
        $this->service = new DataExportService();
    }

    public function export(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($input['format'])) {
            http_response_code(400);
            return ['error' => 'format is required (csv, json, excel)'];
        }

        $result = $this->service->exportData($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to export data'];
        }
        return $result;
    }

    public function download(string $id): void
    {
        $file = $this->service->getExportFile($id);
        if (!$file) {
            http_response_code(404);
            echo json_encode(['error' => 'Export file not found']);
            return;
        }

        header('Content-Type: ' . $file['mimeType']);
        header('Content-Disposition: attachment; filename="' . $file['filename'] . '"');
        echo $file['data'];
    }
}
