<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_that_true_is_true()
    {
        $this->assertTrue(true);
    }

    /**
     * Test basic arithmetic
     */
    public function test_basic_arithmetic()
    {
        $this->assertEquals(4, 2 + 2);
        $this->assertEquals(6, 3 * 2);
    }
}