<?php
namespace App\Controllers;

use App\Services\DataSearchService;

class DataSearchController
{
    private DataSearchService $service;

    public function __construct()
    {
        $this->service = new DataSearchService();
    }

    public function search(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $query = $input['query'] ?? '';
        $filters = $input['filters'] ?? [];
        $page = isset($input['page']) ? (int)$input['page'] : 1;
        $limit = isset($input['limit']) ? (int)$input['limit'] : 50;
        $sort = $input['sort'] ?? 'createdAt';
        $order = $input['order'] ?? 'desc';

        return $this->service->search($query, $filters, $page, $limit, $sort, $order);
    }

    public function columns(): array
    {
        return $this->service->getColumns();
    }

    public function filter(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        return $this->service->applyFilter($input);
    }
}
