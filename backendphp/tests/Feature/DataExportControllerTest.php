<?php

namespace Tests\Feature;

use PHPUnit\Framework\TestCase;
use App\Controllers\DataExportController;
use App\Services\DataExportService;

class DataExportControllerTest extends TestCase
{
    private DataExportController $controller;

    protected function setUp(): void
    {
        $this->controller = new DataExportController();
    }

    public function testExportMethodExists()
    {
        $this->assertTrue(method_exists($this->controller, 'export'), 'export method exists');
        $this->assertTrue(is_callable([$this->controller, 'export']), 'export is callable');
    }

    public function testDownloadMethodExists()
    {
        $this->assertTrue(method_exists($this->controller, 'download'), 'download method exists');
    }
}