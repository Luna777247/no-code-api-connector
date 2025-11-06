<?php
namespace App\Controllers;

use App\Repositories\RunRepository;
use App\Repositories\ConnectionRepository;

class DataController
{
    private ConnectionRepository $connectionRepo;

    public function __construct()
    {
        $this->connectionRepo = new ConnectionRepository();
    }
    public function index(): array
    {
        // Try to read from runs; if unavailable, return safe mock
        $repo = new RunRepository();
        $connectionRepo = new ConnectionRepository();
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

        $connectionBreakdown = $this->enrichWithConnectionNames(array_values($byConnection));

        // Get sample data from recent runs
        $sampleData = $this->getSampleDataFromRuns($runs);

        return [
            'summary' => [
                'totalRuns' => $totalRuns,
                'totalRecords' => $totalRecords,
                'avgExecutionTime' => $avgExecutionTime,
                'estimatedDataSize' => $estimatedDataSize,
            ],
            'connectionBreakdown' => $connectionBreakdown,
            'data' => $sampleData,
        ];
    }

    private function enrichWithConnectionNames(array $connections): array
    {
        $connectionNames = [];
        
        foreach ($connections as &$connection) {
            $connectionId = $connection['connectionId'] ?? '';
            if ($connectionId && $connectionId !== 'unknown' && !isset($connectionNames[$connectionId])) {
                try {
                    $conn = $this->connectionRepo->findByConnectionId($connectionId);
                    $connectionNames[$connectionId] = $conn['name'] ?? 'Unknown Connection';
                } catch (\Throwable $e) {
                    $connectionNames[$connectionId] = 'Unknown Connection';
                }
            }
            $connection['connectionName'] = $connectionNames[$connectionId] ?? 'Unknown Connection';
        }
        
        return $connections;
    }

    private function getSampleDataFromRuns(array $runs): array
    {
        $sampleData = [];
        $maxSamples = 10; // Limit to 10 samples
        $count = 0;

        foreach ($runs as $run) {
            if ($count >= $maxSamples) {
                break;
            }

            // Check if run has response data
            if (isset($run['response']) && is_array($run['response']) && isset($run['response']['data'])) {
                $responseData = $run['response']['data'];

                if (is_array($responseData) && count($responseData) > 0) {
                    // Take first record from this run as sample
                    $sampleRecord = @$responseData[0];  // Suppress warnings
                    if (is_array($sampleRecord)) {
                        $sampleData[] = [
                            'runId' => $run['id'] ?? '',
                            'connectionId' => $run['connectionId'] ?? '',
                            'connectionName' => $run['connectionName'] ?? 'Unknown',
                            'extractedAt' => $run['startedAt'] ?? $run['createdAt'] ?? date('c'),
                            'data' => $sampleRecord,
                            'recordCount' => count($responseData)
                        ];
                        $count++;
                    }
                }
            }
        }

        return $sampleData;
    }
}
