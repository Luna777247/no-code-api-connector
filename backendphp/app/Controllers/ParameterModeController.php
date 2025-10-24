<?php
namespace App\Controllers;

use App\Services\ParameterModeService;

class ParameterModeController
{
    private ParameterModeService $service;

    public function __construct()
    {
        $this->service = new ParameterModeService();
    }

    public function index(): array
    {
        return $this->service->listModes();
    }

    public function show(string $id): array
    {
        $mode = $this->service->getMode($id);
        if (!$mode) {
            http_response_code(404);
            return ['error' => 'Parameter mode not found'];
        }
        return $mode;
    }

    public function create(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($input['name']) || empty($input['type'])) {
            http_response_code(400);
            return ['error' => 'name and type are required'];
        }

        $result = $this->service->createMode($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to create parameter mode'];
        }
        return $result;
    }

    public function update(string $id): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $result = $this->service->updateMode($id, $input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to update parameter mode'];
        }
        return $result;
    }

    public function delete(string $id): array
    {
        $result = $this->service->deleteMode($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to delete parameter mode'];
        }
        return ['ok' => true];
    }
}
