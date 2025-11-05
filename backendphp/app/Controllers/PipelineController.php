<?php
namespace App\Controllers;

use App\Support\HttpClient;
use App\Services\RunService;

class PipelineController
{
    private HttpClient $http;
    private RunService $runs;

    public function __construct()
    {
        $this->http = new HttpClient();
        $this->runs = new RunService();
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
        $res = $this->http->request($method, $url, $headers, null, 30);
        $endTime = microtime(true);
        $body = $res['body'] ?? null;

        // Calculate execution time in milliseconds
        $executionTime = round(($endTime - $startTime) * 1000);

        // Calculate records processed from response body
        $recordsProcessed = 0;
        if ($res['ok'] && $body) {
            $decodedBody = json_decode($body, true);
            if (is_array($decodedBody)) {
                $recordsProcessed = count($decodedBody);
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
            'recordsProcessed' => $recordsProcessed, // Calculate from response body
            'failedRequests' => $res['ok'] ? 0 : 1,
            'errorMessage' => $res['ok'] ? null : ($res['statusText'] ?? 'Request failed'),
            'response' => $body,
        ]);

        return [
            'runId' => $runId,
            'ok' => $res['ok'],
            'status' => $res['status'] ?? 0,
        ];
    }
}
