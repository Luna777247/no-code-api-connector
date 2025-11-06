<?php
// Cleanup test schedule
require_once 'vendor/autoload.php';

$repo = new \App\Repositories\ScheduleRepository();
$schedules = $repo->findAll();

foreach ($schedules as $schedule) {
    if (strpos($schedule['description'] ?? '', 'Test schedule to verify statistics update') !== false) {
        echo 'Deleting test schedule: ' . $schedule['_id'] . PHP_EOL;
        $repo->delete($schedule['_id']);
    }
}

echo 'Cleanup completed.' . PHP_EOL;