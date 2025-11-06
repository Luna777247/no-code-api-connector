<?php
$data = json_encode([
    'connectionId' => 'test',
    'apiConfig' => [
        'baseUrl' => 'https://httpbin.org/get',
        'method' => 'GET',
        'headers' => [],
        'authType' => 'none',
        'authConfig' => []
    ],
    'parameters' => [],
    'fieldMappings' => []
]);

$ch = curl_init('http://localhost:8000/api/execute-run');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo 'HTTP Code: ' . $httpCode . PHP_EOL;
echo 'Response: ' . $response . PHP_EOL;
?>