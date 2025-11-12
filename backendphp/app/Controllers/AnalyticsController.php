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
        
        // Get data processed (sum of all run data sizes)
        $dataProcessed = 0;
        foreach ($allRuns as $run) {
            $dataProcessed += (float)($run['dataSize'] ?? 0);
        }
        $dataProcessedGB = round($dataProcessed / (1024 * 1024 * 1024), 2); // Convert to GB
        
        return [
            'summary' => [
                'totalRuns' => $totalRuns,
                'successRate' => $successRate,
                'avgResponseTime' => (int)$avgResponseTime,
                'dataProcessed' => $dataProcessedGB,
                'activeConnections' => $activeConnections,
                'runsLast24h' => $runsLast24h
            ],
            'successRateHistory' => $this->getSuccessRateHistory(30),
            'responseTimeHistory' => $this->getResponseTimeHistory(30),
            'runsByConnection' => $this->getRunsByConnection($allRuns),
            'statusDistribution' => $this->getStatusDistribution($allRuns),
            'dailyActivity' => $this->getDailyActivity(30, $allRuns),
            'timestamp' => date('c')
        ];
    }

    private function getSuccessRateHistory(int $days = 30): array
    {
        $repo = new RunRepository();
        $allRuns = $repo->findAll(10000);

        $dailyStats = [];

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

        return $result;
    }

    private function getResponseTimeHistory(int $days = 30): array
    {
        $repo = new RunRepository();
        $allRuns = $repo->findAll(10000);

        $dailyStats = [];

        // Initialize daily stats
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $dailyStats[$date] = [
                'date' => $date,
                'responseTimes' => [],
                'avgResponseTime' => 0
            ];
        }

        // Aggregate response times by date
        foreach ($allRuns as $run) {
            $runDate = isset($run['startedAt']) ? date('Y-m-d', strtotime($run['startedAt'])) : null;
            if ($runDate && isset($dailyStats[$runDate]) && isset($run['responseTime'])) {
                $dailyStats[$runDate]['responseTimes'][] = (float)$run['responseTime'];
            }
        }

        // Calculate average response times
        $result = [];
        foreach ($dailyStats as $stat) {
            $avgResponseTime = count($stat['responseTimes']) > 0
                ? round(array_sum($stat['responseTimes']) / count($stat['responseTimes']), 2)
                : 0;
            $result[] = [
                'date' => $stat['date'],
                'responseTime' => $avgResponseTime
            ];
        }

        return $result;
    }

    private function getRunsByConnection(array $allRuns): array
    {
        $connectionRepo = new \App\Repositories\ConnectionRepository();
        $connections = $connectionRepo->findAll(1000);
        
        // Create a mapping of connectionId => connectionName
        $connectionMap = [];
        foreach ($connections as $conn) {
            $connId = (string)($conn['_id'] ?? '');
            $connName = $conn['name'] ?? 'Unknown';
            if ($connId) {
                $connectionMap[$connId] = $connName;
            }
        }

        $connectionStats = [];

        foreach ($allRuns as $run) {
            $connId = (string)($run['connectionId'] ?? '');
            $connName = isset($connectionMap[$connId]) ? $connectionMap[$connId] : 'Unknown';
            
            if (!isset($connectionStats[$connName])) {
                $connectionStats[$connName] = 0;
            }
            $connectionStats[$connName]++;
        }

        $result = [];
        foreach ($connectionStats as $name => $count) {
            $result[] = [
                'name' => $name,
                'value' => $count
            ];
        }

        // Sort by value descending and limit to top 10
        usort($result, function($a, $b) {
            return $b['value'] <=> $a['value'];
        });

        return array_slice($result, 0, 10);
    }

    private function getStatusDistribution(array $allRuns): array
    {
        $statusStats = [
            'success' => 0,
            'failed' => 0,
            'running' => 0,
            'pending' => 0
        ];

        foreach ($allRuns as $run) {
            $status = strtolower((string)($run['status'] ?? 'pending'));
            if ($status === 'success' || $status === 'completed') {
                $statusStats['success']++;
            } elseif ($status === 'failed' || $status === 'error') {
                $statusStats['failed']++;
            } elseif ($status === 'running') {
                $statusStats['running']++;
            } else {
                $statusStats['pending']++;
            }
        }

        $result = [];
        foreach ($statusStats as $status => $count) {
            if ($count > 0) {
                $result[] = [
                    'name' => ucfirst($status),
                    'value' => $count
                ];
            }
        }

        return $result;
    }

    private function getDailyActivity(int $days = 30, array $allRuns): array
    {
        $dailyActivity = [];

        // Initialize daily stats
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $dailyActivity[$date] = [
                'date' => $date,
                'runs' => 0
            ];
        }

        // Count runs by date
        foreach ($allRuns as $run) {
            $runDate = isset($run['startedAt']) ? date('Y-m-d', strtotime($run['startedAt'])) : null;
            if ($runDate && isset($dailyActivity[$runDate])) {
                $dailyActivity[$runDate]['runs']++;
            }
        }

        return array_values($dailyActivity);
    }
}
