<?php
namespace App\Services;

use App\Repositories\RunRepository;

class RunService
{
    private RunRepository $repo;

    public function __construct()
    {
        $this->repo = new RunRepository();
    }

    public function listByConnection(string $connectionId, int $limit = 10): array
    {
        return $this->repo->findByConnectionId($connectionId, $limit);
    }

    public function create(array $data): string
    {
        return $this->repo->insert($data);
    }
}
