<?php
namespace App\Services;

use App\Repositories\ScheduleRepository;
use App\Services\AirflowService;
use App\Config\AppConfig;

class ScheduleCreationService
{
    private ScheduleRepository $scheduleRepo;
    private AirflowService $airflowService;

    public function __construct()
    {
        $this->scheduleRepo = new ScheduleRepository();
        $this->airflowService = new AirflowService();
    }

    /**
     * Create a schedule for a connection
     *
     * @param array $scheduleData Schedule configuration data
     * @param string $connectionId Connection ID
     * @param string $connectionName Connection name
     * @return array|null Created schedule data or null on failure
     */
    public function createScheduleForConnection(array $scheduleData, string $connectionId, string $connectionName): ?array
    {
        $data = [
            'connectionId' => $connectionId,
            'connectionName' => $connectionName,
            'description' => $scheduleData['description'] ?? '',
            'scheduleType' => $scheduleData['type'] ?? 'daily',
            'cronExpression' => $scheduleData['cronExpression'] ?? AppConfig::getDefaultCronExpression(),
            'timezone' => $scheduleData['timezone'] ?? AppConfig::getDefaultTimezone(),
            'isActive' => true,
            'createdAt' => date('c'),
        ];

        $insertedSchedule = $this->scheduleRepo->insert($data);

        if ($insertedSchedule) {
            $scheduleId = $insertedSchedule['_id'] ?? $insertedSchedule['id'];
            if ($scheduleId) {
                $dagId = AppConfig::getDagPrefix() . "_{$scheduleId}";
                $this->scheduleRepo->saveDagId($scheduleId, $dagId);

                // Trigger Airflow sync (best-effort)
                try {
                    $this->airflowService->triggerDagRun(AppConfig::getDagPrefix() . '_sync', ['scheduleId' => $scheduleId]);
                } catch (\Throwable $e) {
                    // Ignore errors - schedule creation should not fail because Airflow is unavailable
                    error_log("Airflow sync trigger failed for schedule {$scheduleId}: " . $e->getMessage());
                }
            }
        }

        return $insertedSchedule;
    }
}