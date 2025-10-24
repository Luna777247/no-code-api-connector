<?php
namespace Tests\Unit\Support;

use App\Support\Router;
use PHPUnit\Framework\TestCase;

class RouterTest extends TestCase
{
    private Router $router;

    protected function setUp(): void
    {
        $this->router = new Router();
    }

    public function testGetRouteRegistration(): void
    {
        $called = false;
        $handler = function() use (&$called) {
            $called = true;
            return ['success' => true];
        };

        $this->router->get('/api/test', $handler);
        $result = $this->router->dispatch('GET', '/api/test');

        $this->assertTrue($called);
        $this->assertEquals(['success' => true], $result);
    }

    public function testPostRouteRegistration(): void
    {
        $called = false;
        $handler = function() use (&$called) {
            $called = true;
            return ['method' => 'POST'];
        };

        $this->router->post('/api/create', $handler);
        $result = $this->router->dispatch('POST', '/api/create');

        $this->assertTrue($called);
        $this->assertEquals(['method' => 'POST'], $result);
    }

    public function testRouteWithParameters(): void
    {
        $handler = function($id) {
            return ['id' => $id];
        };

        $this->router->get('/api/items/{id}', $handler);
        $result = $this->router->dispatch('GET', '/api/items/123');

        $this->assertEquals(['id' => '123'], $result);
    }

    public function testRouteNotFound(): void
    {
        $result = $this->router->dispatch('GET', '/api/nonexistent');
        $this->assertEquals(['error' => 'Not Found'], $result);
    }

    public function testTrailingSlashNormalization(): void
    {
        $called = false;
        $handler = function() use (&$called) {
            $called = true;
            return ['success' => true];
        };

        $this->router->get('/api/test', $handler);
        $result = $this->router->dispatch('GET', '/api/test/');

        $this->assertTrue($called);
    }
}
