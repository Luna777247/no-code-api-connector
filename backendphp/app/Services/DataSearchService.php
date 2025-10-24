<?php
namespace App\Services;

class DataSearchService
{
    public function search(array $params): array
    {
        $query = $params['query'] ?? '';
        $filters = $params['filters'] ?? [];
        $limit = $params['limit'] ?? 50;
        $offset = $params['offset'] ?? 0;

        return [
            'results' => [],
            'total' => 0,
            'query' => $query,
            'filters' => $filters,
            'limit' => $limit,
            'offset' => $offset
        ];
    }

    public function getColumns(): array
    {
        return [
            'id', 'name', 'description', 'createdAt', 'updatedAt'
        ];
    }

    public function filter(array $filters): array
    {
        return [
            'results' => [],
            'total' => 0,
            'filters' => $filters
        ];
    }
}