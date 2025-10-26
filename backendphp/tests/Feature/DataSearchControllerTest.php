<?php

namespace Tests\Feature;

use PHPUnit\Framework\TestCase;
use App\Controllers\DataSearchController;
use App\Services\DataSearchService;

class DataSearchControllerTest extends TestCase
{
    private DataSearchController $controller;

    protected function setUp(): void
    {
        $this->controller = new DataSearchController();
    }

    public function testSearchMethodExists()
    {
        $this->assertTrue(method_exists($this->controller, 'search'), 'search method exists');
        $this->assertTrue(is_callable([$this->controller, 'search']), 'search is callable');
    }

    public function testColumnsMethodExists()
    {
        $this->assertTrue(method_exists($this->controller, 'columns'), 'columns method exists');
    }

    public function testFilterMethodExists()
    {
        $this->assertTrue(method_exists($this->controller, 'filter'), 'filter method exists');
    }
}