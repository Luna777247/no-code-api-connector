<?php
namespace App\Controllers;

use App\Services\ConnectionService;
use App\Support\HttpClient;
use App\Exceptions\HttpException;

class DiagnosticController
{
    private HttpClient $http;

    public function __construct()
    {
        $this->http = new HttpClient();
    }

    public function testConnection(): array
    {
        try {
            $rawInput = file_get_contents('php://input');
            $input = json_decode($rawInput, true) ?? [];

            $connectionId = $input['connectionId'] ?? null;
            $apiConfig = $input['apiConfig'] ?? null;

            if ($connectionId) {
                // Test existing connection
                $connectionService = new ConnectionService();
                $connection = $connectionService->get($connectionId);
                if (!$connection) {
                    http_response_code(404);
                    return ['error' => 'Connection not found'];
                }

                $url = $connection['baseUrl'] ?? $connection['url'] ?? '';
                $method = $connection['method'] ?? 'GET';
                $headers = $connection['headers'] ?? [];
                $body = $connection['body'] ?? null;
                $authConfig = $connection['authConfig'] ?? null;
                $parameters = $connection['parameters'] ?? [];
            } elseif ($apiConfig && is_array($apiConfig)) {
                // Test with provided config
                $url = $apiConfig['baseUrl'] ?? '';
                $method = $apiConfig['method'] ?? 'GET';
                $headers = $apiConfig['headers'] ?? [];
                $body = $apiConfig['body'] ?? null;
                $authConfig = $apiConfig['authConfig'] ?? null;
                $parameters = $apiConfig['parameters'] ?? [];
            } else {
                http_response_code(400);
                return ['error' => 'Either connectionId or apiConfig is required'];
            }

            if (empty($url)) {
                http_response_code(400);
                return ['error' => 'baseUrl is required'];
            }

            // Process parameters for GET requests
            $queryParams = [];
            if (!empty($parameters) && is_array($parameters)) {
                foreach ($parameters as $param) {
                    if (is_array($param) && isset($param['name']) && isset($param['values']) && is_array($param['values'])) {
                        $name = $param['name'];
                        $values = $param['values'];
                        if (!empty($values)) {
                            $queryParams[$name] = $values[0]; // Use first value for testing
                        }
                    }
                }
            }

            // Add query parameters to URL for GET requests
            if (!empty($queryParams) && strtoupper($method) === 'GET') {
                $parsedUrl = parse_url($url);
                $existingQuery = $parsedUrl['query'] ?? '';
                parse_str($existingQuery, $existingParams);
                $mergedParams = array_merge($existingParams, $queryParams);
                $queryString = http_build_query($mergedParams);
                $url = $parsedUrl['scheme'] . '://' . $parsedUrl['host'];
                if (isset($parsedUrl['path'])) {
                    $url .= $parsedUrl['path'];
                }
                $url .= '?' . $queryString;
            }

            // Add authentication headers if configured
            if ($authConfig && is_array($authConfig)) {
                $authType = $authConfig['type'] ?? null;
                if ($authType === 'api-key') {
                    $keyName = $authConfig['keyName'] ?? '';
                    $keyValue = $authConfig['keyValue'] ?? '';
                    if (!empty($keyName) && !empty($keyValue)) {
                        $headers[] = $keyName . ': ' . $keyValue;
                    }
                } elseif ($authType === 'bearer') {
                    $token = $authConfig['token'] ?? '';
                    if (!empty($token)) {
                        $headers[] = 'Authorization: Bearer ' . $token;
                    }
                } elseif ($authType === 'basic') {
                    $username = $authConfig['username'] ?? '';
                    $password = $authConfig['password'] ?? '';
                    if (!empty($username) && !empty($password)) {
                        $headers[] = 'Authorization: Basic ' . base64_encode($username . ':' . $password);
                    }
                }
            }

            // Log the request details for debugging
            error_log('Test Connection Request: ' . json_encode([
                'connectionId' => $connectionId,
                'apiConfig' => $apiConfig,
                'url' => $url,
                'method' => $method,
                'headers' => $headers,
                'body' => $body,
                'authConfig' => $authConfig
            ]));

            $httpClient = new HttpClient();
            $response = $httpClient->request($method, $url, $headers, $body);

            // Log the response for debugging
            error_log('Test Connection Response: ' . json_encode([
                'status' => $response['status'],
                'ok' => $response['ok'],
                'body_length' => strlen($response['body'] ?? ''),
                'body_preview' => substr($response['body'] ?? '', 0, 200)
            ]));

            // For connection testing, any response (even errors) indicates the connection works
            // The UI will show the actual status code and response details
            return [
                'success' => true,
                'message' => 'Connection test completed',
                'response' => [
                    'status' => $response['status'],
                    'statusText' => $response['statusText'],
                    'ok' => $response['ok'],
                    'body' => $response['body'],
                    'headers' => $response['headers']
                ]
            ];

        } catch (\Throwable $e) {
            error_log('Test Connection Exception: ' . $e->getMessage());
            http_response_code(500);
            return [
                'success' => false,
                'error' => 'Connection test failed: ' . $e->getMessage()
            ];
        }
    }
}
