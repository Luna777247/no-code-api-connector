<?php
namespace App\Controllers;

use App\Services\AdminBackupService;

class AdminBackupController
{
    private AdminBackupService $service;

    public function __construct()
    {
        $this->service = new AdminBackupService();
    }

    public function index(): array
    {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        return $this->service->listBackups($limit, $offset);
    }

    public function create(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $result = $this->service->createBackup($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to create backup'];
        }
        return $result;
    }

    public function delete(string $id): array
    {
        $result = $this->service->deleteBackup($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to delete backup'];
        }
        return ['ok' => true];
    }

    public function restore(string $id): array
    {
        $result = $this->service->restoreBackup($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to restore backup'];
        }
        return ['ok' => true];
    }
}
