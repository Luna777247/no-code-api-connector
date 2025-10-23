<?php
namespace App\Services;

use App\Repositories\ConnectionRepository;

class ConnectionService
{
    private ConnectionRepository $repo;

    public function __construct()
    {
        $this->repo = new ConnectionRepository();
    }

    public function list(): array
    {
        $rows = $this->repo->findAll();
        return array_map([$this, 'normalize'], $rows);
    }

    public function get(string $id): ?array
    {
        $row = $this->repo->findById($id);
        return $row ? $this->normalize($row) : null;
    }

    public function create(array $data): ?array
    {
        $saved = $this->repo->insert($data);
        return $saved ? $this->normalize($saved) : null;
    }

    public function update(string $id, array $data): bool
    {
        return $this->repo->update($id, $data);
    }

    public function delete(string $id): bool
    {
        return $this->repo->delete($id);
    }

    private function normalize(array $row): array
    {
        $id = $row['_id'] ?? ($row['id'] ?? null);
        return [
            'id' => $id,
            'connectionId' => $row['connectionId'] ?? ($id ?? ''),
            'name' => $row['name'] ?? 'Unnamed',
            'description' => $row['description'] ?? '',
            'baseUrl' => $row['apiConfig']['baseUrl'] ?? ($row['baseUrl'] ?? ''),
            'method' => $row['apiConfig']['method'] ?? ($row['method'] ?? 'GET'),
            'headers' => $row['apiConfig']['headers'] ?? ($row['headers'] ?? []),
            'authType' => $row['apiConfig']['authType'] ?? ($row['authType'] ?? 'none'),
            'isActive' => (bool)($row['isActive'] ?? true),
            'createdAt' => $row['createdAt'] ?? date('c'),
            'lastRun' => $row['lastRun'] ?? null,
            'totalRuns' => (int)($row['totalRuns'] ?? 0),
            'successRate' => (int)($row['successRate'] ?? 0),
        ];
    }
}
