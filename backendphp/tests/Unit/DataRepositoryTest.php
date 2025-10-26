<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Repositories\DataRepository;

class DataRepositoryTest extends TestCase
{
    private DataRepository $repository;

    protected function setUp(): void
    {
        $this->repository = new DataRepository();
    }

    public function testSearchAcrossCollectionsMethodExists()
    {
        $this->assertTrue(method_exists($this->repository, 'searchAcrossCollections'), 'searchAcrossCollections method exists');
    }

    public function testSearchInCollectionMethodExists()
    {
        $this->assertTrue(method_exists($this->repository, 'searchInCollection'), 'searchInCollection method exists');
    }

    public function testGetExportDataMethodExists()
    {
        $this->assertTrue(method_exists($this->repository, 'getExportData'), 'getExportData method exists');
    }

    public function testNormalizeDocumentMethodExists()
    {
        $this->assertTrue(method_exists($this->repository, 'normalizeDocument'), 'normalizeDocument method exists');
    }
}