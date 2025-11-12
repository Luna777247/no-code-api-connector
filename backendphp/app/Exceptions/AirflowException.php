<?php

namespace App\Exceptions;

/**
 * Exception for Airflow integration errors
 */
class AirflowException extends AppException
{
    protected $dagId;
    protected $taskId;

    public function __construct(string $message = "Airflow operation failed", ?string $dagId = null, ?string $taskId = null, array $context = [], int $code = 0, ?\Throwable $previous = null)
    {
        $this->dagId = $dagId;
        $this->taskId = $taskId;

        if ($dagId) {
            $context['dagId'] = $dagId;
        }
        if ($taskId) {
            $context['taskId'] = $taskId;
        }

        parent::__construct($message, $context, $code, $previous);
    }

    public function getDagId(): ?string
    {
        return $this->dagId;
    }

    public function getTaskId(): ?string
    {
        return $this->taskId;
    }
}