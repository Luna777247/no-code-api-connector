<?php
namespace App\Services;

use App\Repositories\ConnectionRepository;
use App\Repositories\ScheduleRepository;
use App\Services\AirflowService;

class ConnectionService
{
    private ConnectionRepository $repo;
    private ScheduleRepository $scheduleRepo;
    private AirflowService $airflowService;

    public function __construct()
    {
        $this->repo = new ConnectionRepository();
        $this->scheduleRepo = new ScheduleRepository();
        $this->airflowService = new AirflowService();
    }

    public function list(): array
    {
        $rows = $this->repo->findAll();
        return array_map([$this, 'normalize'], $rows);
    }

    public function get(string $id): ?array
    {
        $row = $this->repo->findById($id);
        return $row ? $this->normalize($row) : null;
    }

    public function create(array $data): ?array
    {
        $saved = $this->repo->insert($data);
        if (!$saved) {
            return null;
        }
        
        // If connection has schedule enabled, create a schedule record
        if (isset($data['schedule']['enabled']) && $data['schedule']['enabled']) {
            $scheduleData = [
                'connectionId' => $saved['_id'] ?? $saved['id'],
                'connectionName' => $data['name'] ?? 'Unnamed Connection',
                'scheduleType' => $data['schedule']['type'] ?? 'daily',
                'cronExpression' => $data['schedule']['cronExpression'] ?? '0 0 * * *',
                'timezone' => $data['schedule']['timezone'] ?? 'Asia/Ho_Chi_Minh',
                'isActive' => true,
                'createdAt' => date('c'),
            ];
            $insertedSchedule = $this->scheduleRepo->insert($scheduleData);
            
            // Hybrid approach: after successful insert and saveDagId, trigger Airflow sync
            if ($insertedSchedule) {
                $scheduleId = $insertedSchedule['_id'] ?? $insertedSchedule['id'];
                if ($scheduleId) {
                    $dagId = "api_schedule_{$scheduleId}";
                    $this->scheduleRepo->saveDagId($scheduleId, $dagId);
                    
                    // Best-effort: trigger the sync DAG in Airflow so registration happens immediately
                    try {
                        // ask Airflow to run the sync job which reads schedules from MongoDB
                        $this->airflowService->triggerDagRun('api_schedule_sync', ['scheduleId' => $scheduleId]);
                    } catch (\Throwable $e) {
                        // ignore errors - connection creation should not fail because Airflow is unavailable
                        error_log("Airflow sync trigger failed for schedule {$scheduleId}: " . $e->getMessage());
                    }
                }
            }
        }
        
        return $this->normalize($saved);
    }

    public function update(string $id, array $data): bool
    {
        return $this->repo->update($id, $data);
    }

    public function delete(string $id): bool
    {
        return $this->repo->delete($id);
    }

    private function normalize(array $row): array
    {
        $id = $row['_id'] ?? ($row['id'] ?? null);
        return [
            'id' => $id,
            'connectionId' => $row['connectionId'] ?? ($id ?? ''),
            'name' => $row['name'] ?? 'Unnamed',
            'description' => $row['description'] ?? '',
            'baseUrl' => $row['apiConfig']['baseUrl'] ?? ($row['baseUrl'] ?? ''),
            'method' => $row['apiConfig']['method'] ?? ($row['method'] ?? 'GET'),
            'headers' => $row['apiConfig']['headers'] ?? ($row['headers'] ?? []),
            'authType' => $row['apiConfig']['authType'] ?? ($row['authType'] ?? 'none'),
            'parameters' => $row['parameters'] ?? [],
            'fieldMappings' => $row['fieldMappings'] ?? [],
            'tableName' => $row['tableName'] ?? 'api_data',
            'isActive' => (bool)($row['isActive'] ?? true),
            'createdAt' => $row['createdAt'] ?? date('c'),
            'lastRun' => $row['lastRun'] ?? null,
            'totalRuns' => (int)($row['totalRuns'] ?? 0),
            'successRate' => (int)($row['successRate'] ?? 0),
        ];
    }
}
