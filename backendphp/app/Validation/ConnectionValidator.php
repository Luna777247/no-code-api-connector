<?php

namespace App\Validation;

/**
 * Validator for Connection data
 */
class ConnectionValidator extends BaseValidator
{
    /**
     * Validate connection data for creation
     */
    public function validate(array $data): bool
    {
        $this->reset();
        $this->data = $data;

        // Required fields
        $this->validateRequired('name', $data['name'] ?? null);
        $this->validateRequired('apiConfig.baseUrl', $data['apiConfig']['baseUrl'] ?? $data['baseUrl'] ?? null);

        // String validations
        if (isset($data['name'])) {
            $this->validateStringLength('name', $this->sanitizeString($data['name']), 1, 100);
        }

        if (isset($data['description'])) {
            $this->validateStringLength('description', $this->sanitizeString($data['description']), null, 500);
        }

        // URL validation
        $baseUrl = $data['apiConfig']['baseUrl'] ?? $data['baseUrl'] ?? null;
        if ($baseUrl) {
            $this->validateUrl('apiConfig.baseUrl', $baseUrl);
        }

        // Method validation
        $method = $data['apiConfig']['method'] ?? $data['method'] ?? null;
        if ($method) {
            $allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
            $this->validateInArray('apiConfig.method', strtoupper($method), $allowedMethods);
        }

        // Headers validation
        $headers = $data['apiConfig']['headers'] ?? $data['headers'] ?? null;
        if ($headers !== null) {
            $this->validateArray('apiConfig.headers', $headers, 0, 50); // Max 50 headers

            if (is_array($headers)) {
                foreach ($headers as $key => $header) {
                    if (is_array($header) && isset($header['name'])) {
                        $headerName = $this->sanitizeString($header['name']);
                        if (strlen($headerName) > 100) {
                            $this->errors["apiConfig.headers.{$key}.name"] = "Header name too long";
                        }
                    }
                }
            }
        }

        // Auth type validation
        $authType = $data['apiConfig']['authType'] ?? $data['authType'] ?? null;
        if ($authType) {
            $allowedAuthTypes = ['none', 'basic', 'bearer', 'api-key', 'oauth2'];
            $this->validateInArray('apiConfig.authType', $authType, $allowedAuthTypes);
        }

        // Auth config validation based on auth type
        if ($authType === 'basic') {
            $this->validateRequired('apiConfig.authConfig.username', $data['apiConfig']['authConfig']['username'] ?? null);
            $this->validateRequired('apiConfig.authConfig.password', $data['apiConfig']['authConfig']['password'] ?? null);
        } elseif ($authType === 'bearer') {
            $this->validateRequired('apiConfig.authConfig.token', $data['apiConfig']['authConfig']['token'] ?? null);
        } elseif ($authType === 'api-key') {
            $this->validateRequired('apiConfig.authConfig.key', $data['apiConfig']['authConfig']['key'] ?? null);
            $this->validateRequired('apiConfig.authConfig.value', $data['apiConfig']['authConfig']['value'] ?? null);
        }

        // Schedule validation
        if (isset($data['schedule'])) {
            $this->validateScheduleData($data['schedule']);
        }

        // Parameters validation
        if (isset($data['parameters'])) {
            $this->validateArray('parameters', $data['parameters'], 0, 100); // Max 100 parameters
            if (is_array($data['parameters'])) {
                foreach ($data['parameters'] as $key => $param) {
                    if (is_array($param)) {
                        if (isset($param['name'])) {
                            $this->validateStringLength("parameters.{$key}.name", $this->sanitizeString($param['name']), 1, 100);
                        }
                        if (isset($param['type'])) {
                            $allowedTypes = ['query', 'header', 'body', 'path'];
                            $this->validateInArray("parameters.{$key}.type", $param['type'], $allowedTypes);
                        }
                        if (isset($param['mode'])) {
                            $allowedModes = ['single', 'list', 'range'];
                            $this->validateInArray("parameters.{$key}.mode", $param['mode'], $allowedModes);
                        }
                    }
                }
            }
        }

        // Field mappings validation
        if (isset($data['fieldMappings'])) {
            $this->validateArray('fieldMappings', $data['fieldMappings'], 0, 200); // Max 200 field mappings
        }

        // Table name validation
        if (isset($data['tableName'])) {
            $this->validateStringLength('tableName', $this->sanitizeString($data['tableName']), 1, 100);
            // Validate table name format (alphanumeric, underscore, dash)
            if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_-]*$/', $data['tableName'])) {
                $this->errors['tableName'] = 'Table name must start with a letter and contain only letters, numbers, underscores, and dashes';
            }
        }

        // Boolean validations
        if (isset($data['isActive'])) {
            $this->validateBoolean('isActive', $data['isActive']);
        }

        return !$this->hasErrors();
    }

    /**
     * Validate schedule data
     */
    private function validateScheduleData(array $schedule): void
    {
        if (isset($schedule['enabled'])) {
            $this->validateBoolean('schedule.enabled', $schedule['enabled']);
        }

        if (isset($schedule['type'])) {
            $allowedTypes = ['once', 'hourly', 'daily', 'weekly', 'monthly', 'custom'];
            $this->validateInArray('schedule.type', $schedule['type'], $allowedTypes);
        }

        if (isset($schedule['cronExpression'])) {
            $this->validateCronExpression('schedule.cronExpression', $schedule['cronExpression']);
        }

        if (isset($schedule['interval'])) {
            $this->validateNumeric('schedule.interval', $schedule['interval'], 1, 525600); // Max 1 year in minutes
        }
    }

    /**
     * Validate connection data for updates (allows partial data)
     */
    public function validateUpdate(array $data): bool
    {
        $this->reset();
        $this->data = $data;

        // For updates, most fields are optional but if provided, they must be valid

        // String validations
        if (isset($data['name'])) {
            $this->validateStringLength('name', $this->sanitizeString($data['name']), 1, 100);
        }

        if (isset($data['description'])) {
            $this->validateStringLength('description', $this->sanitizeString($data['description']), null, 500);
        }

        // URL validation
        if (isset($data['apiConfig']['baseUrl']) || isset($data['baseUrl'])) {
            $baseUrl = $data['apiConfig']['baseUrl'] ?? $data['baseUrl'];
            $this->validateUrl('apiConfig.baseUrl', $baseUrl);
        }

        // Method validation
        if (isset($data['apiConfig']['method']) || isset($data['method'])) {
            $method = $data['apiConfig']['method'] ?? $data['method'];
            $allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
            $this->validateInArray('apiConfig.method', strtoupper($method), $allowedMethods);
        }

        // Headers validation
        if (isset($data['apiConfig']['headers']) || isset($data['headers'])) {
            $headers = $data['apiConfig']['headers'] ?? $data['headers'];
            $this->validateArray('apiConfig.headers', $headers, 0, 50);

            if (is_array($headers)) {
                foreach ($headers as $key => $header) {
                    if (is_array($header) && isset($header['name'])) {
                        $headerName = $this->sanitizeString($header['name']);
                        if (strlen($headerName) > 100) {
                            $this->errors["apiConfig.headers.{$key}.name"] = "Header name too long";
                        }
                    }
                }
            }
        }

        // Auth type validation
        if (isset($data['apiConfig']['authType']) || isset($data['authType'])) {
            $authType = $data['apiConfig']['authType'] ?? $data['authType'];
            $allowedAuthTypes = ['none', 'basic', 'bearer', 'api-key', 'oauth2'];
            $this->validateInArray('apiConfig.authType', $authType, $allowedAuthTypes);
        }

        // Schedule validation
        if (isset($data['schedule'])) {
            $this->validateScheduleData($data['schedule']);
        }

        // Parameters validation
        if (isset($data['parameters'])) {
            $this->validateArray('parameters', $data['parameters'], 0, 100); // Max 100 parameters
            if (is_array($data['parameters'])) {
                foreach ($data['parameters'] as $key => $param) {
                    if (is_array($param)) {
                        if (isset($param['name'])) {
                            $this->validateStringLength("parameters.{$key}.name", $this->sanitizeString($param['name']), 1, 100);
                        }
                        if (isset($param['type'])) {
                            $allowedTypes = ['query', 'header', 'body', 'path'];
                            $this->validateInArray("parameters.{$key}.type", $param['type'], $allowedTypes);
                        }
                        if (isset($param['mode'])) {
                            $allowedModes = ['single', 'list', 'range'];
                            $this->validateInArray("parameters.{$key}.mode", $param['mode'], $allowedModes);
                        }
                    }
                }
            }
        }

        // Field mappings validation
        if (isset($data['fieldMappings'])) {
            $this->validateArray('fieldMappings', $data['fieldMappings'], 0, 200); // Max 200 field mappings
        }

        // Table name validation
        if (isset($data['tableName'])) {
            $this->validateStringLength('tableName', $this->sanitizeString($data['tableName']), 1, 100);
            // Validate table name format (alphanumeric, underscore, dash)
            if (!preg_match('/^[a-zA-Z][a-zA-Z0-9_-]*$/', $data['tableName'])) {
                $this->errors['tableName'] = 'Table name must start with a letter and contain only letters, numbers, underscores, and dashes';
            }
        }

        // Boolean validations
        if (isset($data['isActive'])) {
            $this->validateBoolean('isActive', $data['isActive']);
        }

        return !$this->hasErrors();
    }
}