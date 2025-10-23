<?php
namespace App\Controllers;

use App\Repositories\RunRepository;

class DataController
{
    public function index(): void
    {
        header('Content-Type: application/json');

        // Try to read from runs; if unavailable, return safe mock
        $repo = new RunRepository();
        $runs = [];
        try {
            $runs = $repo->findAll(200);
        } catch (\Throwable $e) {
            $runs = [];
        }

        $totalRuns = count($runs);
        $totalRecords = 0;
        $avgExecutionTime = 0;
        $sumExec = 0;
        $byConnection = [];

        foreach ($runs as $r) {
            $totalRecords += (int)($r['recordsProcessed'] ?? 0);
            $exec = (int)($r['executionTime'] ?? 0);
            $sumExec += $exec;
            $cid = (string)($r['connectionId'] ?? 'unknown');
            if (!isset($byConnection[$cid])) {
                $byConnection[$cid] = [
                    'connectionId' => $cid,
                    'runCount' => 0,
                    'totalRecords' => 0,
                    'avgExecutionTime' => 0,
                    'lastRun' => date('c'),
                ];
            }
            $byConnection[$cid]['runCount'] += 1;
            $byConnection[$cid]['totalRecords'] += (int)($r['recordsProcessed'] ?? 0);
            $byConnection[$cid]['avgExecutionTime'] += $exec;
            $byConnection[$cid]['lastRun'] = $r['startedAt'] ?? date('c');
        }

        foreach ($byConnection as &$c) {
            if ($c['runCount'] > 0) {
                $c['avgExecutionTime'] = (int)round($c['avgExecutionTime'] / $c['runCount']);
            }
        }
        unset($c);

        if ($totalRuns > 0) {
            $avgExecutionTime = (int)round($sumExec / $totalRuns);
        }

        $estimatedDataSize = $totalRecords > 0 ? number_format($totalRecords * 512) . ' bytes' : '0 bytes';

        echo json_encode([
            'summary' => [
                'totalRuns' => $totalRuns,
                'totalRecords' => $totalRecords,
                'avgExecutionTime' => $avgExecutionTime,
                'estimatedDataSize' => $estimatedDataSize,
            ],
            'connectionBreakdown' => array_values($byConnection),
            'data' => [],
        ]);
    }
}
