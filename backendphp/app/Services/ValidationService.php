<?php
namespace App\Services;

use App\Exceptions\ValidationException;
use App\Config\AppConfig;

class ValidationService
{
    /**
     * Validate schedule creation input data
     *
     * @param array $input
     * @return array Validated and sanitized data
     * @throws ValidationException
     */
    public function validateScheduleData(array $input): array
    {
        $errors = [];

        // Validate connectionId
        if (empty($input['connectionId'])) {
            $errors[] = 'connectionId is required';
        } elseif (!is_string($input['connectionId'])) {
            $errors[] = 'connectionId must be a string';
        }

        // Validate connectionName
        if (empty($input['connectionName'])) {
            $errors[] = 'connectionName is required';
        } elseif (!is_string($input['connectionName'])) {
            $errors[] = 'connectionName must be a string';
        }

        // Validate cronExpression
        $cronExpression = $input['cronExpression'] ?? '';
        if (empty($cronExpression)) {
            $errors[] = 'cronExpression is required';
        } elseif (!$this->isValidCronExpression($cronExpression)) {
            $errors[] = 'cronExpression is not a valid cron expression';
        }

        // Validate timezone
        $timezone = $input['timezone'] ?? '';
        if (empty($timezone)) {
            $errors[] = 'timezone is required';
        } elseif (!$this->isValidTimezone($timezone)) {
            $errors[] = 'timezone is not a valid timezone';
        }

        // Validate scheduleType
        $scheduleType = $input['scheduleType'] ?? 'cron';
        if (!in_array($scheduleType, AppConfig::getSupportedScheduleTypes())) {
            $errors[] = 'scheduleType must be one of: ' . implode(', ', AppConfig::getSupportedScheduleTypes());
        }

        // Validate isActive
        $isActive = $input['isActive'] ?? true;
        if (!is_bool($isActive)) {
            $errors[] = 'isActive must be a boolean';
        }

        if (!empty($errors)) {
            throw new ValidationException($errors, 'Validation failed: ' . implode(', ', $errors));
        }

        // Return sanitized data
        return [
            'connectionId' => trim($input['connectionId']),
            'connectionName' => trim($input['connectionName']),
            'description' => trim($input['description'] ?? ''),
            'scheduleType' => $scheduleType,
            'cronExpression' => $cronExpression,
            'timezone' => $timezone,
            'isActive' => $isActive,
        ];
    }

    /**
     * Validate connection creation input data
     *
     * @param array $input
     * @return array Validated and sanitized data
     * @throws ValidationException
     */
    public function validateConnectionData(array $input): array
    {
        $errors = [];

        // Validate name
        if (empty($input['name'])) {
            $errors[] = 'name is required';
        } elseif (!is_string($input['name'])) {
            $errors[] = 'name must be a string';
        }

        // Validate apiConfig
        if (empty($input['apiConfig']) || !is_array($input['apiConfig'])) {
            $errors[] = 'apiConfig is required and must be an array';
        } else {
            $apiConfig = $input['apiConfig'];

            if (empty($apiConfig['url'])) {
                $errors[] = 'apiConfig.url is required';
            } elseif (!filter_var($apiConfig['url'], FILTER_VALIDATE_URL)) {
                $errors[] = 'apiConfig.url must be a valid URL';
            }

            if (!isset($apiConfig['method']) || !in_array(strtoupper($apiConfig['method']), AppConfig::getSupportedHttpMethods())) {
                $errors[] = 'apiConfig.method must be one of: ' . implode(', ', AppConfig::getSupportedHttpMethods());
            }
        }

        if (!empty($errors)) {
            throw new ValidationException($errors, 'Validation failed: ' . implode(', ', $errors));
        }

        // Return sanitized data
        return [
            'name' => trim($input['name']),
            'description' => trim($input['description'] ?? ''),
            'apiConfig' => $input['apiConfig'],
            'schedule' => $input['schedule'] ?? null,
        ];
    }

    /**
     * Validate cron expression format
     *
     * @param string $cron
     * @return bool
     */
    private function isValidCronExpression(string $cron): bool
    {
        // Basic cron validation - 5 fields separated by spaces
        $parts = explode(' ', $cron);
        if (count($parts) !== 5) {
            return false;
        }

        // More detailed validation could be added here
        // For now, basic format check is sufficient
        return true;
    }

    /**
     * Validate timezone
     *
     * @param string $timezone
     * @return bool
     */
    private function isValidTimezone(string $timezone): bool
    {
        try {
            new \DateTimeZone($timezone);
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }
}