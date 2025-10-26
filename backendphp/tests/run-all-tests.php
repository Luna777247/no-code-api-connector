#!/usr/bin/env php
<?php

/**
 * Comprehensive Test Runner for Backend PHP
 * Runs PHPUnit tests and script-based tests
 */

require_once __DIR__ . '/../vendor/autoload.php';

echo "=== Backend PHP Comprehensive Test Suite ===\n\n";

$testsPassed = 0;
$testsFailed = 0;
$testResults = [];

// Function to run a command and capture output
function runCommand($command, $description) {
    global $testsPassed, $testsFailed, $testResults;

    echo "Running: $description\n";
    echo "Command: $command\n";

    $output = [];
    $returnCode = 0;

    exec($command, $output, $returnCode);

    $outputStr = implode("\n", $output);

    if ($returnCode === 0) {
        echo "✅ PASSED\n";
        $testsPassed++;
        $testResults[] = ['description' => $description, 'status' => 'PASSED', 'output' => $outputStr];
    } else {
        echo "❌ FAILED\n";
        echo "Output:\n$outputStr\n";
        $testsFailed++;
        $testResults[] = ['description' => $description, 'status' => 'FAILED', 'output' => $outputStr];
    }

    echo "\n" . str_repeat("-", 50) . "\n\n";
}

// Run PHPUnit tests
$phpunitCmd = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN' ? 'vendor\bin\phpunit' : './vendor/bin/phpunit';
runCommand("cd " . __DIR__ . "/../ && $phpunitCmd", "PHPUnit Unit & Feature Tests");

// Run individual PHP test scripts
$phpTestScripts = [
    'test_data_repo.php' => 'Data Repository Tests',
    'test_data_services.php' => 'Data Services Tests'
];

foreach ($phpTestScripts as $script => $description) {
    $scriptPath = __DIR__ . "/../scripts/$script";
    if (file_exists($scriptPath)) {
        runCommand("cd " . __DIR__ . "/../ && php scripts/$script", $description);
    }
}

// Run Python API test scripts (if Python environment is available)
$pythonTestScripts = [
    'test_connections_comprehensive.py' => 'Connection API Tests',
    'test_data_export.py' => 'Data Export API Tests',
    'test_search_filtering.py' => 'Search & Filtering API Tests',
    'test_schedules.py' => 'Schedule API Tests'
];

foreach ($pythonTestScripts as $script => $description) {
    $scriptPath = __DIR__ . "/../scripts/$script";
    if (file_exists($scriptPath)) {
        runCommand("cd " . __DIR__ . "/../ && python scripts/$script", $description);
    }
}

// Summary
echo "=== Test Summary ===\n";
echo "Tests Passed: $testsPassed\n";
echo "Tests Failed: $testsFailed\n";
echo "Total Tests: " . ($testsPassed + $testsFailed) . "\n\n";

if ($testsFailed > 0) {
    echo "❌ Some tests failed. Details:\n";
    foreach ($testResults as $result) {
        if ($result['status'] === 'FAILED') {
            echo "- {$result['description']}: FAILED\n";
        }
    }
    exit(1);
} else {
    echo "✅ All tests passed!\n";
    exit(0);
}