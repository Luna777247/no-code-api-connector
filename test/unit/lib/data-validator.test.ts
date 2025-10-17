import { DataValidator, ValidationRule, ValidationResult } from '@/lib/data-validator';

describe('DataValidator', () => {
  describe('constructor', () => {
    test('should create validator with empty rules by default', () => {
      const validator = new DataValidator();
      expect(validator).toBeDefined();
    });

    test('should create validator with initial rules', () => {
      const rules: ValidationRule[] = [
        { field: 'name', rule: 'required' }
      ];
      const validator = new DataValidator(rules);
      expect(validator).toBeDefined();
    });
  });

  describe('addRule', () => {
    test('should add validation rule', () => {
      const validator = new DataValidator();
      const rule: ValidationRule = { field: 'email', rule: 'pattern', params: { pattern: '.*@.*' } };

      validator.addRule(rule);

      // Test by validating a record
      const result = validator.validateRecord({ email: 'test@example.com' });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateRecord', () => {
    test('should validate required fields', () => {
      const rules: ValidationRule[] = [
        { field: 'name', rule: 'required' },
        { field: 'email', rule: 'required' }
      ];
      const validator = new DataValidator(rules);

      // Valid record
      const validResult = validator.validateRecord({ name: 'John', email: 'john@example.com' });
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      // Invalid record - missing required field
      const invalidResult = validator.validateRecord({ name: 'John' });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.errors[0].field).toBe('email');
      expect(invalidResult.errors[0].rule).toBe('required');
    });

    test('should validate data types', () => {
      const rules: ValidationRule[] = [
        { field: 'age', rule: 'type', params: { type: 'number' } },
        { field: 'tags', rule: 'type', params: { type: 'array' } },
        { field: 'name', rule: 'type', params: { type: 'string' } }
      ];
      const validator = new DataValidator(rules);

      // Valid record
      const validResult = validator.validateRecord({
        age: 25,
        tags: ['tag1', 'tag2'],
        name: 'John'
      });
      expect(validResult.isValid).toBe(true);

      // Invalid record - wrong types
      const invalidResult = validator.validateRecord({
        age: '25', // should be number
        tags: 'tag1,tag2', // should be array
        name: 123 // should be string
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(3);
    });

    test('should validate numeric ranges', () => {
      const rules: ValidationRule[] = [
        { field: 'age', rule: 'range', params: { min: 18, max: 65 } },
        { field: 'score', rule: 'range', params: { min: 0 } },
        { field: 'rating', rule: 'range', params: { max: 5 } }
      ];
      const validator = new DataValidator(rules);

      // Valid record
      const validResult = validator.validateRecord({
        age: 25,
        score: 85,
        rating: 4
      });
      expect(validResult.isValid).toBe(true);

      // Invalid record - out of range
      const invalidResult = validator.validateRecord({
        age: 16, // too young
        score: -5, // negative
        rating: 6 // too high
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(3);
    });

    test('should validate patterns', () => {
      const rules: ValidationRule[] = [
        { field: 'email', rule: 'pattern', params: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' } },
        { field: 'phone', rule: 'pattern', params: { pattern: '^\\+?\\d{10,15}$' } }
      ];
      const validator = new DataValidator(rules);

      // Valid record
      const validResult = validator.validateRecord({
        email: 'john@example.com',
        phone: '+1234567890'
      });
      expect(validResult.isValid).toBe(true);

      // Invalid record - pattern mismatch
      const invalidResult = validator.validateRecord({
        email: 'invalid-email',
        phone: 'not-a-phone'
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
    });

    test('should validate enum values', () => {
      const rules: ValidationRule[] = [
        { field: 'status', rule: 'enum', params: { values: ['active', 'inactive', 'pending'] } },
        { field: 'role', rule: 'enum', params: { values: ['admin', 'user'] } }
      ];
      const validator = new DataValidator(rules);

      // Valid record
      const validResult = validator.validateRecord({
        status: 'active',
        role: 'admin'
      });
      expect(validResult.isValid).toBe(true);

      // Invalid record - invalid enum value
      const invalidResult = validator.validateRecord({
        status: 'unknown',
        role: 'guest'
      });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(2);
    });

    test('should handle custom validation rules', () => {
      const rules: ValidationRule[] = [
        {
          field: 'password',
          rule: 'custom',
          params: {
            validator: (value: string) => ({
              isValid: value && value.length >= 8,
              message: 'Password must be at least 8 characters'
            })
          }
        }
      ];
      const validator = new DataValidator(rules);

      // Valid password
      const validResult = validator.validateRecord({ password: 'strongpass123' });
      expect(validResult.isValid).toBe(true);

      // Invalid password
      const invalidResult = validator.validateRecord({ password: 'weak' });
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].message).toBe('Password must be at least 8 characters');
    });

    test('should use custom error messages', () => {
      const rules: ValidationRule[] = [
        { field: 'name', rule: 'required', errorMessage: 'Name is mandatory' }
      ];
      const validator = new DataValidator(rules);

      const result = validator.validateRecord({});
      expect(result.errors[0].message).toBe('Name is mandatory');
    });

    test('should skip validation for null/undefined values except required', () => {
      const rules: ValidationRule[] = [
        { field: 'optional', rule: 'type', params: { type: 'number' } },
        { field: 'required', rule: 'required' }
      ];
      const validator = new DataValidator(rules);

      const result = validator.validateRecord({ optional: null });
      expect(result.isValid).toBe(false); // Only required field fails
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('required');
    });
  });

  describe('validate', () => {
    test('should validate multiple records successfully', () => {
      const rules: ValidationRule[] = [
        { field: 'name', rule: 'required' },
        { field: 'age', rule: 'type', params: { type: 'number' } }
      ];
      const validator = new DataValidator(rules);

      const records = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 },
        { name: 'Bob', age: 35 }
      ];

      const result: ValidationResult = validator.validate(records);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.totalRecords).toBe(3);
      expect(result.metadata.validRecords).toBe(3);
      expect(result.metadata.invalidRecords).toBe(0);
      expect(result.metadata.validationTime).toBeGreaterThanOrEqual(0);
    });

    test('should handle validation errors in multiple records', () => {
      const rules: ValidationRule[] = [
        { field: 'name', rule: 'required' },
        { field: 'age', rule: 'range', params: { min: 18, max: 65 } }
      ];
      const validator = new DataValidator(rules);

      const records = [
        { name: 'John', age: 25 }, // valid
        { name: '', age: 15 }, // invalid: empty name, age too low
        { name: 'Jane', age: 70 } // invalid: age too high
      ];

      const result = validator.validate(records);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.metadata.validRecords).toBe(1);
      expect(result.metadata.invalidRecords).toBe(2);
    });

    test('should validate uniqueness across records', () => {
      const rules: ValidationRule[] = [
        { field: 'email', rule: 'unique' }
      ];
      const validator = new DataValidator(rules);

      const records = [
        { email: 'john@example.com' },
        { email: 'jane@example.com' },
        { email: 'john@example.com' } // duplicate
      ];

      const result = validator.validate(records);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].rule).toBe('unique');
      expect(result.errors[0].message).toContain('Duplicate value');
    });

    test('should handle empty record array', () => {
      const validator = new DataValidator();
      const result = validator.validate([]);

      expect(result.isValid).toBe(true);
      expect(result.metadata.totalRecords).toBe(0);
      expect(result.metadata.validRecords).toBe(0);
      expect(result.metadata.invalidRecords).toBe(0);
    });
  });

  describe('suggestRules', () => {
    test('should suggest required rule for always-present fields', () => {
      const records = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 },
        { name: 'Bob', age: 35 }
      ];

      const rules = DataValidator.suggestRules(records);

      const nameRule = rules.find(r => r.field === 'name' && r.rule === 'required');
      expect(nameRule).toBeDefined();
    });

    test('should suggest type rules for consistent types', () => {
      const records = [
        { age: 25, score: 85.5 },
        { age: 30, score: 92.0 },
        { age: 35, score: 78.5 }
      ];

      const rules = DataValidator.suggestRules(records);

      const ageTypeRule = rules.find(r => r.field === 'age' && r.rule === 'type');
      const scoreTypeRule = rules.find(r => r.field === 'score' && r.rule === 'type');

      expect(ageTypeRule?.params.type).toBe('number');
      expect(scoreTypeRule?.params.type).toBe('number');
    });

    test('should suggest range rules for numeric fields', () => {
      const records = [
        { age: 25 },
        { age: 30 },
        { age: 35 }
      ];

      const rules = DataValidator.suggestRules(records);

      const rangeRule = rules.find(r => r.field === 'age' && r.rule === 'range');
      expect(rangeRule).toBeDefined();
      expect(rangeRule?.params.min).toBe(25);
      expect(rangeRule?.params.max).toBe(35);
    });

    test('should suggest enum rules for categorical fields', () => {
      const records = Array.from({ length: 50 }, (_, i) => ({
        status: ['active', 'inactive', 'pending'][i % 3]
      }));

      const rules = DataValidator.suggestRules(records);

      const enumRule = rules.find(r => r.field === 'status' && r.rule === 'enum');
      expect(enumRule).toBeDefined();
      expect(enumRule?.params.values).toEqual(['active', 'inactive', 'pending']);
    });

    test('should suggest email pattern rules', () => {
      const records = [
        { email: 'john@example.com' },
        { email: 'jane@test.org' },
        { email: 'bob@domain.net' }
      ];

      const rules = DataValidator.suggestRules(records);

      const patternRule = rules.find(r => r.field === 'email' && r.rule === 'pattern');
      expect(patternRule).toBeDefined();
      expect(patternRule?.params.pattern).toBe('^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$');
    });

    test('should handle empty records array', () => {
      const rules = DataValidator.suggestRules([]);
      expect(rules).toEqual([]);
    });

    test('should handle records with missing fields', () => {
      const records = [
        { name: 'John', age: 25 },
        { name: 'Jane' }, // missing age
        { age: 35 } // missing name
      ];

      const rules = DataValidator.suggestRules(records);

      // Should not suggest required for fields that are sometimes missing
      const requiredRules = rules.filter(r => r.rule === 'required');
      expect(requiredRules).toHaveLength(0);
    });
  });
});