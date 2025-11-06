<?php
$ch = curl_init('http://localhost:8000/api/runs');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo 'HTTP Code: ' . $httpCode . PHP_EOL;
if ($httpCode === 0) {
    echo 'Backend server not running or connection failed' . PHP_EOL;
} else {
    echo 'Backend server is running' . PHP_EOL;
    echo 'Response: ' . substr($response, 0, 200) . '...' . PHP_EOL;
}