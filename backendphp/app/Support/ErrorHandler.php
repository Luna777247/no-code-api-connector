<?php

namespace App\Support;

use App\Exceptions\AppException;
use App\Config\AppConfig;

/**
 * Centralized error handler for logging and processing exceptions
 */
class ErrorHandler
{
    /**
     * Handle an exception with logging and optional response formatting
     */
    public static function handle(\Throwable $exception, bool $returnResponse = false): ?array
    {
        $errorId = uniqid('err_', true);
        $context = [
            'errorId' => $errorId,
            'exception' => get_class($exception),
            'message' => $exception->getMessage(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'timestamp' => date('Y-m-d H:i:s')
        ];

        // Add additional context for AppException
        if ($exception instanceof AppException) {
            $context = array_merge($context, $exception->getContext());
        }

        // Log the error
        self::logError($context);

        if ($returnResponse) {
            return self::formatErrorResponse($exception, $errorId);
        }

        return null;
    }

    /**
     * Log error to configured logging system
     */
    private static function logError(array $context): void
    {
        $logLevel = self::getLogLevel($context['exception']);
        $logMessage = self::formatLogMessage($context);

        // In production, this should integrate with a proper logging system
        // For now, we'll use error_log
        error_log("[$logLevel] " . $logMessage);

        // If in development, also log to a file
        if (!AppConfig::isProduction()) {
            $logFile = AppConfig::getLogFilePath();
            if ($logFile) {
                $logDir = dirname($logFile);
                if (!is_dir($logDir)) {
                    mkdir($logDir, 0755, true);
                }
                file_put_contents($logFile, $logMessage . PHP_EOL, FILE_APPEND);
            }
        }
    }

    /**
     * Get appropriate log level based on exception type
     */
    private static function getLogLevel(string $exceptionClass): string
    {
        $criticalExceptions = [
            'App\Exceptions\DatabaseException',
            'App\Exceptions\ConfigurationException',
        ];

        $warningExceptions = [
            'App\Exceptions\ValidationException',
            'App\Exceptions\HttpException',
        ];

        if (in_array($exceptionClass, $criticalExceptions)) {
            return 'CRITICAL';
        }

        if (in_array($exceptionClass, $warningExceptions)) {
            return 'WARNING';
        }

        return 'ERROR';
    }

    /**
     * Format log message
     */
    private static function formatLogMessage(array $context): string
    {
        $timestamp = $context['timestamp'];
        $errorId = $context['errorId'];
        $exception = $context['exception'];
        $message = $context['message'];
        $file = $context['file'];
        $line = $context['line'];

        $logMessage = "[$timestamp] Error ID: $errorId | $exception: $message in $file:$line";

        // Add additional context if available
        if (isset($context['statusCode'])) {
            $logMessage .= " | HTTP Status: {$context['statusCode']}";
        }

        if (isset($context['dagId'])) {
            $logMessage .= " | DAG ID: {$context['dagId']}";
        }

        if (isset($context['configKey'])) {
            $logMessage .= " | Config Key: {$context['configKey']}";
        }

        return $logMessage;
    }

    /**
     * Format error response for API
     */
    private static function formatErrorResponse(\Throwable $exception, string $errorId): array
    {
        $response = [
            'success' => false,
            'error' => [
                'id' => $errorId,
                'message' => $exception->getMessage(),
                'type' => self::getErrorType($exception)
            ]
        ];

        // Add validation errors if it's a ValidationException
        if ($exception instanceof \App\Exceptions\ValidationException) {
            $response['error']['details'] = $exception->getErrors();
        }

        // In development, include more debug info
        if (!AppConfig::isProduction()) {
            $response['error']['debug'] = [
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => explode("\n", $exception->getTraceAsString())
            ];
        }

        return $response;
    }

    /**
     * Get user-friendly error type
     */
    private static function getErrorType(\Throwable $exception): string
    {
        $typeMap = [
            'App\Exceptions\DatabaseException' => 'database_error',
            'App\Exceptions\HttpException' => 'http_error',
            'App\Exceptions\ValidationException' => 'validation_error',
            'App\Exceptions\AirflowException' => 'airflow_error',
            'App\Exceptions\ConfigurationException' => 'configuration_error',
        ];

        return $typeMap[get_class($exception)] ?? 'internal_error';
    }
}