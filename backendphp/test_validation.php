<?php

require_once __DIR__ . '/vendor/autoload.php';

use App\Validation\ConnectionValidator;

// Test data that should match the new structure
$testData = [
    'name' => 'Test Connection',
    'baseUrl' => 'https://api.example.com/data',
    'method' => 'GET',
    'headers' => [
        ['name' => 'Authorization', 'value' => 'Bearer token123'],
        ['name' => 'Content-Type', 'value' => 'application/json']
    ],
    'authType' => 'bearer',
    'authConfig' => [
        'token' => 'test-token'
    ],
    'description' => 'Test connection for validation',
    'isActive' => true
];

$validator = new ConnectionValidator();
$result = $validator->validate($testData);

echo "Validation result: " . ($result ? "PASS" : "FAIL") . "\n";

if (!$result) {
    echo "Errors:\n";
    print_r($validator->getErrors());
} else {
    echo "No validation errors found.\n";
}