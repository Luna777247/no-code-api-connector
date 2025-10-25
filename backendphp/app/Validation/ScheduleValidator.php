<?php

namespace App\Validation;

/**
 * Validator for Schedule data
 */
class ScheduleValidator extends BaseValidator
{
    /**
     * Validate schedule data for creation
     */
    public function validate(array $data): bool
    {
        $this->reset();
        $this->data = $data;

        // Required fields
        $this->validateRequired('connectionId', $data['connectionId'] ?? null);
        $this->validateRequired('connectionName', $data['connectionName'] ?? null);
        $this->validateRequired('scheduleType', $data['scheduleType'] ?? null);

        // String validations
        if (isset($data['connectionName'])) {
            $this->validateStringLength('connectionName', $this->sanitizeString($data['connectionName']), 1, 100);
        }

        if (isset($data['description'])) {
            $this->validateStringLength('description', $this->sanitizeString($data['description']), null, 500);
        }

        // Schedule type validation
        if (isset($data['scheduleType'])) {
            $allowedTypes = ['once', 'hourly', 'daily', 'weekly', 'monthly', 'custom'];
            $this->validateInArray('scheduleType', $data['scheduleType'], $allowedTypes);
        }

        // Cron expression validation
        if (isset($data['cronExpression'])) {
            $this->validateCronExpression('cronExpression', $data['cronExpression']);
        }

        // Interval validation (for interval-based schedules)
        if (isset($data['interval'])) {
            $this->validateNumeric('interval', $data['interval'], 1, 525600); // 1 minute to 1 year
        }

        // Timezone validation
        if (isset($data['timezone'])) {
            $this->validateTimezone('timezone', $data['timezone']);
        }

        // Boolean validations
        if (isset($data['isActive'])) {
            $this->validateBoolean('isActive', $data['isActive']);
        }

        // Date validations
        if (isset($data['startDate'])) {
            $this->validateDate('startDate', $data['startDate']);
        }

        if (isset($data['endDate'])) {
            $this->validateDate('endDate', $data['endDate']);
        }

        // Validate date range
        if (isset($data['startDate']) && isset($data['endDate'])) {
            $this->validateDateRange($data['startDate'], $data['endDate']);
        }

        // Parameters validation
        if (isset($data['parameters'])) {
            $this->validateArray('parameters', $data['parameters'], 0, 100); // Max 100 parameters
        }

        return !$this->hasErrors();
    }

    /**
     * Validate schedule data for updates
     */
    public function validateUpdate(array $data): bool
    {
        $this->reset();
        $this->data = $data;

        // For updates, all fields are optional but must be valid if provided

        if (isset($data['connectionName'])) {
            $this->validateStringLength('connectionName', $this->sanitizeString($data['connectionName']), 1, 100);
        }

        if (isset($data['description'])) {
            $this->validateStringLength('description', $this->sanitizeString($data['description']), null, 500);
        }

        if (isset($data['scheduleType'])) {
            $allowedTypes = ['once', 'hourly', 'daily', 'weekly', 'monthly', 'custom'];
            $this->validateInArray('scheduleType', $data['scheduleType'], $allowedTypes);
        }

        if (isset($data['cronExpression'])) {
            $this->validateCronExpression('cronExpression', $data['cronExpression']);
        }

        if (isset($data['interval'])) {
            $this->validateNumeric('interval', $data['interval'], 1, 525600);
        }

        if (isset($data['timezone'])) {
            $this->validateTimezone('timezone', $data['timezone']);
        }

        if (isset($data['isActive'])) {
            $this->validateBoolean('isActive', $data['isActive']);
        }

        if (isset($data['startDate'])) {
            $this->validateDate('startDate', $data['startDate']);
        }

        if (isset($data['endDate'])) {
            $this->validateDate('endDate', $data['endDate']);
        }

        if (isset($data['startDate']) && isset($data['endDate'])) {
            $this->validateDateRange($data['startDate'], $data['endDate']);
        }

        if (isset($data['parameters'])) {
            $this->validateArray('parameters', $data['parameters'], 0, 100);
        }

        return !$this->hasErrors();
    }

    /**
     * Validate timezone
     */
    private function validateTimezone(string $field, string $timezone): void
    {
        try {
            new \DateTimeZone($timezone);
        } catch (\Exception $e) {
            $this->errors[$field] = "Field '{$field}' must be a valid timezone";
        }
    }

    /**
     * Validate date format
     */
    private function validateDate(string $field, string $date): void
    {
        $formats = ['Y-m-d', 'Y-m-d H:i:s', 'c'];

        $valid = false;
        foreach ($formats as $format) {
            $parsed = \DateTime::createFromFormat($format, $date);
            if ($parsed !== false && $parsed->format($format) === $date) {
                $valid = true;
                break;
            }
        }

        if (!$valid) {
            $this->errors[$field] = "Field '{$field}' must be a valid date";
        }
    }

    /**
     * Validate date range
     */
    private function validateDateRange(string $startDate, string $endDate): void
    {
        try {
            $start = new \DateTime($startDate);
            $end = new \DateTime($endDate);

            if ($start >= $end) {
                $this->errors['dateRange'] = "Start date must be before end date";
            }
        } catch (\Exception $e) {
            $this->errors['dateRange'] = "Invalid date range";
        }
    }
}