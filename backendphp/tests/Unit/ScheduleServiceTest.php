<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\ScheduleService;

class ScheduleServiceTest extends TestCase
{
    private ScheduleService $service;

    protected function setUp(): void
    {
        $this->service = new ScheduleService();
    }

    public function testListSchedulesMethodExists()
    {
        $this->assertTrue(method_exists($this->service, 'listSchedules'), 'listSchedules method exists');
        $this->assertTrue(is_callable([$this->service, 'listSchedules']), 'listSchedules is callable');
    }

    public function testCreateScheduleMethodExists()
    {
        $this->assertTrue(method_exists($this->service, 'createSchedule'), 'createSchedule method exists');
    }

    public function testUpdateScheduleMethodExists()
    {
        $this->assertTrue(method_exists($this->service, 'updateSchedule'), 'updateSchedule method exists');
    }

    public function testDeleteScheduleMethodExists()
    {
        $this->assertTrue(method_exists($this->service, 'deleteSchedule'), 'deleteSchedule method exists');
    }

    public function testListSchedulesReturnsArray()
    {
        $result = $this->service->listSchedules();
        $this->assertIsArray($result, 'listSchedules should return an array');
    }
}