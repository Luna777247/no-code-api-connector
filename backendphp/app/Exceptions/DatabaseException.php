<?php

namespace App\Exceptions;

/**
 * Exception for database-related errors
 */
class DatabaseException extends AppException
{
    public function __construct(string $message = "Database operation failed", array $context = [], int $code = 0, ?\Throwable $previous = null)
    {
        parent::__construct($message, $context, $code, $previous);
    }
}