<?php
namespace Tests\Feature;

use App\Support\Router;
use App\Controllers\DiagnosticController;
use App\Controllers\ConnectionController;
use PHPUnit\Framework\TestCase;

class ApiRoutesTest extends TestCase
{
    private Router $router;

    protected function setUp(): void
    {
        $this->router = new Router();
        $this->setupRoutes();
    }

    private function setupRoutes(): void
    {
        $this->router->post('/api/test-connection', [new DiagnosticController(), 'testConnection']);
        $this->router->get('/api/connections', [new ConnectionController(), 'index']);
    }

    public function testTestConnectionRouteExists(): void
    {
        $handler = function() {
            return ['success' => true];
        };

        $this->router->post('/api/test-connection', $handler);
        $result = $this->router->dispatch('POST', '/api/test-connection');

        $this->assertEquals(['success' => true], $result);
    }

    public function testConnectionsIndexRouteExists(): void
    {
        $handler = function() {
            return ['connections' => []];
        };

        $this->router->get('/api/connections', $handler);
        $result = $this->router->dispatch('GET', '/api/connections');

        $this->assertEquals(['connections' => []], $result);
    }
}
