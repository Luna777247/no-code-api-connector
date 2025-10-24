<?php
namespace App\Controllers;

use App\Services\ConnectionService;

class ConnectionController
{
    private ConnectionService $service;

    public function __construct()
    {
        $this->service = new ConnectionService();
    }

    public function index(): array
    {
        return $this->service->list();
    }

    public function show(string $id): array
    {
        $conn = $this->service->get($id);
        if (!$conn) {
            http_response_code(404);
            return ['error' => 'Connection not found'];
        }
        return $conn;
    }

    public function create(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $saved = $this->service->create($input);
        if (!$saved) {
            http_response_code(400);
            return ['error' => 'Failed to create connection'];
        }
        return $saved;
    }

    public function update(string $id): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $ok = $this->service->update($id, $input);
        if (!$ok) {
            http_response_code(400);
            return ['error' => 'Failed to update connection'];
        }
        return ['ok' => true];
    }

    public function delete(string $id): array
    {
        $ok = $this->service->delete($id);
        if (!$ok) {
            http_response_code(400);
            return ['error' => 'Failed to delete connection'];
        }
        return ['ok' => true];
    }
}
