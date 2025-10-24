<?php
namespace App\Services;

use Exception;

class AirflowService
{
    private string $airflowUrl;
    private string $airflowUsername;
    private string $airflowPassword;

    public function __construct()
    {
        $this->airflowUrl = getenv('AIRFLOW_WEBSERVER_URL') ?: 'http://airflow:8080';
        $this->airflowUsername = getenv('AIRFLOW_USERNAME') ?: 'airflow';
        $this->airflowPassword = getenv('AIRFLOW_PASSWORD') ?: 'airflow';
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
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
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
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
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
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
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
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
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
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Make HTTP request to Airflow API
     */
    private function makeRequest(string $method, string $url, array $data = []): array
    {
        $ch = curl_init();
        
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
        curl_setopt($ch, CURLOPT_USERPWD, "{$this->airflowUsername}:{$this->airflowPassword}");
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        
        if (!empty($data)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception("Airflow API error: HTTP {$httpCode}");
        }
        
        return json_decode($response, true) ?? [];
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
