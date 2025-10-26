<?php

namespace App\Validation;

use App\Exceptions\ValidationException;

/**
 * Validation helper for controllers
 */
class ValidationHelper
{
    /**
     * Validate request data using a validator
     */
    public static function validateRequest(BaseValidator $validator, array $data): array
    {
        if (!$validator->validate($data)) {
            $errors = $validator->getErrors();
            error_log('Validation failed. Data: ' . json_encode($data));
            error_log('Validation errors: ' . json_encode($errors));
            throw new ValidationException(
                $errors,
                'Request validation failed'
            );
        }

        return $data;
    }

    /**
     * Validate update request data using a validator
     */
    public static function validateUpdateRequest(BaseValidator $validator, array $data): array
    {
        if (!$validator->validateUpdate($data)) {
            throw new ValidationException(
                $validator->getErrors(),
                'Update request validation failed'
            );
        }

        return $data;
    }

    /**
     * Get JSON input from request body
     */
    public static function getJsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new ValidationException(
                ['body' => 'Invalid JSON in request body'],
                'Request body must be valid JSON'
            );
        }

        return $input ?? [];
    }

    /**
     * Validate required fields in array
     */
    public static function validateRequiredFields(array $data, array $requiredFields): void
    {
        $errors = [];

        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || $data[$field] === null || $data[$field] === '') {
                $errors[$field] = "Field '{$field}' is required";
            }
        }

        if (!empty($errors)) {
            throw new ValidationException($errors, 'Missing required fields');
        }
    }

    /**
     * Sanitize input data
     */
    public static function sanitizeInput(array $data): array
    {
        $sanitized = [];

        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $sanitized[$key] = trim(strip_tags($value));
            } elseif (is_array($value)) {
                $sanitized[$key] = self::sanitizeInput($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    /**
     * Validate ID parameter
     */
    public static function validateId(string $id): string
    {
        if (empty($id)) {
            throw new ValidationException(
                ['id' => 'ID parameter is required'],
                'Invalid ID parameter'
            );
        }

        // Basic MongoDB ObjectId validation
        if (!preg_match('/^[a-f\d]{24}$/i', $id)) {
            throw new ValidationException(
                ['id' => 'ID must be a valid 24-character hexadecimal string'],
                'Invalid ID format'
            );
        }

        return $id;
    }
}