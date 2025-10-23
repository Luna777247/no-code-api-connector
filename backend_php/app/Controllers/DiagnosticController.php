<?php
namespace App\Controllers;

use App\Support\HttpClient;

class DiagnosticController
{
    private HttpClient $http;

    public function __construct()
    {
        $this->http = new HttpClient();
    }

    // POST /api/test-connection
    // Body: { apiConfig: { baseUrl, method, headers } }
    public function testConnection(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $cfg = $input['apiConfig'] ?? [];
        $url = (string)($cfg['baseUrl'] ?? '');
        $method = (string)($cfg['method'] ?? 'GET');
        $headers = (array)($cfg['headers'] ?? []);

        if ($url === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'baseUrl is required'];
        }

        $res = $this->http->request($method, $url, $headers, null, 20);
        $ok = $res['ok'] ?? false;
        $status = $res['status'] ?? 0;
        $statusText = $res['statusText'] ?? '';

        return [
            'success' => $ok,
            'status' => $status,
            'statusText' => $statusText,
            'message' => $ok ? 'Connection successful' : 'Request failed',
        ];
    }
}
