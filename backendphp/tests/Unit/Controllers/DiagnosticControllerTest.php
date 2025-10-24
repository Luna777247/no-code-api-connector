<?php
namespace Tests\Unit\Controllers;

use App\Controllers\DiagnosticController;
use PHPUnit\Framework\TestCase;

class DiagnosticControllerTest extends TestCase
{
    private DiagnosticController $controller;

    protected function setUp(): void
    {
        $this->controller = new DiagnosticController();
    }

    public function testTestConnectionMissingBaseUrl(): void
    {
        // Mock php://input
        $this->mockInput(json_encode(['apiConfig' => []]));

        $result = $this->controller->testConnection();

        $this->assertFalse($result['success']);
        $this->assertEquals('baseUrl is required', $result['error']);
    }

    public function testTestConnectionWithValidConfig(): void
    {
        $config = [
            'apiConfig' => [
                'baseUrl' => 'https://httpbin.org/status/200',
                'method' => 'GET',
                'headers' => []
            ]
        ];

        $this->mockInput(json_encode($config));

        $result = $this->controller->testConnection();

        // Result should have success, status, statusText, and message keys
        $this->assertArrayHasKey('success', $result);
        $this->assertArrayHasKey('status', $result);
        $this->assertArrayHasKey('statusText', $result);
        $this->assertArrayHasKey('message', $result);
    }

    private function mockInput(string $data): void
    {
        // Set a global override so the controller can read test input
        // Controller reads from php://input; in tests we set a global that the controller
        // will prefer if present.
        $GLOBALS['__php_input_override'] = $data;
    }
}
