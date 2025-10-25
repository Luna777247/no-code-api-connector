<?php
namespace App\Services;

use App\Config\AppConfig;
use App\Exceptions\AirflowException;
use App\Support\HttpClient;

class AirflowService
{
    private string $airflowUrl;
    private string $airflowUsername;
    private string $airflowPassword;
    private HttpClient $httpClient;

    public function __construct()
    {
        $defaultUrl = AppConfig::isProduction() ? 'http://airflow:8080' : 'http://localhost:8080';

        $this->airflowUrl = AppConfig::getAirflowWebserverUrl() ?: $defaultUrl;
        $this->airflowUsername = AppConfig::getAirflowUsername();
        $this->airflowPassword = AppConfig::getAirflowPassword();
        $this->httpClient = new HttpClient();
    }

    /**
     * Trigger a DAG run in Airflow
     */
    public function triggerDagRun(string $dagId, array $config = []): array
    {
        try {
            $url = "{$this->airflowUrl}/api/v1/dags/{$dagId}/dagRuns";

            $payload = [
                'conf' => $config,
                'execution_date' => date('c'),
            ];

            $response = $this->makeRequest('POST', $url, $payload);

            return [
                'success' => true,
                'dagRunId' => $response['dag_run_id'] ?? null,
                'state' => $response['state'] ?? 'queued',
            ];
        } catch (AirflowException $e) {
            throw $e; // Re-throw AirflowException
        } catch (\Throwable $e) {
            throw new AirflowException(
                "Failed to trigger DAG run: " . $e->getMessage(),
                $dagId,
                null,
                ['original_exception' => get_class($e)]
            );
        }
    }

    /**
     * Get DAG status
     */
    public function getDagStatus(string $dagId): array
    {
        try {
            $url = "{$this->airflowUrl}/api/v1/dags/{$dagId}";
            $response = $this->makeRequest('GET', $url);

            return [
                'success' => true,
                'dagId' => $response['dag_id'] ?? $dagId,
                'isPaused' => $response['is_paused'] ?? false,
                'lastScheduledRun' => $response['last_scheduled_run'] ?? null,
            ];
        } catch (AirflowException $e) {
            throw $e; // Re-throw AirflowException
        } catch (\Throwable $e) {
            throw new AirflowException(
                "Failed to get DAG status: " . $e->getMessage(),
                $dagId,
                null,
                ['original_exception' => get_class($e)]
            );
        }
    }

    /**
     * Get DAG run history
     */
    public function getDagRunHistory(string $dagId, int $limit = 10): array
    {
        try {
            $url = "{$this->airflowUrl}/api/v1/dags/{$dagId}/dagRuns?limit={$limit}";
            $response = $this->makeRequest('GET', $url);

            $runs = [];
            foreach ($response['dag_runs'] ?? [] as $run) {
                $runs[] = [
                    'runId' => $run['dag_run_id'] ?? null,
                    'state' => $run['state'] ?? 'unknown',
                    'startDate' => $run['start_date'] ?? null,
                    'endDate' => $run['end_date'] ?? null,
                    'duration' => $this->calculateDuration($run['start_date'] ?? null, $run['end_date'] ?? null),
                ];
            }

            return [
                'success' => true,
                'runs' => $runs,
            ];
        } catch (AirflowException $e) {
            throw $e; // Re-throw AirflowException
        } catch (\Throwable $e) {
            throw new AirflowException(
                "Failed to get DAG run history: " . $e->getMessage(),
                $dagId,
                null,
                ['original_exception' => get_class($e), 'limit' => $limit]
            );
        }
    }

    /**
     * Pause a DAG
     */
    public function pauseDag(string $dagId): array
    {
        try {
            $url = "{$this->airflowUrl}/api/v1/dags/{$dagId}";

            $payload = ['is_paused' => true];
            $response = $this->makeRequest('PATCH', $url, $payload);

            return [
                'success' => true,
                'isPaused' => $response['is_paused'] ?? true,
            ];
        } catch (AirflowException $e) {
            throw $e; // Re-throw AirflowException
        } catch (\Throwable $e) {
            throw new AirflowException(
                "Failed to pause DAG: " . $e->getMessage(),
                $dagId,
                null,
                ['original_exception' => get_class($e)]
            );
        }
    }

    /**
     * Resume a DAG
     */
    public function resumeDag(string $dagId): array
    {
        try {
            $url = "{$this->airflowUrl}/api/v1/dags/{$dagId}";

            $payload = ['is_paused' => false];
            $response = $this->makeRequest('PATCH', $url, $payload);

            return [
                'success' => true,
                'isPaused' => $response['is_paused'] ?? false,
            ];
        } catch (AirflowException $e) {
            throw $e; // Re-throw AirflowException
        } catch (\Throwable $e) {
            throw new AirflowException(
                "Failed to resume DAG: " . $e->getMessage(),
                $dagId,
                null,
                ['original_exception' => get_class($e)]
            );
        }
    }

    /**
     * Make HTTP request to Airflow API
     */
    private function makeRequest(string $method, string $url, array $data = []): array
    {
        $headers = [
            'Content-Type: application/json',
            'Authorization: Basic ' . base64_encode("{$this->airflowUsername}:{$this->airflowPassword}")
        ];

        try {
            $response = $this->httpClient->request($method, $url, $headers, !empty($data) ? json_encode($data) : null);

            if (!$response['ok']) {
                throw new AirflowException(
                    "Airflow API returned HTTP {$response['status']}: {$response['statusText']}",
                    null,
                    null,
                    [
                        'method' => $method,
                        'url' => $url,
                        'status' => $response['status'],
                        'response_body' => $response['body']
                    ]
                );
            }

            $decodedResponse = json_decode($response['body'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new AirflowException(
                    "Invalid JSON response from Airflow API: " . json_last_error_msg(),
                    null,
                    null,
                    [
                        'method' => $method,
                        'url' => $url,
                        'response_body' => $response['body']
                    ]
                );
            }

            return $decodedResponse ?? [];
        } catch (\App\Exceptions\HttpException $e) {
            throw new AirflowException(
                "HTTP error communicating with Airflow: " . $e->getMessage(),
                null,
                null,
                [
                    'method' => $method,
                    'url' => $url,
                    'original_exception' => get_class($e),
                    'status_code' => $e->getStatusCode()
                ]
            );
        }
    }

    /**
     * Calculate duration between two timestamps
     */
    private function calculateDuration(?string $startDate, ?string $endDate): ?int
    {
        if (!$startDate || !$endDate) {
            return null;
        }
        
        $start = strtotime($startDate);
        $end = strtotime($endDate);
        
        return $end - $start;
    }
}
