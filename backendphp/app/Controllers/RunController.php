<?php
namespace App\Controllers;

use App\Services\RunService;

class RunController
{
    private RunService $service;

    public function __construct()
    {
        $this->service = new RunService();
    }

    public function index(): array
    {
        $connectionId = $_GET['connectionId'] ?? null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        
        error_log('[RunController.index] Called with connectionId=' . ($connectionId ?? 'null') . ', limit=' . $limit);
        
        if ($connectionId) {
            // Filter by connection if provided
            error_log('[RunController.index] Calling listByConnectionWithTotal');
            $result = $this->service->listByConnectionWithTotal($connectionId, $limit);
            error_log('[RunController.index] Result: total=' . ($result['total'] ?? 'null'));
            return [ 
                'runs' => $result['runs'],
                'total' => $result['total'],
                'connectionId' => $connectionId
            ];
        } else {
            // Return all runs if no connectionId specified
            error_log('[RunController.index] Calling listAllWithTotal');
            $result = $this->service->listAllWithTotal($limit);
            error_log('[RunController.index] Result: total=' . ($result['total'] ?? 'null'));
            return [ 
                'runs' => $result['runs'],
                'total' => $result['total']
            ];
        }
    }

    public function create(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        // Validate required fields
        $requiredFields = ['scheduleId', 'connectionId'];
        foreach ($requiredFields as $field) {
            if (!isset($input[$field]) || empty($input[$field])) {
                http_response_code(400);
                return ['error' => "Field '{$field}' is required"];
            }
        }

        // Create run with pending status
        $runData = [
            'scheduleId' => $input['scheduleId'],
            'connectionId' => $input['connectionId'],
            'status' => 'pending',
            'executedAt' => $input['executedAt'] ?? date('c'),
            'triggeredBy' => $input['triggeredBy'] ?? 'airflow_scheduler',
            'duration' => 0,
            'recordsProcessed' => 0,
            'responseSize' => 0,
        ];

        // Add optional fields
        if (isset($input['apiResponse'])) {
            $runData['apiResponse'] = $input['apiResponse'];
        }

        $runId = $this->service->create($runData);
        
        if (!$runId) {
            http_response_code(500);
            return ['error' => 'Failed to create run'];
        }

        return [
            'id' => $runId,
            'status' => 'created',
            'message' => 'Run created successfully'
        ];
    }
}
