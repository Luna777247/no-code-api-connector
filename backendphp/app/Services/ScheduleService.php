<?php
namespace App\Services;

use App\Repositories\ScheduleRepository;
use App\Repositories\RunRepository;
use App\Repositories\ConnectionRepository;
use App\Services\ValidationService;
use App\Config\AppConfig;
use DateTime;

class ScheduleService extends BaseService
{
    private ScheduleRepository $repo;
    private RunRepository $runRepo;
    private ConnectionRepository $connectionRepo;
    private ValidationService $validator;

    public function __construct()
    {
        $this->repo = new ScheduleRepository();
        $this->runRepo = new RunRepository();
        $this->connectionRepo = new ConnectionRepository();
        $this->validator = new ValidationService();
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
            $dagId = $row['dagId'] ?? AppConfig::getDagPrefix() . "_{$id}";

            // Calculate next run time if not set and schedule is active
            $nextRun = $row['nextRun'] ?? null;
            if ($nextRun === null && ($row['isActive'] ?? false)) {
                $cronExpr = $row['cronExpression'] ?? AppConfig::getDefaultCronExpression();
                $timezone = $row['timezone'] ?? AppConfig::getDefaultTimezone();
                $nextRun = $this->calculateNextRunTime($cronExpr, $timezone);
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
                'cronExpression' => $row['cronExpression'] ?? AppConfig::getDefaultCronExpression(),
                'timezone' => $row['timezone'] ?? AppConfig::getDefaultTimezone(),
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
        // Validate input data
        $validatedData = $this->validator->validateScheduleData($input);

        // Validate that connection exists
        $this->validateConnectionExists($validatedData['connectionId']);

        $data = array_merge($validatedData, [
            'nextRun' => null,
            'lastRun' => null,
            'lastStatus' => 'pending',
            'totalRuns' => 0,
        ]);

        // Calculate next run time if active
        if ($data['isActive']) {
            $data['nextRun'] = $this->calculateNextRunTime($data['cronExpression'], $data['timezone']);
        }

        $result = $this->repo->insert($data);
        if ($result) {
            $result['id'] = $result['_id'];
            unset($result['_id']);
        }
        return $result;
    }

    /**
     * Validate that a connection exists
     *
     * @param string $connectionId
     * @throws ValidationException
     */
    private function validateConnectionExists(string $connectionId): void
    {
        $connection = $this->connectionRepo->findById($connectionId);
        if (!$connection) {
            throw new \App\Exceptions\ValidationException(
                ['connectionId' => 'Connection does not exist'],
                "Connection with ID '{$connectionId}' does not exist"
            );
        }
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
        if (isset($input['timezone'])) {
            $data['timezone'] = $input['timezone'];
        }

        // If isActive, cronExpression, or timezone changed, recalculate next run time
        $shouldRecalculateNextRun = isset($input['isActive']) || isset($input['cronExpression']) || isset($input['timezone']);
        if ($shouldRecalculateNextRun) {
            // Get current schedule to check if it will be active and get timezone
            $currentSchedule = $this->repo->findById($id);
            $willBeActive = isset($input['isActive']) ? (bool)$input['isActive'] : ($currentSchedule['isActive'] ?? false);
            $cronExpr = $input['cronExpression'] ?? ($currentSchedule['cronExpression'] ?? AppConfig::getDefaultCronExpression());
            $timezone = $input['timezone'] ?? ($currentSchedule['timezone'] ?? AppConfig::getDefaultTimezone());

            if ($willBeActive) {
                $data['nextRun'] = $this->calculateNextRunTime($cronExpr, $timezone);
            } else {
                $data['nextRun'] = null;
            }
        }

        return $this->repo->update($id, $data);
    }

    public function calculateNextRunTime(string $cronExpression, string $timezone = 'UTC'): ?string
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

            $now = new DateTime('now', new \DateTimeZone($timezone));
            $nextRun = clone $now;

            // Handle different cron patterns
            if ($cronExpression === '0 15 * * *') {
                // Daily at 3:15 PM in the specified timezone
                $nextRun->setTime(15, 0, 0);
                if ($nextRun <= $now) {
                    $nextRun->modify('+1 day');
                }
            } elseif ($cronExpression === AppConfig::getDefaultCronExpression()) {
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
            } elseif ($minute === '0' && $day === '1' && $month === '*' && $weekday === '*') {
                // Monthly on the 1st at specified hour (e.g., 0 01 1 * *)
                $nextRun->setTime((int)$hour, (int)$minute, 0);
                $nextRun->setDate($nextRun->format('Y'), $nextRun->format('m'), 1); // Set to 1st of current month

                // If we're already past the 1st of this month, move to next month
                if ($nextRun <= $now) {
                    $nextRun->modify('first day of next month');
                    $nextRun->setTime((int)$hour, (int)$minute, 0);
                }
            } else {
                // For other patterns, add 1 hour as fallback
                $nextRun->modify('+1 hour');
            }

            // Return in UTC for storage, but calculated in the specified timezone
            $nextRun->setTimezone(new \DateTimeZone('UTC'));
            return $nextRun->format('c'); // ISO 8601 format in UTC
        } catch (\Exception $e) {
            return null;
        }
    }

    public function deleteSchedule(string $id): bool
    {
        // Get the schedule to find its ID for cascading deletes
        $schedule = $this->repo->findById($id);
        if (!$schedule) {
            return false;
        }

        $scheduleId = $schedule['_id'] ?? $schedule['id'];
        if (!$scheduleId) {
            // If no schedule ID, just delete the schedule
            return $this->deleteEntity($id);
        }

        // Start cascading deletes
        $success = true;

        // 1. Delete related runs
        $runs = $this->runRepo->findByScheduleId($scheduleId);
        if (!$this->deleteCascade($runs, 'run')) {
            $success = false;
        }

        // 2. Finally, delete the schedule itself
        if (!$this->deleteEntity($id)) {
            error_log("Failed to delete schedule {$id}");
            $success = false;
        }

        return $success;
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
            'cronExpression' => $row['cronExpression'] ?? AppConfig::getDefaultCronExpression(),
            'timezone' => $row['timezone'] ?? AppConfig::getDefaultTimezone(),
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
