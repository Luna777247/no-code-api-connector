<?php
namespace App\Controllers;

use App\Services\AdminSystemService;

class AdminSystemController
{
    private AdminSystemService $service;

    public function __construct()
    {
        $this->service = new AdminSystemService();
    }

    public function health(): array
    {
        return $this->service->getSystemHealth();
    }

    public function databaseHealth(): array
    {
        return $this->service->getDatabaseHealth();
    }

    public function storageHealth(): array
    {
        return $this->service->getStorageHealth();
    }

    public function config(): array
    {
        return $this->service->getConfig();
    }

    public function updateConfig(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $result = $this->service->updateConfig($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to update config'];
        }
        return $result;
    }

    public function logs(): array
    {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        return $this->service->getLogs($limit, $offset);
    }

    public function auditTrail(): array
    {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        return $this->service->getAuditTrail($limit, $offset);
    }
}
