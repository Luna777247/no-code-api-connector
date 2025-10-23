<?php
use App\Support\Router;
use App\Controllers\ScheduleController;
use App\Controllers\ConnectionController;
use App\Controllers\RunController;
use App\Controllers\DiagnosticController;
use App\Controllers\PipelineController;
use App\Controllers\DataController;
use App\Controllers\MappingController;
use App\Controllers\StatusController;
use App\Controllers\AnalyticsController;

/** @var Router $router */
$router->get('/api/schedules', [new ScheduleController(), 'index']);

// Connections CRUD
$router->get('/api/connections', [new ConnectionController(), 'index']);
$router->get('/api/connections/{id}', [new ConnectionController(), 'show']);
$router->post('/api/connections', [new ConnectionController(), 'create']);
$router->post('/api/connections/{id}', [new ConnectionController(), 'update']);
$router->put('/api/connections/{id}', [new ConnectionController(), 'update']);
$router->delete('/api/connections/{id}', [new ConnectionController(), 'delete']);

// Runs listing
$router->get('/api/runs', [new RunController(), 'index']);

// Diagnostics and pipeline
$router->post('/api/test-connection', [new DiagnosticController(), 'testConnection']);
$router->post('/api/execute-run', [new PipelineController(), 'executeRun']);

// Data & Mappings & Monitoring
$router->get('/api/data', [new DataController(), 'index']);
$router->get('/api/mappings', [new MappingController(), 'index']);
$router->get('/api/status', [new StatusController(), 'index']);
$router->get('/api/analytics/success-rate-history', [new AnalyticsController(), 'successRateHistory']);

