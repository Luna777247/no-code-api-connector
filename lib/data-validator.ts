// Data Validator - Validates data quality and schema compliance
// Inspired by Great Expectations pattern

export interface ValidationRule {
  field: string
  rule: 'required' | 'type' | 'range' | 'pattern' | 'custom' | 'unique' | 'enum'
  params?: any
  errorMessage?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  metadata: {
    totalRecords: number
    validRecords: number
    invalidRecords: number
    validationTime: number
  }
}

export interface ValidationError {
  field: string
  rule: string
  message: string
  value?: any
  recordIndex?: number
}

export interface ValidationWarning {
  field: string
  message: string
  value?: any
  recordIndex?: number
}

export class DataValidator {
  private rules: ValidationRule[] = []

  constructor(rules: ValidationRule[] = []) {
    this.rules = rules
  }

  // Add validation rule
  addRule(rule: ValidationRule): void {
    this.rules.push(rule)
  }

  // Validate a single record
  validateRecord(record: Record<string, any>, index?: number): { isValid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []

    for (const rule of this.rules) {
      const value = record[rule.field]
      
      switch (rule.rule) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push({
              field: rule.field,
              rule: 'required',
              message: rule.errorMessage || `Field '${rule.field}' is required`,
              value,
              recordIndex: index
            })
          }
          break

        case 'type':
          if (value !== undefined && value !== null) {
            const expectedType = rule.params.type
            const actualType = typeof value
            if (expectedType === 'array' && !Array.isArray(value)) {
              errors.push({
                field: rule.field,
                rule: 'type',
                message: rule.errorMessage || `Field '${rule.field}' must be an array`,
                value,
                recordIndex: index
              })
            } else if (expectedType !== 'array' && actualType !== expectedType) {
              errors.push({
                field: rule.field,
                rule: 'type',
                message: rule.errorMessage || `Field '${rule.field}' must be of type '${expectedType}', got '${actualType}'`,
                value,
                recordIndex: index
              })
            }
          }
          break

        case 'range':
          if (typeof value === 'number') {
            const { min, max } = rule.params
            if (min !== undefined && value < min) {
              errors.push({
                field: rule.field,
                rule: 'range',
                message: rule.errorMessage || `Field '${rule.field}' must be >= ${min}`,
                value,
                recordIndex: index
              })
            }
            if (max !== undefined && value > max) {
              errors.push({
                field: rule.field,
                rule: 'range',
                message: rule.errorMessage || `Field '${rule.field}' must be <= ${max}`,
                value,
                recordIndex: index
              })
            }
          }
          break

        case 'pattern':
          if (typeof value === 'string') {
            const pattern = new RegExp(rule.params.pattern)
            if (!pattern.test(value)) {
              errors.push({
                field: rule.field,
                rule: 'pattern',
                message: rule.errorMessage || `Field '${rule.field}' does not match pattern '${rule.params.pattern}'`,
                value,
                recordIndex: index
              })
            }
          }
          break

        case 'enum':
          if (value !== undefined && value !== null) {
            const allowedValues = rule.params.values
            if (!allowedValues.includes(value)) {
              errors.push({
                field: rule.field,
                rule: 'enum',
                message: rule.errorMessage || `Field '${rule.field}' must be one of: ${allowedValues.join(', ')}`,
                value,
                recordIndex: index
              })
            }
          }
          break

        case 'custom':
          if (rule.params.validator && typeof rule.params.validator === 'function') {
            const customResult = rule.params.validator(value, record)
            if (!customResult.isValid) {
              errors.push({
                field: rule.field,
                rule: 'custom',
                message: customResult.message || rule.errorMessage || `Custom validation failed for '${rule.field}'`,
                value,
                recordIndex: index
              })
            }
          }
          break
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Validate multiple records
  validate(records: Record<string, any>[]): ValidationResult {
    const startTime = Date.now()
    const allErrors: ValidationError[] = []
    const allWarnings: ValidationWarning[] = []
    let validRecords = 0
    let invalidRecords = 0

    // Track unique values for duplicate detection
    const uniqueFields = this.rules.filter(r => r.rule === 'unique').map(r => r.field)
    const uniqueValueSets: Map<string, Set<any>> = new Map()
    uniqueFields.forEach(field => uniqueValueSets.set(field, new Set()))

    records.forEach((record, index) => {
      const { isValid, errors, warnings } = this.validateRecord(record, index)
      
      if (isValid) {
        validRecords++
      } else {
        invalidRecords++
      }

      allErrors.push(...errors)
      allWarnings.push(...warnings)

      // Check uniqueness
      uniqueFields.forEach(field => {
        const value = record[field]
        const valueSet = uniqueValueSets.get(field)!
        if (value !== undefined && value !== null) {
          if (valueSet.has(value)) {
            allErrors.push({
              field,
              rule: 'unique',
              message: `Duplicate value '${value}' found for field '${field}'`,
              value,
              recordIndex: index
            })
            invalidRecords++
          } else {
            valueSet.add(value)
          }
        }
      })
    })

    const duration = Date.now() - startTime

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      metadata: {
        totalRecords: records.length,
        validRecords,
        invalidRecords,
        validationTime: duration
      }
    }
  }

  // Suggest validation rules based on data profiling
  static suggestRules(records: Record<string, any>[]): ValidationRule[] {
    if (records.length === 0) return []

    const suggestedRules: ValidationRule[] = []
    const fields = Object.keys(records[0])

    fields.forEach(field => {
      const values = records.map(r => r[field]).filter(v => v !== undefined && v !== null)
      
      if (values.length === 0) return

      // Check if field is always present (required)
      if (values.length === records.length) {
        suggestedRules.push({
          field,
          rule: 'required',
          errorMessage: `Field '${field}' is required`
        })
      }

      // Detect data type
      const types = new Set(values.map(v => Array.isArray(v) ? 'array' : typeof v))
      if (types.size === 1) {
        const type = Array.from(types)[0]
        suggestedRules.push({
          field,
          rule: 'type',
          params: { type },
          errorMessage: `Field '${field}' must be of type '${type}'`
        })
      }

      // Detect numeric ranges
      if (values.every(v => typeof v === 'number')) {
        const min = Math.min(...values)
        const max = Math.max(...values)
        suggestedRules.push({
          field,
          rule: 'range',
          params: { min, max },
          errorMessage: `Field '${field}' must be between ${min} and ${max}`
        })
      }

      // Detect enums (if small set of unique values)
      const uniqueValues = Array.from(new Set(values))
      if (uniqueValues.length <= 10 && uniqueValues.length < values.length * 0.1) {
        suggestedRules.push({
          field,
          rule: 'enum',
          params: { values: uniqueValues },
          errorMessage: `Field '${field}' must be one of the allowed values`
        })
      }

      // Detect email pattern
      if (values.every(v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))) {
        suggestedRules.push({
          field,
          rule: 'pattern',
          params: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
          errorMessage: `Field '${field}' must be a valid email address`
        })
      }
    })

    return suggestedRules
  }
}
