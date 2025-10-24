<?php
namespace App\Services;

use App\Repositories\ParameterModeRepository;

class ParameterModeService
{
    private ParameterModeRepository $repo;

    public function __construct()
    {
        $this->repo = new ParameterModeRepository();
    }

    public function listModes(): array
    {
        $rows = $this->repo->findAll();
        return array_map([$this, 'normalize'], $rows);
    }

    public function getMode(string $id): ?array
    {
        $row = $this->repo->findById($id);
        return $row ? $this->normalize($row) : null;
    }

    public function createMode(array $data): ?array
    {
        $saved = $this->repo->insert($data);
        return $saved ? $this->normalize($saved) : null;
    }

    public function updateMode(string $id, array $data): bool
    {
        return $this->repo->update($id, $data);
    }

    public function deleteMode(string $id): bool
    {
        return $this->repo->delete($id);
    }

    private function normalize(array $row): array
    {
        $id = $row['_id'] ?? ($row['id'] ?? null);
        return [
            'id' => $id,
            'name' => $row['name'] ?? 'Unnamed',
            'type' => $row['type'] ?? 'static',
            'description' => $row['description'] ?? '',
            'parameters' => $row['parameters'] ?? [],
            'createdAt' => $row['createdAt'] ?? null,
            'updatedAt' => $row['updatedAt'] ?? null,
        ];
    }
}