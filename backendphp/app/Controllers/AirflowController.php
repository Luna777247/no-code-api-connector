<?php
namespace App\Controllers;

use App\Services\AirflowService;

class AirflowController
{
    private AirflowService $service;

    public function __construct()
    {
        $this->service = new AirflowService();
    }

    /**
     * Trigger a scheduled DAG run manually
     */
    public function triggerRun(string $scheduleId): array
    {
        try {
            $dagId = "api_schedule_{$scheduleId}";
            $result = $this->service->triggerDagRun($dagId);
            
            if (!$result['success']) {
                http_response_code(500);
            }
            
            return $result;
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get DAG status
     */
    public function getStatus(string $scheduleId): array
    {
        try {
            $dagId = "api_schedule_{$scheduleId}";
            return $this->service->getDagStatus($dagId);
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get DAG run history
     */
    public function getHistory(string $scheduleId): array
    {
        try {
            $dagId = "api_schedule_{$scheduleId}";
            $limit = $_GET['limit'] ?? 10;
            
            return $this->service->getDagRunHistory($dagId, (int)$limit);
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Pause a schedule
     */
    public function pause(string $scheduleId): array
    {
        try {
            $dagId = "api_schedule_{$scheduleId}";
            return $this->service->pauseDag($dagId);
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Resume a schedule
     */
    public function resume(string $scheduleId): array
    {
        try {
            $dagId = "api_schedule_{$scheduleId}";
            return $this->service->resumeDag($dagId);
        } catch (\Throwable $e) {
            http_response_code(500);
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
