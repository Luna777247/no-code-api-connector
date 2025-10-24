<?php
namespace App\Controllers;

use App\Repositories\ConnectionRepository;

class MappingController
{
    public function index(): array
    {
        // Increase timeout for this endpoint
        ini_set('max_execution_time', 60);

        $repo = new ConnectionRepository();
        $connections = [];
        try {
            // Limit to 50 connections to prevent timeout
            $connections = $repo->findAllLimited(50);
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

        return ['mappings' => $mappings];
    }
}
