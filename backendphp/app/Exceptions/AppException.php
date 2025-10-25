<?php

namespace App\Exceptions;

/**
 * Base exception class for application-specific errors
 */
class AppException extends \Exception
{
    protected $context = [];

    public function __construct(string $message = "", array $context = [], int $code = 0, ?\Throwable $previous = null)
    {
        $this->context = $context;
        parent::__construct($message, $code, $previous);
    }

    public function getContext(): array
    {
        return $this->context;
    }

    public function addContext(string $key, $value): self
    {
        $this->context[$key] = $value;
        return $this;
    }
}