<?php
namespace App\Services;

use App\Repositories\ConnectionRepository;
use App\Repositories\ScheduleRepository;
use App\Repositories\RunRepository;
use App\Repositories\ParameterModeRepository;
use App\Services\ScheduleCreationService;
use App\Services\UnitOfWorkInterface;
use App\Config\AppConfig;

class ConnectionService extends BaseService
{
    private ConnectionRepository $repo;
    private ScheduleRepository $scheduleRepo;
    private RunRepository $runRepo;
    private ParameterModeRepository $parameterModeRepo;
    private ScheduleCreationService $scheduleCreationService;
    private UnitOfWorkInterface $unitOfWork;

    public function __construct(?UnitOfWorkInterface $unitOfWork = null)
    {
        $this->repo = new ConnectionRepository();
        $this->scheduleRepo = new ScheduleRepository();
        $this->runRepo = new RunRepository();
        $this->parameterModeRepo = new ParameterModeRepository();
        $this->scheduleCreationService = new ScheduleCreationService();
        $this->unitOfWork = $unitOfWork ?? new MongoUnitOfWork();
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
        return $this->unitOfWork->executeInTransaction(function ($uow) use ($data) {
            // Insert connection
            $saved = $this->repo->insert($data);
            if (!$saved) {
                throw new \RuntimeException('Failed to create connection');
            }

            // If connection has schedule enabled, create a schedule record
            if (isset($data['schedule']['enabled']) && $data['schedule']['enabled']) {
                $scheduleResult = $this->scheduleCreationService->createScheduleForConnection(
                    $data['schedule'],
                    $saved['_id'] ?? $saved['id'],
                    $data['name'] ?? 'Unnamed Connection'
                );

                if (!$scheduleResult) {
                    throw new \RuntimeException('Failed to create schedule for connection');
                }
            }

            return $this->normalize($saved);
        });
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
        if (!$this->deleteCascade($schedules, 'schedule')) {
            $success = false;
        }

        // 2. Delete related runs
        $runs = $this->runRepo->findByConnectionId($connectionId);
        if (!$this->deleteCascade($runs, 'run')) {
            $success = false;
        }

        // 3. Delete related parameter modes
        $parameterModes = $this->parameterModeRepo->findByConnectionId($connectionId);
        if (!$this->deleteCascade($parameterModes, 'parameter mode')) {
            $success = false;
        }

        // 4. Finally, delete the connection itself
        if (!$this->deleteEntity($id)) {
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
                if ((is_array($header) || is_object($header)) && (isset($header['name']) || (is_object($header) && property_exists($header, 'name'))) && (isset($header['value']) || (is_object($header) && property_exists($header, 'value')))) {
                    // Convert from [{name: 'header1', value: 'value1'}] or objects format
                    $name = is_array($header) ? $header['name'] : $header->name;
                    $value = is_array($header) ? $header['value'] : $header->value;
                    $normalizedHeaders[$name] = is_scalar($value) ? $value : json_encode($value);
                    $isObjectFormat = true;
                } elseif ((is_array($header) || is_object($header)) && (isset($header['key']) || (is_object($header) && property_exists($header, 'key'))) && (isset($header['value']) || (is_object($header) && property_exists($header, 'value')))) {
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

    /**
     * Delete a single entity by ID
     *
     * @param string $id Entity ID to delete
     * @return bool True if delete succeeded
     */
    protected function deleteEntity(string $id): bool
    {
        return $this->repo->delete($id);
    }
}
