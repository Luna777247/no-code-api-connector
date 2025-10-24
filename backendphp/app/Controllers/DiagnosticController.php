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
        // Allow tests to inject raw input via global override for php://input
        $rawInput = $GLOBALS['__php_input_override'] ?? null;
        if ($rawInput === null) {
            $rawInput = file_get_contents('php://input');
        }
        $input = json_decode($rawInput, true) ?? [];
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
        $body = $res['body'] ?? null;

        return [
            'success' => $ok,
            'status' => $status,
            'statusText' => $statusText,
            'message' => $ok ? 'Connection successful' : 'Request failed',
            'body' => $body,
        ];
    }
}
