<?php
namespace App\Controllers;

use App\Services\ScheduleService;
use App\Services\AirflowService;
use App\Repositories\ScheduleRepository;
use App\Repositories\ConnectionRepository;

class ScheduleManagementController
{
    private ScheduleService $service;
    private AirflowService $airflowService;
    private ScheduleRepository $scheduleRepo;
    private ConnectionRepository $connectionRepo;

    public function __construct()
    {
        $this->service = new ScheduleService();
        $this->airflowService = new AirflowService();
        $this->scheduleRepo = new ScheduleRepository();
        $this->connectionRepo = new ConnectionRepository();
    }

    public function create(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($input['connectionId']) || empty($input['cronExpression'])) {
            http_response_code(400);
            return ['error' => 'connectionId and cronExpression are required'];
        }

        // Look up connection name if not provided
        if (empty($input['connectionName'])) {
            $connection = $this->connectionRepo->findById($input['connectionId']);
            if ($connection) {
                $input['connectionName'] = $connection['name'] ?? 'Unknown Connection';
            } else {
                http_response_code(400);
                return ['error' => 'Invalid connectionId'];
            }
        }

        // Set defaults for optional fields
        $input['timezone'] = $input['timezone'] ?? 'Asia/Ho_Chi_Minh';
        $input['scheduleType'] = $input['scheduleType'] ?? 'cron';
        $input['isActive'] = $input['isActive'] ?? true;

        $result = $this->service->createSchedule($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to create schedule'];
        }

        $scheduleId = $result['id'] ?? null;
        if ($scheduleId) {
            $dagId = "api_schedule_{$scheduleId}";
            $this->scheduleRepo->saveDagId($scheduleId, $dagId);
            $result['dagId'] = $dagId;
            // Best-effort: trigger the sync DAG in Airflow so registration happens immediately
            try {
                // ask Airflow to run the sync job which reads schedules from MongoDB
                $this->airflowService->triggerDagRun('api_schedule_sync', ['scheduleId' => $scheduleId]);
                $result['airflowSyncTriggered'] = true;
            } catch (\Throwable $e) {
                // ignore errors - schedule creation should not fail because Airflow is unavailable
                $result['airflowSyncTriggered'] = false;
            }
        }

        return $result;
    }

    public function update(string $id): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $result = $this->service->updateSchedule($id, $input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to update schedule'];
        }

        // Get the updated schedule
        $updatedSchedule = $this->service->getSchedule($id);
        if (!$updatedSchedule) {
            http_response_code(404);
            return ['error' => 'Schedule not found after update'];
        }

        // If activating a schedule, trigger Airflow sync
        if (isset($input['isActive']) && $input['isActive'] === true) {
            $dagId = "api_schedule_{$id}";
            try {
                // Trigger the sync DAG in Airflow so registration happens immediately
                $this->airflowService->triggerDagRun('api_schedule_sync', ['scheduleId' => $id]);
                $updatedSchedule['airflowSyncTriggered'] = true;
            } catch (\Throwable $e) {
                // Ignore errors - schedule activation should not fail because Airflow is unavailable
                $updatedSchedule['airflowSyncTriggered'] = false;
            }
        }

        return $updatedSchedule;
    }

    public function delete(string $id): array
    {
        $result = $this->service->deleteSchedule($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to delete schedule'];
        }
        return ['ok' => true];
    }

    public function show(string $id): array
    {
        $schedule = $this->service->getSchedule($id);
        if (!$schedule) {
            http_response_code(404);
            return ['error' => 'Schedule not found'];
        }
        return $schedule;
    }

    public function history(string $id): array
    {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        return $this->service->getScheduleHistory($id, $limit, $offset);
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
