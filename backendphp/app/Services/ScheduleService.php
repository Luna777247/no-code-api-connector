<?php
namespace App\Services;

use App\Repositories\ScheduleRepository;

class ScheduleService
{
    private ScheduleRepository $repo;

    public function __construct()
    {
        $this->repo = new ScheduleRepository();
    }

    public function listSchedules(): array
    {
        $rows = $this->repo->findAll();

        // Normalize fields for FE
        $items = [];
        foreach ($rows as $row) {
            $id = $row['_id'] ?? ($row['id'] ?? null);
            if (is_object($id) && method_exists($id, '__toString')) {
                $id = (string)$id;
            }
            $dagId = $row['dagId'] ?? "api_schedule_{$id}";
            
            $items[] = [
                'id' => $id,
                'dagId' => $dagId,
                'connectionName' => $row['connectionName'] ?? 'Unknown',
                'scheduleType' => $row['scheduleType'] ?? 'custom',
                'cronExpression' => $row['cronExpression'] ?? '* * * * *',
                'isActive' => (bool)($row['isActive'] ?? false),
                'nextRun' => $row['nextRun'] ?? null,
                'lastRun' => $row['lastRun'] ?? null,
                'lastStatus' => $row['lastStatus'] ?? 'pending',
                'totalRuns' => (int)($row['totalRuns'] ?? 0),
            ];
        }
        return $items;
    }

    public function createSchedule(array $input): ?array
    {
        $data = [
            'connectionId' => $input['connectionId'] ?? '',
            'connectionName' => $input['connectionName'] ?? '',
            'description' => $input['description'] ?? '',
            'scheduleType' => $input['scheduleType'] ?? 'cron',
            'cronExpression' => $input['cronExpression'] ?? '* * * * *',
            'isActive' => (bool)($input['isActive'] ?? true),
            'nextRun' => null,
            'lastRun' => null,
            'lastStatus' => 'pending',
            'totalRuns' => 0,
        ];

        $result = $this->repo->insert($data);
        if ($result) {
            $result['id'] = $result['_id'];
            unset($result['_id']);
        }
        return $result;
    }

    public function updateSchedule(string $id, array $input): bool
    {
        $data = [];
        if (isset($input['isActive'])) {
            $data['isActive'] = (bool)$input['isActive'];
        }
        if (isset($input['cronExpression'])) {
            $data['cronExpression'] = $input['cronExpression'];
        }
        if (isset($input['connectionName'])) {
            $data['connectionName'] = $input['connectionName'];
        }
        if (isset($input['description'])) {
            $data['description'] = $input['description'];
        }
        if (isset($input['scheduleType'])) {
            $data['scheduleType'] = $input['scheduleType'];
        }

        return $this->repo->update($id, $data);
    }

    public function deleteSchedule(string $id): bool
    {
        return $this->repo->delete($id);
    }

    public function getSchedule(string $id): ?array
    {
        $row = $this->repo->findById($id);
        if (!$row) {
            return null;
        }

        $scheduleId = $row['_id'] ?? ($row['id'] ?? null);
        if (is_object($scheduleId) && method_exists($scheduleId, '__toString')) {
            $scheduleId = (string)$scheduleId;
        }
        $dagId = $row['dagId'] ?? "api_schedule_{$scheduleId}";

        return [
            'id' => $scheduleId,
            'dagId' => $dagId,
            'connectionName' => $row['connectionName'] ?? 'Unknown',
            'scheduleType' => $row['scheduleType'] ?? 'custom',
            'cronExpression' => $row['cronExpression'] ?? '* * * * *',
            'isActive' => (bool)($row['isActive'] ?? false),
            'nextRun' => $row['nextRun'] ?? null,
            'lastRun' => $row['lastRun'] ?? null,
            'lastStatus' => $row['lastStatus'] ?? 'pending',
            'totalRuns' => (int)($row['totalRuns'] ?? 0),
            'description' => $row['description'] ?? '',
        ];
    }

    public function getScheduleHistory(string $scheduleId, int $limit = 50, int $offset = 0): array
    {
        // Get runs associated with this schedule from the runs collection
        $runRepo = new \App\Repositories\RunRepository();
        $runs = $runRepo->findByScheduleId($scheduleId, $limit, $offset);

        // Normalize the run data for the response
        $history = [];
        foreach ($runs as $run) {
            $history[] = [
                'runId' => $run['id'] ?? '',
                'status' => $run['status'] ?? 'unknown',
                'startTime' => $run['startedAt'] ?? $run['createdAt'] ?? null,
                'endTime' => $run['endedAt'] ?? null,
                'duration' => $run['duration'] ?? null,
                'recordsExtracted' => $run['recordsExtracted'] ?? null,
                'errorMessage' => $run['errorMessage'] ?? null,
            ];
        }

        return $history;
    }
}
