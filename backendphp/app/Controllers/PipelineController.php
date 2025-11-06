<?php
namespace App\Controllers;

use App\Support\HttpClient;
use App\Services\RunService;
use App\Services\DataTransformationService;
use App\Services\ConnectionService;

class PipelineController
{
    private HttpClient $http;
    private RunService $runs;
    private DataTransformationService $dataTransformer;
    private ConnectionService $connections;

    public function __construct()
    {
        $this->http = new HttpClient();
        $this->runs = new RunService();
        $this->dataTransformer = new DataTransformationService();
        $this->connections = new ConnectionService();
    }

    // POST /api/execute-run
    // Body: { connectionId, apiConfig: { baseUrl, method, headers, authType, authConfig }, parameters, fieldMappings }
    public function executeRun(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $connectionId = (string)($input['connectionId'] ?? '');
        $cfg = $input['apiConfig'] ?? [];
        $url = (string)($cfg['baseUrl'] ?? '');
        $method = (string)($cfg['method'] ?? 'GET');
        $headers = (array)($cfg['headers'] ?? []);
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

        // In a real pipeline we would expand parameters, fan-out requests, transform & load.
        // Here we execute a single request to validate connectivity and create a run record.
        $startTime = microtime(true);
        $res = $this->http->request($method, $url, $headers, null, 60);
        $endTime = microtime(true);
        $body = $res['body'] ?? null;

        // Calculate execution time in milliseconds
        $executionTime = round(($endTime - $startTime) * 1000);

        // Calculate records extracted from response body
        $recordsExtracted = 0;
        if ($res['ok'] && $body) {
            $decodedBody = json_decode($body, true);
            if (is_array($decodedBody)) {
                // Check if response has a 'data' field that contains the actual records
                if (isset($decodedBody['data'])) {
                    $data = $decodedBody['data'];
                    if (is_array($data)) {
                        // Check if this is an array of records or a single record with fields
                        $firstElement = reset($data);
                        if (is_array($firstElement) || is_object($firstElement)) {
                            // Array of records
                            $recordsExtracted = count($data);
                        } else {
                            // Single record with multiple fields
                            $recordsExtracted = 1;
                        }
                    } elseif (is_object($data) || is_array($data)) {
                        // If data is a single record object/array, count as 1
                        $recordsExtracted = 1;
                    }
                } else {
                    // Fallback: if response itself is data, count elements
                    $recordsExtracted = is_array($decodedBody) ? count($decodedBody) : 1;
                }
            }
        }

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
        $extractedData = null;
        if ($res['ok'] && $body) {
            $decodedBody = json_decode($body, true);
            if (is_array($decodedBody)) {
                // Extract data field if it exists, otherwise use the whole response
                $extractedData = isset($decodedBody['data']) ? $decodedBody['data'] : $decodedBody;
            }
        }

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
            'errorMessage' => $res['ok'] ? null : ($res['statusText'] ?? 'Request failed'),
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
    }
}
