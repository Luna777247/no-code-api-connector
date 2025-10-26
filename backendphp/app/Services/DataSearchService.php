<?php
namespace App\Services;

use App\Repositories\DataRepository;

class DataSearchService
{
    private DataRepository $dataRepo;

    public function __construct()
    {
        $this->dataRepo = new DataRepository();
    }

    public function search(string $query, array $filters, int $page, int $limit, string $sort, string $order): array
    {
        try {
            // Calculate offset for pagination
            $offset = ($page - 1) * $limit;

            // Convert sort parameters
            $sortField = $sort ?: 'createdAt';
            $sortOrder = strtolower($order) === 'asc' ? 1 : -1;
            $sortOptions = [$sortField => $sortOrder];

            // Search across all collections
            $searchResult = $this->dataRepo->searchAcrossCollections($query, $filters, [
                'limit' => $limit,
                'offset' => $offset,
                'sort' => $sortOptions
            ]);

            $results = $searchResult['data'];
            $total = $searchResult['total'];

            return [
                'results' => $results,
                'total' => $total,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'totalPages' => ceil($total / $limit),
                    'hasNext' => $page * $limit < $total,
                    'hasPrev' => $page > 1
                ],
                'query' => $query,
                'filters' => $filters,
                'sort' => $sort,
                'order' => $order
            ];
        } catch (\Throwable $e) {
            error_log("Search failed: " . $e->getMessage());
            // Return empty results on error to maintain API compatibility
            return [
                'results' => [],
                'total' => 0,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'totalPages' => 0,
                    'hasNext' => false,
                    'hasPrev' => false
                ],
                'query' => $query,
                'filters' => $filters,
                'sort' => $sort,
                'order' => $order
            ];
        }
    }

    public function getColumns(): array
    {
        return [
            [
                'name' => 'id',
                'type' => 'string',
                'searchable' => true,
                'filterable' => true
            ],
            [
                'name' => 'name',
                'type' => 'string',
                'searchable' => true,
                'filterable' => true
            ],
            [
                'name' => 'description',
                'type' => 'string',
                'searchable' => true,
                'filterable' => false
            ],
            [
                'name' => 'createdAt',
                'type' => 'date',
                'searchable' => false,
                'filterable' => true
            ],
            [
                'name' => 'updatedAt',
                'type' => 'date',
                'searchable' => false,
                'filterable' => true
            ],
            [
                'name' => 'status',
                'type' => 'string',
                'searchable' => true,
                'filterable' => true
            ]
        ];
    }

    public function applyFilter(array $input): array
    {
        $filters = $input['filters'] ?? [];
        $sort = $input['sort'] ?? 'createdAt';
        $limit = $input['limit'] ?? 50;

        try {
            // Use the search method with empty query to just apply filters
            $searchResult = $this->search('', $filters, 1, $limit, $sort, 'desc');

            return [
                'results' => $searchResult['results'],
                'total' => $searchResult['total'],
                'filters' => $filters,
                'sort' => $sort,
                'limit' => $limit
            ];
        } catch (\Throwable $e) {
            error_log("Filter application failed: " . $e->getMessage());
            // Return empty results on error
            return [
                'results' => [],
                'total' => 0,
                'filters' => $filters,
                'sort' => $sort,
                'limit' => $limit
            ];
        }
    }
}