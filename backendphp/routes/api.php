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
use App\Controllers\AdminUserController;
use App\Controllers\AdminRoleController;
use App\Controllers\AdminSystemController;
use App\Controllers\AdminBackupController;
use App\Controllers\ScheduleManagementController;
use App\Controllers\ParameterModeController;
use App\Controllers\RunDetailController;
use App\Controllers\DataExportController;
use App\Controllers\DataSearchController;
use App\Controllers\ReportController;
use App\Controllers\VisualizationController;
use App\Controllers\AirflowController;

/** @var Router $router */

// ============================================
// INTEGRATOR APIs (Existing)
// ============================================
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

// ============================================
// INTEGRATOR APIs (New - Schedule Management)
// ============================================
$router->post('/api/schedules', [new ScheduleManagementController(), 'create']);
$router->put('/api/schedules/{id}', [new ScheduleManagementController(), 'update']);
$router->delete('/api/schedules/{id}', [new ScheduleManagementController(), 'delete']);
$router->get('/api/schedules/{id}/history', [new ScheduleManagementController(), 'history']);

// ============================================
// INTEGRATOR APIs (New - Parameter Modes)
// ============================================
$router->get('/api/parameter-modes', [new ParameterModeController(), 'index']);
$router->get('/api/parameter-modes/{id}', [new ParameterModeController(), 'show']);
$router->post('/api/parameter-modes', [new ParameterModeController(), 'create']);
$router->put('/api/parameter-modes/{id}', [new ParameterModeController(), 'update']);
$router->delete('/api/parameter-modes/{id}', [new ParameterModeController(), 'delete']);

// ============================================
// INTEGRATOR APIs (New - Run Details)
// ============================================
$router->get('/api/runs/{id}', [new RunDetailController(), 'show']);
$router->post('/api/runs/{id}/retry', [new RunDetailController(), 'retry']);
$router->post('/api/runs/{id}/export', [new RunDetailController(), 'export']);

// ============================================
// ANALYST/USER APIs (New - Data Export)
// ============================================
$router->post('/api/data/export', [new DataExportController(), 'export']);
$router->get('/api/data/export/{id}', [new DataExportController(), 'download']);

// ============================================
// ANALYST/USER APIs (New - Advanced Search)
// ============================================
$router->post('/api/data/search', [new DataSearchController(), 'search']);
$router->get('/api/data/columns', [new DataSearchController(), 'columns']);
$router->post('/api/data/filter', [new DataSearchController(), 'filter']);

// ============================================
// ANALYST/USER APIs (New - Reports)
// ============================================
$router->get('/api/reports', [new ReportController(), 'index']);
$router->get('/api/reports/{id}', [new ReportController(), 'show']);
$router->post('/api/reports', [new ReportController(), 'create']);
$router->delete('/api/reports/{id}', [new ReportController(), 'delete']);

// ============================================
// ANALYST/USER APIs (New - Visualization)
// ============================================
$router->get('/api/analytics/charts', [new VisualizationController(), 'charts']);
$router->get('/api/analytics/metrics', [new VisualizationController(), 'metrics']);

// ============================================
// ADMIN APIs (New - User Management)
// ============================================
$router->get('/api/admin/users', [new AdminUserController(), 'index']);
$router->get('/api/admin/users/{id}', [new AdminUserController(), 'show']);
$router->post('/api/admin/users', [new AdminUserController(), 'create']);
$router->put('/api/admin/users/{id}', [new AdminUserController(), 'update']);
$router->delete('/api/admin/users/{id}', [new AdminUserController(), 'delete']);
$router->post('/api/admin/users/{id}/reset-password', [new AdminUserController(), 'resetPassword']);

// ============================================
// ADMIN APIs (New - Role Management)
// ============================================
$router->get('/api/admin/roles', [new AdminRoleController(), 'index']);
$router->get('/api/admin/roles/{id}', [new AdminRoleController(), 'show']);
$router->post('/api/admin/roles', [new AdminRoleController(), 'create']);
$router->put('/api/admin/roles/{id}', [new AdminRoleController(), 'update']);
$router->delete('/api/admin/roles/{id}', [new AdminRoleController(), 'delete']);
$router->get('/api/admin/permissions', [new AdminRoleController(), 'permissions']);

// ============================================
// ADMIN APIs (New - System Management)
// ============================================
$router->get('/api/admin/health', [new AdminSystemController(), 'health']);
$router->get('/api/admin/health/database', [new AdminSystemController(), 'databaseHealth']);
$router->get('/api/admin/health/storage', [new AdminSystemController(), 'storageHealth']);
$router->get('/api/admin/config', [new AdminSystemController(), 'config']);
$router->put('/api/admin/config', [new AdminSystemController(), 'updateConfig']);
$router->get('/api/admin/logs', [new AdminSystemController(), 'logs']);
$router->get('/api/admin/audit-trail', [new AdminSystemController(), 'auditTrail']);

// ============================================
// ADMIN APIs (New - Backup Management)
// ============================================
$router->get('/api/admin/backups', [new AdminBackupController(), 'index']);
$router->post('/api/admin/backups', [new AdminBackupController(), 'create']);
$router->delete('/api/admin/backups/{id}', [new AdminBackupController(), 'delete']);
$router->post('/api/admin/backups/{id}/restore', [new AdminBackupController(), 'restore']);

// ============================================
// INTEGRATOR APIs (New - Airflow Scheduling)
// ============================================
$router->post('/api/schedules/{id}/trigger', [new AirflowController(), 'triggerRun']);
$router->get('/api/schedules/{id}/airflow-status', [new AirflowController(), 'getStatus']);
$router->get('/api/schedules/{id}/airflow-history', [new AirflowController(), 'getHistory']);
$router->post('/api/schedules/{id}/pause', [new AirflowController(), 'pause']);
$router->post('/api/schedules/{id}/resume', [new AirflowController(), 'resume']);
