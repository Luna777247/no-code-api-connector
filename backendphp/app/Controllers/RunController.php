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
        $connectionId = $_GET['connectionId'] ?? null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        
        if ($connectionId) {
            // Filter by connection if provided
            return [ 'runs' => $this->service->listByConnection($connectionId, $limit) ];
        } else {
            // Return all runs if no connectionId specified
            return [ 'runs' => $this->service->listAll($limit) ];
        }
    }
}
