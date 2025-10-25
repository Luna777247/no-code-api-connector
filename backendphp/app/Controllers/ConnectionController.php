<?php
namespace App\Controllers;

use App\Services\ConnectionService;
use App\Validation\ConnectionValidator;
use App\Validation\ValidationHelper;

class ConnectionController
{
    private ConnectionService $service;
    private ConnectionValidator $validator;

    public function __construct()
    {
        $this->service = new ConnectionService();
        $this->validator = new ConnectionValidator();
    }

    public function index(): array
    {
        return $this->service->list();
    }

    public function show(string $id): array
    {
        $id = ValidationHelper::validateId($id);

        $conn = $this->service->get($id);
        if (!$conn) {
            http_response_code(404);
            return ['error' => 'Connection not found'];
        }
        return $conn;
    }

    public function create(): array
    {
        $input = ValidationHelper::getJsonInput();
        $input = ValidationHelper::sanitizeInput($input);
        ValidationHelper::validateRequest($this->validator, $input);

        $saved = $this->service->create($input);
        if (!$saved) {
            http_response_code(400);
            return ['error' => 'Failed to create connection'];
        }
        return $saved;
    }

    public function update(string $id): array
    {
        $id = ValidationHelper::validateId($id);

        $input = ValidationHelper::getJsonInput();
        $input = ValidationHelper::sanitizeInput($input);
        ValidationHelper::validateUpdateRequest($this->validator, $input);

        $ok = $this->service->update($id, $input);
        if (!$ok) {
            http_response_code(400);
            return ['error' => 'Failed to update connection'];
        }
        return ['ok' => true];
    }

    public function delete(string $id): array
    {
        $id = ValidationHelper::validateId($id);

        $ok = $this->service->delete($id);
        if (!$ok) {
            http_response_code(400);
            return ['error' => 'Failed to delete connection'];
        }
        return ['ok' => true];
    }
}
