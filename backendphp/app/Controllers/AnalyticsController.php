<?php
namespace App\Controllers;

use App\Repositories\RunRepository;

class AnalyticsController
{
    public function successRateHistory(): array
    {
        $days = isset($_GET['days']) ? (int)$_GET['days'] : 7;
        $days = max(1, min(60, $days));

        $repo = new RunRepository();
        $allRuns = $repo->findAll(10000); // Get more runs for better statistics

        $dailyStats = [];
        $now = time();

        // Initialize daily stats for the requested period
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $dailyStats[$date] = [
                'date' => $date,
                'totalRuns' => 0,
                'successfulRuns' => 0,
                'successRate' => 0
            ];
        }

        // Aggregate runs by date
        foreach ($allRuns as $run) {
            $runDate = isset($run['startedAt']) ? date('Y-m-d', strtotime($run['startedAt'])) : null;
            if ($runDate && isset($dailyStats[$runDate])) {
                $dailyStats[$runDate]['totalRuns']++;
                $status = strtolower((string)($run['status'] ?? 'success'));
                if ($status === 'success' || $status === 'completed') {
                    $dailyStats[$runDate]['successfulRuns']++;
                }
            }
        }

        // Calculate success rates
        $result = [];
        foreach ($dailyStats as $stat) {
            $successRate = $stat['totalRuns'] > 0
                ? round(($stat['successfulRuns'] / $stat['totalRuns']) * 100, 2)
                : 0;
            $result[] = [
                'date' => $stat['date'],
                'successRate' => $successRate
            ];
        }

        return ['data' => $result];
    }
}
