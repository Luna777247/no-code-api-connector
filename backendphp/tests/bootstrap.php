<?php

// Bootstrap file for PHPUnit tests
require_once __DIR__ . '/../vendor/autoload.php';

// Load environment variables if needed
if (file_exists(__DIR__ . '/../.env')) {
    // You might want to load .env here if using vlucas/phpdotenv
}

// Set up any global test configuration
define('TESTING', true);

// You can add database setup, mock configurations, etc. here