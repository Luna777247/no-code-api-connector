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
                $connection = $this->connectionRepo->findById($connectionId);
                $connectionNames[$connectionId] = $connection['name'] ?? 'Unknown Connection';
            }
            $run['connectionName'] = $connectionNames[$connectionId] ?? 'Unknown Connection';
        }
        
        return $runs;
    }

    public function create(array $data): string
    {
        return $this->repo->insert($data);
    }
}
