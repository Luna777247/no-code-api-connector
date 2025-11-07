<?php
namespace App\Controllers;

use App\Repositories\RunRepository;

class AnalyticsController
{
    public function summary(): array
    {
        $runRepo = new RunRepository();
        $connectionRepo = new \App\Repositories\ConnectionRepository();
        
        // Get all runs for statistics
        $allRuns = $runRepo->findAll(10000);
        
        // Calculate total runs
        $totalRuns = count($allRuns);
        
        // Calculate success rate (last 30 days)
        $thirtyDaysAgo = strtotime('-30 days');
        $recentRuns = array_filter($allRuns, function($run) use ($thirtyDaysAgo) {
            $runTime = isset($run['startedAt']) ? strtotime($run['startedAt']) : 0;
            return $runTime >= $thirtyDaysAgo;
        });
        
        $successfulRuns = array_filter($recentRuns, function($run) {
            $status = strtolower((string)($run['status'] ?? 'success'));
            return $status === 'success' || $status === 'completed';
        });
        
        $successRate = count($recentRuns) > 0 
            ? round((count($successfulRuns) / count($recentRuns)) * 100, 2)
            : 0;
        
        // Calculate average response time
        $responseTimes = array_filter(array_column($allRuns, 'responseTime'));
        $avgResponseTime = count($responseTimes) > 0 
            ? round(array_sum($responseTimes) / count($responseTimes), 2)
            : 0;
        
        // Get connection count
        $connections = $connectionRepo->findAll();
        $activeConnections = count(array_filter($connections, function($conn) {
            return ($conn['isActive'] ?? true);
        }));
        
        // Get runs in last 24 hours
        $oneDayAgo = strtotime('-1 day');
        $runsLast24h = count(array_filter($allRuns, function($run) use ($oneDayAgo) {
            $runTime = isset($run['startedAt']) ? strtotime($run['startedAt']) : 0;
            return $runTime >= $oneDayAgo;
        }));
        
        return [
            'summary' => [
                'totalRuns' => $totalRuns,
                'successRate' => $successRate,
                'avgResponseTime' => $avgResponseTime,
                'activeConnections' => $activeConnections,
                'runsLast24h' => $runsLast24h
            ],
            'timestamp' => date('c')
        ];
    }

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
