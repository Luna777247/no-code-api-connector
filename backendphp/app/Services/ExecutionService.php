<?php
namespace App\Services;

use App\Repositories\RunRepository;
use App\Repositories\ConnectionRepository;

class ExecutionService
{
    private RunRepository $runRepo;
    private ConnectionRepository $connectionRepo;

    public function __construct()
    {
        $this->runRepo = new RunRepository();
        $this->connectionRepo = new ConnectionRepository();
    }

    /**
     * Execute API call and update run with results
     */
    public function executeApiCall(string $runId): bool
    {
        $run = $this->runRepo->findById($runId);
        if (!$run) {
            return false;
        }

        $connection = $this->connectionRepo->findByConnectionId($run['connectionId']);
        if (!$connection) {
            return false;
        }

        $startTime = microtime(true);

        try {
            // Prepare API call
            $apiUrl = $connection['baseUrl'] ?? '';
            $method = $connection['method'] ?? 'GET';
            $headers = $connection['headers'] ?? [];
            $authConfig = $connection['authConfig'] ?? [];
            $parameters = $connection['parameters'] ?? [];

            // Build URL with query parameters
            $apiUrl = $this->buildUrlWithParameters($apiUrl, $parameters);

            // Execute API call with retry logic for rate limits
            $maxRetries = 3;
            $retryDelay = 1; // Start with 1 second delay
            $response = null;
            $lastError = null;

            for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
                try {
                    $response = $this->makeHttpRequest($apiUrl, $method, $headers, $authConfig);
                    
                    // If not rate limited, break out of retry loop
                    if (($response['statusCode'] ?? 200) !== 429) {
                        break;
                    }
                    
                    // Rate limited - wait before retry
                    if ($attempt < $maxRetries - 1) {
                        sleep($retryDelay);
                        $retryDelay *= 2; // Exponential backoff
                    }
                } catch (\Exception $e) {
                    $lastError = $e->getMessage();
                    if ($attempt < $maxRetries - 1) {
                        sleep($retryDelay);
                        $retryDelay *= 2;
                    }
                }
            }

            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            // Process response
            $statusCode = $response['statusCode'] ?? 200;
            $responseData = $response['data'] ?? [];
            $errorMessage = $response['error'] ?? $lastError;

            // If all retries failed with 429, mark as rate limited error
            if ($statusCode === 429) {
                $errorMessage = 'Rate limit exceeded after retries';
            }

            // Determine if this is a successful data extraction
            $isSuccess = $statusCode < 400 && !$errorMessage && is_array($responseData);

            // Calculate records extracted
            $recordsExtracted = 0;
            if ($isSuccess && is_array($responseData)) {
                // Check if it's an indexed array (list of records) or associative array (single record)
                $isIndexedArray = count($responseData) == 0 || (array_keys($responseData) === range(0, count($responseData) - 1));

                if ($isIndexedArray) {
                    // Indexed array: count the items
                    $recordsExtracted = count($responseData);
                } else {
                    // Associative array: treat as single record
                    $recordsExtracted = 1;
                }
            }

            // Update run with actual data
            $updateData = [
                'status' => $isSuccess ? 'success' : 'failed',
                'duration' => round($duration),
                'recordsExtracted' => $recordsExtracted,
                'recordsLoaded' => $recordsExtracted, // Assume all extracted are loaded
                'response' => json_encode($response), // Convert to JSON string
                'startedAt' => date('c', $startTime),
                'completedAt' => date('c', $endTime),
                'successfulRequests' => $isSuccess ? 1 : 0,
                'totalRequests' => 1,
                'failedRequests' => $isSuccess ? 0 : 1,
                'apiUrl' => $apiUrl,
                'method' => $method
            ];

            if (!$isSuccess) {
                $updateData['errorMessage'] = $errorMessage ?: 'API call failed with status ' . $statusCode;
            }

            return $this->runRepo->update($runId, $updateData);

        } catch (\Exception $e) {
            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            // Update run with error
            $updateData = [
                'status' => 'failed',
                'duration' => round($duration),
                'recordsExtracted' => 0,
                'recordsLoaded' => 0,
                'startedAt' => date('c', $startTime),
                'completedAt' => date('c', $endTime),
                'errorMessage' => $e->getMessage(),
                'successfulRequests' => 0,
                'totalRequests' => 1,
                'failedRequests' => 1
            ];

            return $this->runRepo->update($runId, $updateData);
        }
    }

    /**
     * Make HTTP request (simplified implementation)
     */
    private function makeHttpRequest(string $url, string $method, array $headers, array $authConfig): array
    {
        // This is a simplified implementation
        // In real application, use Guzzle HTTP client or similar

        $context = [
            'http' => [
                'method' => $method,
                'header' => $this->formatHeaders($headers),
                'timeout' => 30,
                'ignore_errors' => true // Get actual status codes
            ]
        ];

        if ($method === 'POST' || $method === 'PUT') {
            // Add body if needed
            $context['http']['content'] = '{}';
            $context['http']['header'] .= "Content-Type: application/json\r\n";
        }

        $result = @file_get_contents($url, false, stream_context_create($context));

        // Get HTTP status code from headers
        $statusCode = 500; // Default to server error
        if (isset($http_response_header)) {
            foreach ($http_response_header as $header) {
                if (preg_match('/^HTTP\/\d+\.\d+\s+(\d+)/', $header, $matches)) {
                    $statusCode = (int)$matches[1];
                    break;
                }
            }
        }

        if ($result === false) {
            return [
                'statusCode' => $statusCode ?: 500,
                'error' => 'Failed to connect to API',
                'data' => null
            ];
        }

        // Try to decode JSON response
        $data = json_decode($result, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $data = ['raw_response' => $result];
        }

        // Check for API error responses
        if ($statusCode >= 400) {
            return [
                'statusCode' => $statusCode,
                'error' => $data['message'] ?? 'API returned error',
                'data' => $data
            ];
        }

        return [
            'statusCode' => $statusCode,
            'data' => $data
        ];
    }

    /**
     * Format headers array to string
     */
    private function formatHeaders(array $headers): string
    {
        $formatted = '';
        foreach ($headers as $key => $value) {
            if (is_array($value) && isset($value['key']) && isset($value['value'])) {
                // Handle array format: [{'key': 'name', 'value': 'val'}, ...]
                $formatted .= $value['key'] . ': ' . $value['value'] . "\r\n";
            } elseif (is_string($key) && is_string($value)) {
                // Handle object format: {'name': 'val', ...}
                $formatted .= $key . ': ' . $value . "\r\n";
            } elseif (is_string($value)) {
                // Handle string format: ['name: val', ...]
                $formatted .= $value . "\r\n";
            }
        }
        return $formatted;
    }

    /**
     * Build URL with query parameters from connection config
     */
    private function buildUrlWithParameters(string $baseUrl, array $parameters): string
    {
        $queryParams = [];

        foreach ($parameters as $param) {
            if (($param['type'] ?? '') === 'query' && isset($param['values']) && is_array($param['values'])) {
                // Use first value if it's a list
                $value = $param['values'][0] ?? '';
                if (!empty($value)) {
                    $queryParams[$param['name']] = $value;
                }
            }
        }

        if (!empty($queryParams)) {
            $queryString = http_build_query($queryParams);
            // Check if URL already has query parameters
            if (strpos($baseUrl, '?') !== false) {
                $baseUrl .= '&' . $queryString;
            } else {
                $baseUrl .= '?' . $queryString;
            }
        }

        return $baseUrl;
    }

    /**
     * Execute API call with retry logic and return response data
     * Used for immediate execution without creating run records
     */
    public function executeApiCallWithRetry(string $apiUrl, string $method, array $headers, array $authConfig = [], array $parameters = []): array
    {
        $startTime = microtime(true);

        // Build URL with query parameters
        $apiUrl = $this->buildUrlWithParameters($apiUrl, $parameters);

        // Execute API call with retry logic for rate limits
        $maxRetries = 3;
        $retryDelay = 1; // Start with 1 second delay
        $response = null;
        $lastError = null;

        for ($attempt = 0; $attempt < $maxRetries; $attempt++) {
            try {
                $response = $this->makeHttpRequest($apiUrl, $method, $headers, $authConfig);
                
                // If not rate limited, break out of retry loop
                if (($response['statusCode'] ?? 200) !== 429) {
                    break;
                }
                
                // Rate limited - wait before retry
                if ($attempt < $maxRetries - 1) {
                    sleep($retryDelay);
                    $retryDelay *= 2; // Exponential backoff
                }
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                if ($attempt < $maxRetries - 1) {
                    sleep($retryDelay);
                    $retryDelay *= 2;
                }
            }
        }

        $endTime = microtime(true);
        $duration = round($endTime - $startTime, 2);

        // Process response
        $statusCode = $response['statusCode'] ?? 200;
        $responseData = $response['data'] ?? [];
        $errorMessage = $response['error'] ?? $lastError;

        // If all retries failed with 429, mark as rate limited error
        if ($statusCode === 429) {
            $errorMessage = 'Rate limit exceeded after retries';
        }

        // Determine if this is a successful data extraction
        $isSuccess = $statusCode < 400 && !$errorMessage && is_array($responseData);
        
        // Check if response contains error message
        if ($isSuccess && isset($responseData['message']) && stripos($responseData['message'], 'invalid') !== false) {
            $isSuccess = false;
            $errorMessage = $responseData['message'];
        }

        // Calculate records extracted
        $recordsExtracted = 0;
        if ($isSuccess && is_array($responseData)) {
            // Check if it's an indexed array (list of records) or associative array (single record)
            $isIndexedArray = count($responseData) == 0 || (array_keys($responseData) === range(0, count($responseData) - 1));

            if ($isIndexedArray) {
                // Indexed array: count the items
                $recordsExtracted = count($responseData);
            } else {
                // Single record with multiple fields
                $recordsExtracted = 1;
            }
        }

        return [
            'ok' => $isSuccess,
            'status' => $statusCode,
            'statusText' => $statusCode == 429 ? 'Too Many Requests' : ($statusCode == 200 ? 'OK' : 'Error'),
            'body' => json_encode($responseData),
            'executionTime' => $duration * 1000, // Convert to milliseconds
            'recordsExtracted' => $recordsExtracted,
            'errorMessage' => $errorMessage,
            'responseData' => $responseData,
        ];
    }
}