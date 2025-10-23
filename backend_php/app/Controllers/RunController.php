<?php
namespace App\Controllers;

use App\Services\RunService;

class RunController
{
    private RunService $service;

    public function __construct()
    {
        $this->service = new RunService();
    }

    public function index(): array
    {
        $connectionId = $_GET['connectionId'] ?? '';
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        if (!$connectionId) {
            http_response_code(400);
            return ['error' => 'connectionId is required'];
        }
        return [ 'runs' => $this->service->listByConnection($connectionId, $limit) ];
    }
}
