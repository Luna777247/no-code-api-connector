<?php

namespace App\Validation;

/**
 * Validator for ParameterMode data
 */
class ParameterModeValidator extends BaseValidator
{
    /**
     * Validate parameter mode data for creation
     */
    public function validate(array $data): bool
    {
        $this->reset();
        $this->data = $data;

        // Required fields
        $this->validateRequired('name', $data['name'] ?? null);
        $this->validateRequired('type', $data['type'] ?? null);

        // String validations
        if (isset($data['name'])) {
            $this->validateStringLength('name', $this->sanitizeString($data['name']), 1, 100);
        }

        if (isset($data['description'])) {
            $this->validateStringLength('description', $this->sanitizeString($data['description']), null, 500);
        }

        // Type validation
        if (isset($data['type'])) {
            $allowedTypes = ['static', 'dynamic', 'query', 'header', 'path', 'form'];
            $this->validateInArray('type', $data['type'], $allowedTypes);
        }

        // Value validation based on type
        if (isset($data['type']) && isset($data['value'])) {
            $this->validateValueByType($data['type'], $data['value']);
        }

        // Configuration validation
        if (isset($data['config'])) {
            $this->validateArray('config', $data['config'], 0, 50); // Max 50 config items
        }

        // Boolean validations
        if (isset($data['isActive'])) {
            $this->validateBoolean('isActive', $data['isActive']);
        }

        if (isset($data['required'])) {
            $this->validateBoolean('required', $data['required']);
        }

        // Validation rules
        if (isset($data['validation'])) {
            $this->validateValidationRules($data['validation']);
        }

        return !$this->hasErrors();
    }

    /**
     * Validate parameter mode data for updates
     */
    public function validateUpdate(array $data): bool
    {
        $this->reset();
        $this->data = $data;

        // For updates, fields are optional but must be valid if provided

        if (isset($data['name'])) {
            $this->validateStringLength('name', $this->sanitizeString($data['name']), 1, 100);
        }

        if (isset($data['description'])) {
            $this->validateStringLength('description', $this->sanitizeString($data['description']), null, 500);
        }

        if (isset($data['type'])) {
            $allowedTypes = ['static', 'dynamic', 'query', 'header', 'path', 'form'];
            $this->validateInArray('type', $data['type'], $allowedTypes);
        }

        if (isset($data['type']) && isset($data['value'])) {
            $this->validateValueByType($data['type'], $data['value']);
        }

        if (isset($data['config'])) {
            $this->validateArray('config', $data['config'], 0, 50);
        }

        if (isset($data['isActive'])) {
            $this->validateBoolean('isActive', $data['isActive']);
        }

        if (isset($data['required'])) {
            $this->validateBoolean('required', $data['required']);
        }

        if (isset($data['validation'])) {
            $this->validateValidationRules($data['validation']);
        }

        return !$this->hasErrors();
    }

    /**
     * Validate value based on parameter type
     */
    private function validateValueByType(string $type, $value): void
    {
        switch ($type) {
            case 'static':
                // Static values can be any type, but we'll validate string length if it's a string
                if (is_string($value)) {
                    $this->validateStringLength('value', $value, null, 1000);
                }
                break;

            case 'dynamic':
                // Dynamic values should be expressions or references
                if (is_string($value)) {
                    $this->validateStringLength('value', $value, 1, 500);
                    // Could add more specific validation for expressions
                }
                break;

            case 'query':
            case 'header':
            case 'path':
            case 'form':
                // These should typically be strings
                if (!is_string($value)) {
                    $this->errors['value'] = "Value for type '{$type}' must be a string";
                } else {
                    $this->validateStringLength('value', $value, null, 500);
                }
                break;
        }
    }

    /**
     * Validate validation rules
     */
    private function validateValidationRules(array $validation): void
    {
        $allowedRules = ['required', 'min', 'max', 'pattern', 'enum', 'type'];

        foreach ($validation as $rule => $value) {
            if (!in_array($rule, $allowedRules)) {
                $this->errors["validation.{$rule}"] = "Unknown validation rule: {$rule}";
                continue;
            }

            // Validate rule values
            switch ($rule) {
                case 'min':
                case 'max':
                    if (!is_numeric($value)) {
                        $this->errors["validation.{$rule}"] = "Validation rule '{$rule}' must be numeric";
                    }
                    break;

                case 'pattern':
                    if (!is_string($value)) {
                        $this->errors["validation.{$rule}"] = "Validation rule '{$rule}' must be a string";
                    }
                    break;

                case 'enum':
                    if (!is_array($value)) {
                        $this->errors["validation.{$rule}"] = "Validation rule '{$rule}' must be an array";
                    }
                    break;

                case 'type':
                    $allowedTypes = ['string', 'number', 'boolean', 'array', 'object'];
                    if (!in_array($value, $allowedTypes)) {
                        $this->errors["validation.{$rule}"] = "Validation rule '{$rule}' must be one of: " . implode(', ', $allowedTypes);
                    }
                    break;
            }
        }
    }
}