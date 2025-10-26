<?php
namespace App\Services;

use App\Repositories\ScheduleRepository;
use DateTime;

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

            // Calculate next run time if not set and schedule is active
            $nextRun = $row['nextRun'] ?? null;
            if ($nextRun === null && ($row['isActive'] ?? false)) {
                $cronExpr = $row['cronExpression'] ?? '* * * * *';
                $nextRun = $this->calculateNextRunTime($cronExpr);
                // Optionally update the database with the calculated next run time
                if ($nextRun) {
                    $this->repo->update($id, ['nextRun' => $nextRun]);
                }
            }
            
            $items[] = [
                'id' => $id,
                'dagId' => $dagId,
                'connectionName' => $row['connectionName'] ?? 'Unknown',
                'scheduleType' => $row['scheduleType'] ?? 'custom',
                'cronExpression' => $row['cronExpression'] ?? '* * * * *',
                'isActive' => (bool)($row['isActive'] ?? false),
                'nextRun' => $nextRun,
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

        // Calculate next run time if active
        if ($data['isActive']) {
            $data['nextRun'] = $this->calculateNextRunTime($data['cronExpression']);
        }

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

        // If isActive or cronExpression changed, recalculate next run time
        $shouldRecalculateNextRun = isset($input['isActive']) || isset($input['cronExpression']);
        if ($shouldRecalculateNextRun) {
            // Get current schedule to check if it will be active
            $currentSchedule = $this->repo->findById($id);
            $willBeActive = isset($input['isActive']) ? (bool)$input['isActive'] : ($currentSchedule['isActive'] ?? false);
            $cronExpr = $input['cronExpression'] ?? ($currentSchedule['cronExpression'] ?? '* * * * *');

            if ($willBeActive) {
                $data['nextRun'] = $this->calculateNextRunTime($cronExpr);
            } else {
                $data['nextRun'] = null;
            }
        }

        return $this->repo->update($id, $data);
    }

    private function calculateNextRunTime(string $cronExpression): ?string
    {
        try {
            // Parse cron expression: minute hour day month weekday
            $parts = explode(' ', $cronExpression);
            if (count($parts) < 5) {
                return null;
            }

            $minute = $parts[0];
            $hour = $parts[1];
            $day = $parts[2];
            $month = $parts[3];
            $weekday = $parts[4];

            $now = new DateTime();
            $nextRun = clone $now;

            // Handle different cron patterns
            if ($cronExpression === '0 15 * * *') {
                // Daily at 3:15 PM
                $nextRun->setTime(15, 0, 0);
                if ($nextRun <= $now) {
                    $nextRun->modify('+1 day');
                }
            } elseif ($cronExpression === '* * * * *') {
                // Every minute
                $nextRun->modify('+1 minute');
            } elseif (strpos($cronExpression, '*/') === 0) {
                // Every N minutes/hours (e.g., */4 * * * *)
                $interval = (int)substr($minute, 2);
                $nextRun->modify("+{$interval} minutes");
            } elseif ($minute === '0' && strpos($hour, '*/') === 0) {
                // Every N hours (e.g., 0 */4 * * *)
                $interval = (int)substr($hour, 2);
                $nextRun->setTime($nextRun->format('H'), 0, 0);
                $nextRun->modify("+{$interval} hours");
            } else {
                // For other patterns, add 1 hour as fallback
                $nextRun->modify('+1 hour');
            }

            return $nextRun->format('c'); // ISO 8601 format
        } catch (\Exception $e) {
            return null;
        }
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
