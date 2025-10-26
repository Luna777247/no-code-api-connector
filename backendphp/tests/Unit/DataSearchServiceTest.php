<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\DataSearchService;
use App\Repositories\DataRepository;

class DataSearchServiceTest extends TestCase
{
    private DataSearchService $service;

    protected function setUp(): void
    {
        $this->service = new DataSearchService();
    }

    public function testSearchMethodExists()
    {
        $this->assertTrue(method_exists($this->service, 'search'), 'search method exists');
        $this->assertTrue(is_callable([$this->service, 'search']), 'search is callable');
    }

    public function testApplyFilterMethodExists()
    {
        $this->assertTrue(method_exists($this->service, 'applyFilter'), 'applyFilter method exists');
    }

    public function testSearchReturnsExpectedStructure()
    {
        // Test that search returns proper structure
        $result = $this->service->search('', [], 1, 10, 'createdAt', 'desc');

        $this->assertIsArray($result, 'Search result should be an array');
        $this->assertArrayHasKey('total', $result, 'Result should have total count');
        $this->assertArrayHasKey('results', $result, 'Result should have results array');
        $this->assertArrayHasKey('pagination', $result, 'Result should have pagination info');
        $this->assertArrayHasKey('query', $result, 'Result should have query info');
        $this->assertArrayHasKey('filters', $result, 'Result should have filters info');
    }
}