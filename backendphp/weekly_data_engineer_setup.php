<?php
/**
 * Weekly Data Engineer Jobs Collection Setup
 *
 * This script sets up automated weekly collection of Data Engineer jobs
 * from RapidAPI. It creates the connection, schedule, and parameter mode
 * for weekly execution (every Monday at 9 AM).
 */

require_once __DIR__ . '/vendor/autoload.php';

use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load();

// API Configuration
$apiUrl = 'https://jsearch.p.rapidapi.com/search';
$apiKey = $_ENV['RAPIDAPI_KEY'] ?? 'your-rapidapi-key-here';
$apiHost = 'jsearch.p.rapidapi.com';

// Job search parameters for Data Engineer positions
$query = 'Data Engineer';
$page = '1';
$num_pages = '1';
$date_posted = 'week'; // Last week's jobs
$remote_jobs_only = false;
$employment_types = 'FULLTIME';

// Base URL for the backend API
$baseUrl = 'http://localhost:8000';

// Function to make API requests
function makeRequest($method, $endpoint, $data = null) {
    global $baseUrl;

    $url = $baseUrl . $endpoint;
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

    if ($data) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Content-Length: ' . strlen(json_encode($data))
        ]);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        throw new Exception('Curl error: ' . curl_error($ch));
    }

    curl_close($ch);

    return [
        'status' => $httpCode,
        'data' => json_decode($response, true)
    ];
}

try {
    echo "Setting up Weekly Data Engineer Jobs Collection...\n\n";

    // Step 1: Create Connection
    echo "1. Creating API Connection...\n";
    $connectionData = [
        'name' => 'Weekly Data Engineer Jobs API',
        'url' => $apiUrl,
        'method' => 'GET',
        'headers' => [
            'X-RapidAPI-Key' => $apiKey,
            'X-RapidAPI-Host' => $apiHost
        ],
        'query_params' => [
            'query' => $query,
            'page' => $page,
            'num_pages' => $num_pages,
            'date_posted' => $date_posted,
            'remote_jobs_only' => $remote_jobs_only,
            'employment_types' => $employment_types
        ],
        'auth_type' => 'api_key',
        'description' => 'Weekly collection of Data Engineer job postings from RapidAPI'
    ];

    $connectionResponse = makeRequest('POST', '/api/connections', $connectionData);

    if ($connectionResponse['status'] !== 201) {
        throw new Exception('Failed to create connection: ' . json_encode($connectionResponse));
    }

    $connectionId = $connectionResponse['data']['id'];
    echo "✓ Connection created with ID: $connectionId\n\n";

    // Step 2: Create Weekly Schedule
    echo "2. Creating Weekly Schedule (Monday 9 AM)...\n";
    $scheduleData = [
        'name' => 'Weekly Data Engineer Jobs Collection',
        'cron_expression' => '0 9 * * 1', // Every Monday at 9 AM
        'description' => 'Weekly automated collection of Data Engineer job postings',
        'enabled' => true,
        'connection_id' => $connectionId
    ];

    $scheduleResponse = makeRequest('POST', '/api/schedules', $scheduleData);

    if ($scheduleResponse['status'] !== 201) {
        throw new Exception('Failed to create schedule: ' . json_encode($scheduleResponse));
    }

    $scheduleId = $scheduleResponse['data']['id'];
    echo "✓ Weekly schedule created with ID: $scheduleId\n\n";

    // Step 3: Create Parameter Mode
    echo "3. Creating Parameter Mode...\n";
    $paramModeData = [
        'name' => 'Data Engineer Weekly Mode',
        'description' => 'Parameter configuration for weekly Data Engineer job collection',
        'parameters' => [
            'query' => $query,
            'page' => $page,
            'num_pages' => $num_pages,
            'date_posted' => $date_posted,
            'remote_jobs_only' => $remote_jobs_only,
            'employment_types' => $employment_types
        ],
        'connection_id' => $connectionId,
        'schedule_id' => $scheduleId
    ];

    $paramModeResponse = makeRequest('POST', '/api/parameter-modes', $paramModeData);

    if ($paramModeResponse['status'] !== 201) {
        throw new Exception('Failed to create parameter mode: ' . json_encode($paramModeResponse));
    }

    $paramModeId = $paramModeResponse['data']['id'];
    echo "✓ Parameter mode created with ID: $paramModeId\n\n";

    // Step 4: Test the setup by creating a run
    echo "4. Testing setup with a manual run...\n";
    $runData = [
        'connection_id' => $connectionId,
        'schedule_id' => $scheduleId,
        'parameter_mode_id' => $paramModeId,
        'manual_trigger' => true
    ];

    $runResponse = makeRequest('POST', '/api/runs', $runData);

    if ($runResponse['status'] !== 201) {
        throw new Exception('Failed to create run: ' . json_encode($runResponse));
    }

    $runId = $runResponse['data']['id'];
    echo "✓ Test run created with ID: $runId\n\n";

    echo "🎉 Weekly Data Engineer Jobs Collection Setup Complete!\n\n";
    echo "Summary:\n";
    echo "- Connection ID: $connectionId\n";
    echo "- Schedule ID: $scheduleId (Weekly: Monday 9 AM)\n";
    echo "- Parameter Mode ID: $paramModeId\n";
    echo "- Test Run ID: $runId\n\n";

    echo "The system will now automatically collect Data Engineer jobs every Monday at 9 AM.\n";
    echo "You can monitor runs at: http://localhost:8000/api/runs\n";
    echo "View collected data at: http://localhost:8000/api/data\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>