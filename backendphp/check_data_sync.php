<?php
require 'vendor/autoload.php';
require 'app/Repositories/RunRepository.php';
require 'app/Config/Database.php';

$repo = new App\Repositories\RunRepository();
$runs = $repo->findAll(200);

echo "=== REAL DATABASE DATA ===\n";
echo "Total runs: " . count($runs) . "\n\n";

$totalRecords = 0;
$byConnection = [];
$sumExec = 0;

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

echo "Total records extracted: " . $totalRecords . "\n";
echo "Avg execution time: " . (count($runs) > 0 ? round($sumExec / count($runs)) : 0) . "ms\n\n";

echo "=== BY CONNECTION ===\n";
foreach ($byConnection as $cid => $data) {
    $avgExec = $data['runCount'] > 0 ? round($data['avgExecutionTime'] / $data['runCount']) : 0;
    echo $cid . ":\n";
    echo "  Runs: " . $data['runCount'] . "\n";
    echo "  Records: " . $data['totalRecords'] . "\n";
    echo "  Avg Execution: " . $avgExec . "ms\n";
    echo "  Last Run: " . $data['lastRun'] . "\n\n";
}

echo "\n=== COMPARING WITH FRONTEND DISPLAYED DATA ===\n";
echo "Frontend shows:\n";
echo "  Total Runs: 10\n";
echo "  Total Records: 379\n";
echo "  Avg Execution Time: 3s (3000ms)\n";
echo "  Data Size: 194,048 bytes\n\n";

echo "Reality shows:\n";
echo "  Total Runs: " . count($runs) . "\n";
echo "  Total Records: " . $totalRecords . "\n";
echo "  Avg Execution Time: " . (count($runs) > 0 ? round($sumExec / count($runs)) : 0) . "ms\n";
echo "  Data Size: " . ($totalRecords > 0 ? number_format($totalRecords * 512) . " bytes" : "0 bytes") . "\n";
