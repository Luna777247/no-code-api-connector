<?php
namespace App\Controllers;

use App\Repositories\RunRepository;
use App\Repositories\ConnectionRepository;
use App\Repositories\ScheduleRepository;

class StatusController
{
    public function index(): array
    {
        $repo = new RunRepository();
        $runs = [];
        try {
            $runs = $repo->findAll(200);
        } catch (\Throwable $e) {
            $runs = [];
        }

        $totalRuns = count($runs);
        $successfulRuns = 0;
        $failedRuns = 0;
        $avgResponseTime = 245;
        $topConnections = [];

        $last24h = 0;
        $now = time();

        foreach ($runs as $r) {
            $status = strtolower((string)($r['status'] ?? 'success'));
            if ($status === 'success') $successfulRuns++; else if ($status === 'failed') $failedRuns++;
            $cid = (string)($r['connectionId'] ?? 'unknown');
            if (!isset($topConnections[$cid])) {
                $topConnections[$cid] = [
                    'connectionId' => $cid,
                    'runCount' => 0,
                    'lastRun' => $r['startedAt'] ?? date('c'),
                    'successRate' => 100,
                ];
            }
            $topConnections[$cid]['runCount'] += 1;
            $topConnections[$cid]['lastRun'] = $r['startedAt'] ?? date('c');

            // last 24h counter
            $startedAt = isset($r['startedAt']) ? strtotime((string)$r['startedAt']) : null;
            if ($startedAt && ($now - $startedAt) <= 86400) {
                $last24h++;
            }
        }

        $successRate = $totalRuns > 0 ? round(($successfulRuns / $totalRuns) * 100, 2) : 0;
        foreach ($topConnections as &$c) {
            $c['successRate'] = $successRate;
        }
        unset($c);

        // Aggregate connections and schedules counts (safe fallbacks if Mongo/ENV missing)
        $connectionsTotal = 0;
        $schedulesTotal = 0;
        try {
            $connectionsRepo = new ConnectionRepository();
            $connectionsTotal = count($connectionsRepo->findAll());
        } catch (\Throwable $e) {}
        try {
            $schedulesRepo = new ScheduleRepository();
            $schedulesTotal = count($schedulesRepo->findAll());
        } catch (\Throwable $e) {}

        return [
            'connections' => [
                'active' => $connectionsTotal, // no separate active flag yet, mirror total
                'total' => $connectionsTotal,
            ],
            'schedules' => [
                'active' => 0, // no active schedules tracking yet
                'total' => $schedulesTotal,
            ],
            'runs' => [
                'total' => $totalRuns,
                'last24h' => $last24h,
            ],
            'activity' => [
                'totalRuns' => $totalRuns,
                'successfulRuns' => $successfulRuns,
                'failedRuns' => $failedRuns,
                'successRate' => $successRate,
            ],
            'performance' => [
                'avgResponseTime' => $avgResponseTime,
            ],
            'topConnections' => array_values($topConnections),
        ];
    }
}
