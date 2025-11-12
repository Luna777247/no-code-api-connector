<?php
namespace App\Services;

use App\Config\Database;

class MongoUnitOfWork implements UnitOfWorkInterface
{
    private bool $inTransaction = false;
    private array $operations = [];

    public function beginTransaction(): void
    {
        if ($this->inTransaction) {
            throw new \RuntimeException('Transaction already in progress');
        }
        $this->inTransaction = true;
        $this->operations = [];
    }

    public function commit(): void
    {
        if (!$this->inTransaction) {
            throw new \RuntimeException('No transaction in progress');
        }

        // Execute all operations
        foreach ($this->operations as $operation) {
            try {
                call_user_func($operation);
            } catch (\Exception $e) {
                $this->rollback();
                throw $e;
            }
        }

        $this->inTransaction = false;
        $this->operations = [];
    }

    public function rollback(): void
    {
        if (!$this->inTransaction) {
            throw new \RuntimeException('No transaction in progress');
        }

        $this->inTransaction = false;
        $this->operations = [];
    }

    /**
     * Add an operation to be executed in the transaction
     *
     * @param callable $operation
     */
    public function addOperation(callable $operation): void
    {
        if (!$this->inTransaction) {
            throw new \RuntimeException('No transaction in progress');
        }
        $this->operations[] = $operation;
    }

    public function executeInTransaction(callable $callback)
    {
        $this->beginTransaction();

        try {
            $result = $callback($this);
            $this->commit();
            return $result;
        } catch (\Exception $e) {
            $this->rollback();
            throw $e;
        }
    }

    /**
     * Check if currently in transaction
     */
    public function isInTransaction(): bool
    {
        return $this->inTransaction;
    }
}