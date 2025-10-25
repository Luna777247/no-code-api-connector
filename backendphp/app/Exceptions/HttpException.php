<?php

namespace App\Exceptions;

/**
 * Exception for HTTP request/response errors
 */
class HttpException extends AppException
{
    protected $statusCode;

    public function __construct(string $message = "HTTP request failed", int $statusCode = 0, array $context = [], int $code = 0, ?\Throwable $previous = null)
    {
        $this->statusCode = $statusCode;
        $context['statusCode'] = $statusCode;
        parent::__construct($message, $context, $code, $previous);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }
}