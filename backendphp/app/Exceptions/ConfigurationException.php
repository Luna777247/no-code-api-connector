<?php

namespace App\Exceptions;

/**
 * Exception for configuration-related errors
 */
class ConfigurationException extends AppException
{
    protected $configKey;

    public function __construct(string $configKey = null, string $message = "Configuration error", array $context = [], int $code = 0, \Throwable $previous = null)
    {
        $this->configKey = $configKey;

        if ($configKey) {
            $context['configKey'] = $configKey;
        }

        parent::__construct($message, $context, $code, $previous);
    }

    public function getConfigKey(): ?string
    {
        return $this->configKey;
    }
}