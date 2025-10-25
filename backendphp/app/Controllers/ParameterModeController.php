<?php
namespace App\Controllers;

use App\Services\ParameterModeService;
use App\Validation\ParameterModeValidator;
use App\Validation\ValidationHelper;

class ParameterModeController
{
    private ParameterModeService $service;
    private ParameterModeValidator $validator;

    public function __construct()
    {
        $this->service = new ParameterModeService();
        $this->validator = new ParameterModeValidator();
    }

    public function index(): array
    {
        return $this->service->listModes();
    }

    public function show(string $id): array
    {
        $id = ValidationHelper::validateId($id);

        $mode = $this->service->getMode($id);
        if (!$mode) {
            http_response_code(404);
            return ['error' => 'Parameter mode not found'];
        }
        return $mode;
    }

    public function create(): array
    {
        $input = ValidationHelper::getJsonInput();
        $input = ValidationHelper::sanitizeInput($input);
        ValidationHelper::validateRequest($this->validator, $input);

        $result = $this->service->createMode($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to create parameter mode'];
        }
        return $result;
    }

    public function update(string $id): array
    {
        $id = ValidationHelper::validateId($id);

        $input = ValidationHelper::getJsonInput();
        $input = ValidationHelper::sanitizeInput($input);
        ValidationHelper::validateUpdateRequest($this->validator, $input);

        $result = $this->service->updateMode($id, $input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to update parameter mode'];
        }
        return $result;
    }

    public function delete(string $id): array
    {
        $id = ValidationHelper::validateId($id);

        $result = $this->service->deleteMode($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to delete parameter mode'];
        }
        return ['ok' => true];
    }
}
