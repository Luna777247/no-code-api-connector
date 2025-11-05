<?php
namespace App\Services;

use App\Repositories\ConnectionRepository;
use App\Repositories\ScheduleRepository;
use App\Repositories\RunRepository;
use App\Repositories\ParameterModeRepository;
use App\Services\AirflowService;

class ConnectionService
{
    private ConnectionRepository $repo;
    private ScheduleRepository $scheduleRepo;
    private RunRepository $runRepo;
    private ParameterModeRepository $parameterModeRepo;
    private AirflowService $airflowService;

    public function __construct()
    {
        $this->repo = new ConnectionRepository();
        $this->scheduleRepo = new ScheduleRepository();
        $this->runRepo = new RunRepository();
        $this->parameterModeRepo = new ParameterModeRepository();
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
        // Get the connection to find its connectionId for cascading deletes
        $connection = $this->repo->findById($id);
        if (!$connection) {
            return false;
        }

        $connectionId = $connection['connectionId'] ?? null;
        if (!$connectionId) {
            // If no connectionId, just delete the connection
            return $this->repo->delete($id);
        }

        // Start cascading deletes
        $success = true;

        // 1. Delete related schedules
        $schedules = $this->scheduleRepo->findByConnectionId($connectionId);
        foreach ($schedules as $schedule) {
            $scheduleId = $schedule['_id'] ?? $schedule['id'];
            if ($scheduleId && !$this->scheduleRepo->delete($scheduleId)) {
                error_log("Failed to delete schedule {$scheduleId} for connection {$connectionId}");
                $success = false;
            }
        }

        // 2. Delete related runs
        $runs = $this->runRepo->findByConnectionId($connectionId);
        foreach ($runs as $run) {
            $runId = $run['_id'] ?? $run['id'];
            if ($runId && !$this->runRepo->delete($runId)) {
                error_log("Failed to delete run {$runId} for connection {$connectionId}");
                $success = false;
            }
        }

        // 3. Delete related parameter modes
        $parameterModes = $this->parameterModeRepo->findByConnectionId($connectionId);
        foreach ($parameterModes as $paramMode) {
            $paramModeId = $paramMode['_id'] ?? $paramMode['id'];
            if ($paramModeId && !$this->parameterModeRepo->delete($paramModeId)) {
                error_log("Failed to delete parameter mode {$paramModeId} for connection {$connectionId}");
                $success = false;
            }
        }

        // 4. Finally, delete the connection itself
        if (!$this->repo->delete($id)) {
            error_log("Failed to delete connection {$id}");
            $success = false;
        }

        return $success;
    }

    public function normalize(array $row): array
    {
        $id = $row['_id'] ?? ($row['id'] ?? null);

        // Normalize headers: convert array of objects to object format
        $headers = $row['apiConfig']['headers'] ?? ($row['headers'] ?? []);
        if (is_array($headers)) {
            $normalizedHeaders = [];
            $isObjectFormat = false;

            foreach ($headers as $header) {
                if ((is_array($header) || is_object($header)) && (isset($header['name']) || property_exists($header, 'name')) && (isset($header['value']) || property_exists($header, 'value'))) {
                    // Convert from [{name: 'header1', value: 'value1'}] or objects format
                    $name = is_array($header) ? $header['name'] : $header->name;
                    $value = is_array($header) ? $header['value'] : $header->value;
                    $normalizedHeaders[$name] = is_scalar($value) ? $value : json_encode($value);
                    $isObjectFormat = true;
                } elseif ((is_array($header) || is_object($header)) && (isset($header['key']) || property_exists($header, 'key')) && (isset($header['value']) || property_exists($header, 'value'))) {
                    // Convert from [{key: 'header1', value: 'value1'}] or objects format
                    $key = is_array($header) ? $header['key'] : $header->key;
                    $value = is_array($header) ? $header['value'] : $header->value;
                    $normalizedHeaders[$key] = is_scalar($value) ? $value : json_encode($value);
                    $isObjectFormat = true;
                } elseif (is_array($header) && count($header) === 1) {
                    // Convert from [{ "Header-Name": "value" }] format
                    $key = key($header);
                    $value = $header[$key];
                    $normalizedHeaders[$key] = is_scalar($value) ? $value : json_encode($value);
                    $isObjectFormat = true;
                } elseif (is_string($header) && strpos($header, ':') !== false) {
                    // Convert from ['Name: Value'] format
                    [$name, $value] = explode(':', $header, 2);
                    $normalizedHeaders[trim($name)] = trim($value);
                    $isObjectFormat = true;
                }
            }

            // If we successfully converted from object format, use normalized headers
            if ($isObjectFormat && !empty($normalizedHeaders)) {
                $headers = $normalizedHeaders;
            }
            // If headers is already key-value object format, normalize values
            elseif (is_array($headers) && !empty($headers) && !isset($headers[0])) {
                // It's already an object format, ensure values are strings
                foreach ($headers as $key => $value) {
                    $headers[$key] = is_scalar($value) ? $value : json_encode($value);
                }
            }
            // If still array, force convert to object with indices as keys
            elseif (is_array($headers)) {
                $objHeaders = [];
                foreach ($headers as $index => $value) {
                    if (is_array($value) && isset($value['name']) && isset($value['value'])) {
                        $objHeaders[$value['name']] = is_scalar($value['value']) ? $value['value'] : json_encode($value['value']);
                    } elseif (is_array($value) && isset($value['key']) && isset($value['value'])) {
                        $objHeaders[$value['key']] = is_scalar($value['value']) ? $value['value'] : json_encode($value['value']);
                    } elseif (is_string($value)) {
                        $objHeaders['Header_' . $index] = $value;
                    } else {
                        $objHeaders['Header_' . $index] = json_encode($value);
                    }
                }
                $headers = $objHeaders;
            }
        }

        return [
            'id' => $id,
            'connectionId' => $row['connectionId'] ?? ($id ?? ''),
            'name' => $row['name'] ?? 'Unnamed',
            'description' => $row['description'] ?? '',
            'baseUrl' => $row['apiConfig']['baseUrl'] ?? ($row['baseUrl'] ?? ''),
            'method' => $row['apiConfig']['method'] ?? ($row['method'] ?? 'GET'),
            'headers' => $headers,
            'authType' => $row['apiConfig']['authType'] ?? ($row['authType'] ?? 'none'),
            'authConfig' => $row['apiConfig']['authConfig'] ?? ($row['authConfig'] ?? []),
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
