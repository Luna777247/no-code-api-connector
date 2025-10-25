<?php

namespace App\Exceptions;

/**
 * Exception for validation errors
 */
class ValidationException extends AppException
{
    protected $errors = [];

    public function __construct(array $errors = [], string $message = "Validation failed", array $context = [], int $code = 0, \Throwable $previous = null)
    {
        $this->errors = $errors;
        $context['validationErrors'] = $errors;
        parent::__construct($message, $context, $code, $previous);
    }

    public function getErrors(): array
    {
        return $this->errors;
    }

    public function hasError(string $field): bool
    {
        return isset($this->errors[$field]);
    }

    public function getError(string $field): ?string
    {
        return $this->errors[$field] ?? null;
    }
}