<?php
namespace App\Services;

interface UnitOfWorkInterface
{
    /**
     * Begin a transaction
     */
    public function beginTransaction(): void;

    /**
     * Commit the transaction
     */
    public function commit(): void;

    /**
     * Rollback the transaction
     */
    public function rollback(): void;

    /**
     * Execute a callback within a transaction
     *
     * @param callable $callback
     * @return mixed
     * @throws \Exception
     */
    public function executeInTransaction(callable $callback);
}