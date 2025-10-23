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
    // Body: { connectionId, apiConfig: { baseUrl, method, headers }, parameters, fieldMappings }
    public function executeRun(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $connectionId = (string)($input['connectionId'] ?? '');
        $cfg = $input['apiConfig'] ?? [];
        $url = (string)($cfg['baseUrl'] ?? '');
        $method = (string)($cfg['method'] ?? 'GET');
        $headers = (array)($cfg['headers'] ?? []);

        if ($connectionId === '' || $url === '') {
            http_response_code(400);
            return ['error' => 'connectionId and apiConfig.baseUrl are required'];
        }

        // In a real pipeline we would expand parameters, fan-out requests, transform & load.
        // Here we execute a single request to validate connectivity and create a run record.
        $res = $this->http->request($method, $url, $headers, null, 30);

        $runId = $this->runs->create([
            'connectionId' => $connectionId,
            'status' => $res['ok'] ? 'completed' : 'failed',
            'startedAt' => date('c'),
            'duration' => null,
            'recordsExtracted' => null,
            'errorMessage' => $res['ok'] ? null : ($res['statusText'] ?? 'Request failed'),
        ]);

        return [
            'runId' => $runId,
            'ok' => $res['ok'],
            'status' => $res['status'] ?? 0,
        ];
    }
}
