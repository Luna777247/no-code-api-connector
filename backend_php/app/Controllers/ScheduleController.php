<?php
namespace App\Controllers;

use App\Services\ScheduleService;

class ScheduleController
{
    private ScheduleService $service;

    public function __construct()
    {
        $this->service = new ScheduleService();
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
}
