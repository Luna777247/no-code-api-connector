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

            // Execute API call (simplified - in real implementation, use Guzzle or similar)
            $response = $this->makeHttpRequest($apiUrl, $method, $headers, $authConfig);
            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            // Process response
            $statusCode = $response['statusCode'] ?? 200;
            $responseData = $response['data'] ?? [];
            $recordsExtracted = is_array($responseData) ? count($responseData) : 1;

            // Update run with actual data
            $updateData = [
                'status' => $statusCode < 400 ? 'success' : 'failed',
                'duration' => $duration,
                'recordsExtracted' => $recordsExtracted,
                'recordsLoaded' => $recordsExtracted, // Assume all extracted are loaded
                'response' => $response,
                'startedAt' => date('c', $startTime),
                'completedAt' => date('c', $endTime),
                'successfulRequests' => $statusCode < 400 ? 1 : 0,
                'totalRequests' => 1,
                'failedRequests' => $statusCode >= 400 ? 1 : 0,
                'apiUrl' => $apiUrl,
                'method' => $method
            ];

            if ($statusCode >= 400) {
                $updateData['errorMessage'] = $response['error'] ?? 'API call failed';
            }

            return $this->runRepo->update($runId, $updateData);

        } catch (\Exception $e) {
            $endTime = microtime(true);
            $duration = round($endTime - $startTime, 2);

            // Update run with error
            $updateData = [
                'status' => 'failed',
                'duration' => $duration,
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
                'timeout' => 30
            ]
        ];

        if ($method === 'POST' || $method === 'PUT') {
            // Add body if needed
            $context['http']['content'] = '{}';
            $context['http']['header'] .= "Content-Type: application/json\r\n";
        }

        $result = @file_get_contents($url, false, stream_context_create($context));

        if ($result === false) {
            return [
                'statusCode' => 500,
                'error' => 'Failed to connect to API',
                'data' => null
            ];
        }

        // Try to decode JSON response
        $data = json_decode($result, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $data = ['raw_response' => $result];
        }

        return [
            'statusCode' => 200, // Simplified - in real implementation, get from headers
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
            $formatted .= "$key: $value\r\n";
        }
        return $formatted;
    }
}