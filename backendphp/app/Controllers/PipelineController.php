<?php
namespace App\Controllers;

use App\Support\HttpClient;
use App\Services\RunService;
use App\Services\DataTransformationService;
use App\Services\ConnectionService;
use App\Services\ExecutionService;

class PipelineController
{
    private HttpClient $http;
    private RunService $runs;
    private DataTransformationService $dataTransformer;
    private ConnectionService $connections;
    private ExecutionService $execution;

    public function __construct()
    {
        $this->http = new HttpClient();
        $this->runs = new RunService();
        $this->dataTransformer = new DataTransformationService();
        $this->connections = new ConnectionService();
        $this->execution = new ExecutionService();
    }

    // POST /api/execute-run
    // Body: { connectionId, apiConfig: { baseUrl, method, headers, authType, authConfig }, parameters, fieldMappings }
    public function executeRun(): array
    {
        try {
            $input = json_decode(file_get_contents('php://input'), true) ?? [];
            error_log('PipelineController input: ' . json_encode($input));

            $connectionId = $input['connectionId'] ?? '';
            $cfg = $input['apiConfig'] ?? [];
            $url = $cfg['baseUrl'] ?? '';
            $method = $cfg['method'] ?? 'GET';

            error_log("Parsed - connectionId: $connectionId, url: $url, method: $method");
        $headers = $cfg['headers'] ?? [];
        // Ensure headers is an associative array (key => value)
        if (is_array($headers) && isset($headers[0]) && is_array($headers[0])) {
            // Convert from array format [{'key': 'name', 'value': 'val'}] to associative array
            $normalizedHeaders = [];
            foreach ($headers as $header) {
                if (isset($header['key']) && isset($header['value'])) {
                    $normalizedHeaders[$header['key']] = $header['value'];
                }
            }
            $headers = $normalizedHeaders;
        } elseif (!is_array($headers)) {
            // Convert object to array
            $headers = (array)$headers;
        }
        
        error_log('Final headers: ' . json_encode($headers));
        $authType = (string)($cfg['authType'] ?? 'none');
        $authConfig = (array)($cfg['authConfig'] ?? []);

        if ($connectionId === '' || $url === '') {
            http_response_code(400);
            return ['error' => 'connectionId and apiConfig.baseUrl are required'];
        }

        // Handle authentication by adding appropriate headers
        if ($authType === 'bearer' && isset($authConfig['token'])) {
            $headers['Authorization'] = 'Bearer ' . $authConfig['token'];
        } elseif ($authType === 'basic' && isset($authConfig['username']) && isset($authConfig['password'])) {
            $headers['Authorization'] = 'Basic ' . base64_encode($authConfig['username'] . ':' . $authConfig['password']);
        } elseif ($authType === 'api-key' && isset($authConfig['keyName']) && isset($authConfig['keyValue'])) {
            $keyName = $authConfig['keyName'];
            $keyValue = $authConfig['keyValue'];
            if ($keyValue) {
                $headers[$keyName] = $keyValue;
            }
        }

        $parameters = $input['parameters'] ?? [];
        
        // In a real pipeline we would expand parameters, fan-out requests, transform & load.
        // Here we execute a single request to validate connectivity and create a run record.
        $res = $this->execution->executeApiCallWithRetry($url, $method, $headers, $authConfig, $parameters);
        $body = $res['body'] ?? null;

        // Calculate execution time in milliseconds
        $executionTime = $res['executionTime'] ?? 0;

        // Calculate records extracted from response body
        $recordsExtracted = $res['recordsExtracted'] ?? 0;

        // Initialize variables
        $dataTransformationResult = null;
        $recordsProcessed = $recordsExtracted; // Default to extracted count

        if ($res['ok'] && $body) {
            try {
                $connection = $this->connections->get($connectionId);
                if ($connection && isset($connection['fieldMappings']) && isset($connection['tableName'])) {
                    $fieldMappings = $connection['fieldMappings'];
                    $tableName = $connection['tableName'];

                    if (!empty($fieldMappings) && !empty($tableName)) {
                        $dataTransformationResult = $this->dataTransformer->transformAndSave(
                            $connectionId,
                            $tableName,
                            $fieldMappings,
                            $body
                        );
                        error_log('Data transformation result: ' . json_encode($dataTransformationResult));
                    }
                }
            } catch (\Throwable $e) {
                error_log('Data transformation failed: ' . $e->getMessage());
                // Don't fail the run if data transformation fails
            }
        }

        // Calculate records loaded (saved to database)
        $recordsLoaded = $recordsExtracted; // Default to extracted count
        if ($dataTransformationResult && isset($dataTransformationResult['success']) && $dataTransformationResult['success']) {
            $recordsLoaded = $dataTransformationResult['recordsSaved'] ?? $recordsExtracted;
        }

        // Extract actual data from response for frontend display
        $extractedData = $res['responseData'] ?? null;

        $runId = $this->runs->create([
            'connectionId' => $connectionId,
            'status' => $res['ok'] ? 'success' : 'failed',
            'startedAt' => date('c'),
            'completedAt' => date('c'),
            'executionTime' => $executionTime,
            'apiUrl' => $url,
            'method' => $method,
            'successfulRequests' => $res['ok'] ? 1 : 0,
            'totalRequests' => 1,
            'recordsExtracted' => $recordsExtracted, // Records extracted from API response
            'recordsProcessed' => $recordsProcessed, // Records processed (may include transformations)
            'recordsLoaded' => $recordsLoaded, // Records successfully loaded to database
            'failedRequests' => $res['ok'] ? 0 : 1,
            'errorMessage' => $res['errorMessage'] ?? ($res['ok'] ? null : ($res['statusText'] ?? 'Request failed')),
            'response' => $body,
            'extractedData' => $extractedData,
            'dataTransformation' => $dataTransformationResult,
        ]);

        return [
            'runId' => $runId,
            'ok' => $res['ok'],
            'status' => $res['status'] ?? 0,
            'dataTransformation' => $dataTransformationResult,
        ];
        } catch (\Exception $e) {
            error_log('PipelineController error: ' . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Internal server error: ' . $e->getMessage()];
        }
    }
}
