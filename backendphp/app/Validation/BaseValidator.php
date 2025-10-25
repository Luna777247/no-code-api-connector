<?php

namespace App\Validation;

use App\Exceptions\ValidationException;

/**
 * Base validation class with common validation methods
 */
abstract class BaseValidator
{
    protected array $errors = [];
    protected array $data = [];

    /**
     * Validate the given data
     */
    abstract public function validate(array $data): bool;

    /**
     * Get validation errors
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    /**
     * Check if there are validation errors
     */
    public function hasErrors(): bool
    {
        return !empty($this->errors);
    }

    /**
     * Throw ValidationException if there are errors
     */
    public function throwIfInvalid(): void
    {
        if ($this->hasErrors()) {
            throw new ValidationException($this->errors, 'Validation failed');
        }
    }

    /**
     * Validate required field
     */
        protected function validateRequired(mixed $value, string $field, ?string $message = null): void
    {
        if ($value === null || $value === '' || (is_array($value) && empty($value))) {
            $this->errors[$field] = $message ?? "Field '{$field}' is required";
        }
    }

    /**
     * Validate string length
     */
        protected function validateStringLength(string $value, string $field, ?int $min = null, ?int $max = null): void
    {
        $length = strlen($value);

        if ($min !== null && $length < $min) {
            $this->errors[$field] = "Field '{$field}' must be at least {$min} characters long";
        }

        if ($max !== null && $length > $max) {
            $this->errors[$field] = "Field '{$field}' must not exceed {$max} characters";
        }
    }

    /**
     * Validate URL format
     */
    protected function validateUrl(string $field, string $value): void
    {
        if (!filter_var($value, FILTER_VALIDATE_URL)) {
            $this->errors[$field] = "Field '{$field}' must be a valid URL";
        }
    }

    /**
     * Validate email format
     */
    protected function validateEmail(string $field, string $value): void
    {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field] = "Field '{$field}' must be a valid email address";
        }
    }

    /**
     * Validate numeric value
     */
    protected function validateNumeric(string $field, $value, ?int $min = null, ?int $max = null): void
    {
        if (!is_numeric($value)) {
            $this->errors[$field] = "Field '{$field}' must be a number";
            return;
        }

        $num = (float)$value;

        if ($min !== null && $num < $min) {
            $this->errors[$field] = "Field '{$field}' must be at least {$min}";
        }

        if ($max !== null && $num > $max) {
            $this->errors[$field] = "Field '{$field}' must not exceed {$max}";
        }
    }

    /**
     * Validate value is in allowed list
     */
    protected function validateInArray(string $field, $value, array $allowedValues): void
    {
        if (!in_array($value, $allowedValues, true)) {
            $allowed = implode(', ', $allowedValues);
            $this->errors[$field] = "Field '{$field}' must be one of: {$allowed}";
        }
    }

    /**
     * Validate boolean value
     */
    protected function validateBoolean(string $field, $value): void
    {
        if (!is_bool($value) && !in_array($value, ['true', 'false', '1', '0', true, false, 1, 0], true)) {
            $this->errors[$field] = "Field '{$field}' must be a boolean value";
        }
    }

    /**
     * Validate array structure
     */
    protected function validateArray(string $field, $value, ?int $minItems = null, ?int $maxItems = null): void
    {
        if (!is_array($value)) {
            $this->errors[$field] = "Field '{$field}' must be an array";
            return;
        }

        $count = count($value);

        if ($minItems !== null && $count < $minItems) {
            $this->errors[$field] = "Field '{$field}' must contain at least {$minItems} items";
        }

        if ($maxItems !== null && $count > $maxItems) {
            $this->errors[$field] = "Field '{$field}' must not contain more than {$maxItems} items";
        }
    }

    /**
     * Validate cron expression format
     */
    protected function validateCronExpression(string $field, string $value): void
    {
        // Basic cron validation - should have 5 or 6 space-separated parts
        $parts = explode(' ', $value);
        if (count($parts) < 5 || count($parts) > 6) {
            $this->errors[$field] = "Field '{$field}' must be a valid cron expression";
            return;
        }

        // More detailed validation could be added here
        // For now, just check that it has the right number of parts
    }

    /**
     * Sanitize string input
     */
    protected function sanitizeString(string $value): string
    {
        return trim(strip_tags($value));
    }

    /**
     * Reset validation state
     */
    protected function reset(): void
    {
        $this->errors = [];
        $this->data = [];
    }
}