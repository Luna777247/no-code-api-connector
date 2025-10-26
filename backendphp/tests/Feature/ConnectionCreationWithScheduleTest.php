<?php

namespace Tests\Feature;

use PHPUnit\Framework\TestCase;
use App\Services\ConnectionService;
use App\Repositories\ConnectionRepository;
use App\Repositories\ScheduleRepository;

class ConnectionCreationWithScheduleTest extends TestCase
{
    private ConnectionService $service;

    protected function setUp(): void
    {
        $this->service = new ConnectionService();
    }

    public function testCreateConnectionWithScheduleEnabled()
    {
        // Test data for connection with schedule
        $connectionData = [
            'name' => 'Test Connection with Schedule ' . time(),
            'apiConfig' => [
                'baseUrl' => 'https://api.example.com/test',
                'method' => 'GET',
                'headers' => ['Authorization' => 'Bearer test'],
                'authType' => 'bearer'
            ],
            'schedule' => [
                'enabled' => true,
                'type' => 'daily',
                'cronExpression' => '0 2 * * *' // Daily at 2 AM
            ]
        ];

        // Create the connection
        $result = $this->service->create($connectionData);

        // Assert connection was created
        $this->assertNotNull($result, 'Connection should be created successfully');
        $this->assertArrayHasKey('id', $result, 'Result should have connection ID');
        $this->assertEquals($connectionData['name'], $result['name'], 'Connection name should match');

        // Verify schedule was created
        $scheduleRepo = new ScheduleRepository();
        $schedules = $scheduleRepo->findAll();

        $foundSchedule = false;
        foreach ($schedules as $schedule) {
            if (($schedule['connectionId'] ?? '') === ($result['id'] ?? '')) {
                $foundSchedule = true;
                $this->assertEquals($connectionData['name'], $schedule['connectionName'], 'Schedule should have correct connection name');
                $this->assertEquals($connectionData['schedule']['cronExpression'], $schedule['cronExpression'], 'Schedule should have correct cron expression');
                $this->assertStringStartsWith('api_schedule_', $schedule['dagId'] ?? '', 'Schedule should have DAG ID');
                break;
            }
        }

        $this->assertTrue($foundSchedule, 'Schedule should be created for connection with schedule enabled');
    }

    public function testCreateConnectionWithoutSchedule()
    {
        // Test data for connection without schedule
        $connectionData = [
            'name' => 'Test Connection without Schedule ' . time(),
            'apiConfig' => [
                'baseUrl' => 'https://api.example.com/test2',
                'method' => 'POST',
                'headers' => [],
                'authType' => 'none'
            ]
        ];

        // Create the connection
        $result = $this->service->create($connectionData);

        // Assert connection was created
        $this->assertNotNull($result, 'Connection should be created successfully');
        $this->assertArrayHasKey('id', $result, 'Result should have connection ID');
    }
}