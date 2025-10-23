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
            $items[] = [
                'id' => $id,
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
}
