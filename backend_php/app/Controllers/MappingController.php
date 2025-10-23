<?php
namespace App\Controllers;

use App\Repositories\ConnectionRepository;

class MappingController
{
    public function index(): void
    {
        header('Content-Type: application/json');

        $repo = new ConnectionRepository();
        $connections = [];
        try {
            $connections = $repo->findAll();
        } catch (\Throwable $e) {
            $connections = [];
        }

        $mappings = [];
        foreach ($connections as $c) {
            $fields = $c['fieldMappings'] ?? [];
            $mappings[] = [
                'id' => (string)($c['_id'] ?? ($c['connectionId'] ?? uniqid('conn_', true))),
                'connectionName' => (string)($c['name'] ?? 'Connection'),
                'tableName' => (string)($c['tableName'] ?? 'unknown_table'),
                'fieldCount' => is_array($fields) ? count($fields) : 0,
                'lastUpdated' => $c['updatedAt'] ?? ($c['createdAt'] ?? date('c')),
                'fields' => array_map(function ($f) {
                    return [
                        'sourcePath' => (string)($f['sourcePath'] ?? ''),
                        'targetField' => (string)($f['targetField'] ?? ''),
                        'dataType' => (string)($f['dataType'] ?? 'string'),
                    ];
                }, is_array($fields) ? $fields : []),
            ];
        }

        echo json_encode(['mappings' => $mappings]);
    }
}
