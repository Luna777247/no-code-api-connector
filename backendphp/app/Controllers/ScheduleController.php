<?php
namespace App\Controllers;

use App\Services\ScheduleService;
use App\Validation\ScheduleValidator;
use App\Validation\ValidationHelper;

class ScheduleController
{
    private ScheduleService $service;
    private ScheduleValidator $validator;

    public function __construct()
    {
        $this->service = new ScheduleService();
        $this->validator = new ScheduleValidator();
    }

    public function index(): array
    {
        try {
            $items = $this->service->listSchedules();
            return $items;
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'error' => 'Failed to fetch schedules',
                'message' => $e->getMessage(),
            ];
        }
    }

    public function show(string $id): array
    {
        try {
            $id = ValidationHelper::validateId($id);

            $items = $this->service->listSchedules();
            $schedule = array_filter($items, fn($item) => $item['id'] === $id);

            if (empty($schedule)) {
                http_response_code(404);
                return ['error' => 'Schedule not found'];
            }

            return array_values($schedule)[0];
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'error' => 'Failed to fetch schedule',
                'message' => $e->getMessage(),
            ];
        }
    }

    public function create(): array
    {
        try {
            $input = ValidationHelper::getJsonInput();
            $input = ValidationHelper::sanitizeInput($input);
            ValidationHelper::validateRequest($this->validator, $input);

            $saved = $this->service->createSchedule($input);
            if (!$saved) {
                http_response_code(400);
                return ['error' => 'Failed to create schedule'];
            }
            return $saved;
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'error' => 'Failed to create schedule',
                'message' => $e->getMessage(),
            ];
        }
    }

    public function update(string $id): array
    {
        try {
            $id = ValidationHelper::validateId($id);

            $input = ValidationHelper::getJsonInput();
            $input = ValidationHelper::sanitizeInput($input);
            ValidationHelper::validateUpdateRequest($this->validator, $input);

            $ok = $this->service->updateSchedule($id, $input);
            if (!$ok) {
                http_response_code(400);
                return ['error' => 'Failed to update schedule'];
            }
            return ['ok' => true];
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'error' => 'Failed to update schedule',
                'message' => $e->getMessage(),
            ];
        }
    }

    public function delete(string $id): array
    {
        try {
            $id = ValidationHelper::validateId($id);

            $ok = $this->service->deleteSchedule($id);
            if (!$ok) {
                http_response_code(400);
                return ['error' => 'Failed to delete schedule'];
            }
            return ['ok' => true];
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'error' => 'Failed to delete schedule',
                'message' => $e->getMessage(),
            ];
        }
    }
}
