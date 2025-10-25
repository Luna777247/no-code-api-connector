<?php
namespace App\Services;

use App\Repositories\RunRepository;
use App\Repositories\ConnectionRepository;

class RunService
{
    private RunRepository $repo;
    private ConnectionRepository $connectionRepo;

    public function __construct()
    {
        $this->repo = new RunRepository();
        $this->connectionRepo = new ConnectionRepository();
    }

    public function listByConnection(string $connectionId, int $limit = 10): array
    {
        $runs = $this->repo->findByConnectionId($connectionId, $limit);
        return $this->enrichWithConnectionNames($runs);
    }

    public function listAll(int $limit = 50): array
    {
        $runs = $this->repo->findAll($limit);
        return $this->enrichWithConnectionNames($runs);
    }

    private function enrichWithConnectionNames(array $runs): array
    {
        $connectionNames = [];
        
        foreach ($runs as &$run) {
            $connectionId = $run['connectionId'] ?? '';
            if ($connectionId && !isset($connectionNames[$connectionId])) {
                try {
                    $connection = $this->connectionRepo->findById($connectionId);
                    $connectionNames[$connectionId] = $connection['name'] ?? 'Unknown Connection';
                } catch (\Exception $e) {
                    $connectionNames[$connectionId] = 'Unknown Connection';
                }
            }
            $run['connectionName'] = $connectionNames[$connectionId] ?? 'Unknown Connection';
        }
        
        return $runs;
    }

    public function create(array $data): string
    {
        return $this->repo->insert($data);
    }

    public function getRunDetail(string $id): ?array
    {
        $run = $this->repo->findById($id);
        if (!$run) {
            return null;
        }
        return $this->enrichWithConnectionNames([$run])[0];
    }

    public function retryRun(string $id): ?array
    {
        $run = $this->repo->findById($id);
        if (!$run) {
            return null;
        }

        // Create a new run with the same connection and parameters
        $retryData = [
            'connectionId' => $run['connectionId'],
            'scheduleId' => $run['scheduleId'] ?? null,
            'status' => 'pending',
            'retryOf' => $id
        ];

        $newRunId = $this->repo->insert($retryData);

        return [
            'success' => true,
            'newRunId' => $newRunId,
            'message' => 'Run retry initiated'
        ];
    }

    public function exportRun(string $id, string $format = 'json'): ?array
    {
        $run = $this->repo->findById($id);
        if (!$run) {
            return null;
        }

        $exportData = $this->enrichWithConnectionNames([$run])[0];

        // Generate export based on format
        $exportId = uniqid('export_', true);

        switch ($format) {
            case 'json':
                $content = json_encode($exportData, JSON_PRETTY_PRINT);
                $filename = "run_{$id}.json";
                break;
            case 'csv':
                $content = $this->arrayToCsv([$exportData]);
                $filename = "run_{$id}.csv";
                break;
            default:
                $content = json_encode($exportData, JSON_PRETTY_PRINT);
                $filename = "run_{$id}.json";
        }

        // In a real implementation, you'd save this to a file and return a download URL
        // For now, we'll just return the export info
        return [
            'exportId' => $exportId,
            'format' => $format,
            'filename' => $filename,
            'size' => strlen($content),
            'status' => 'completed',
            'downloadUrl' => "/api/runs/export/{$exportId}/download"
        ];
    }

    private function arrayToCsv(array $data): string
    {
        if (empty($data)) {
            return '';
        }

        $output = fopen('php://temp', 'r+');

        // Write headers
        if (!empty($data)) {
            fputcsv($output, array_keys($data[0]));
        }

        // Write data
        foreach ($data as $row) {
            fputcsv($output, $row);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv;
    }
}
