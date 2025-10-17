import { DataTransformer, FieldMapping } from '@/lib/data-transformer';

describe('DataTransformer', () => {
  let transformer: DataTransformer;

  beforeEach(() => {
    transformer = new DataTransformer();
  });

  describe('transform', () => {
    test('should transform single record with basic field mappings', () => {
      const data = {
        user: {
          name: 'John Doe',
          age: '25',
          isActive: 'true',
          createdAt: '2023-01-01T00:00:00Z'
        }
      };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.user.name', targetField: 'fullName', dataType: 'string' },
        { sourcePath: '$.user.age', targetField: 'age', dataType: 'number' },
        { sourcePath: '$.user.isActive', targetField: 'active', dataType: 'boolean' },
        { sourcePath: '$.user.createdAt', targetField: 'createdDate', dataType: 'date' }
      ];

      const result = transformer.transform(data, mappings);

      expect(result).toEqual({
        fullName: 'John Doe',
        age: 25,
        active: true,
        createdDate: '2023-01-01T00:00:00.000Z'
      });
    });

    test('should handle missing source paths gracefully', () => {
      const data = { user: { name: 'John' } };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.user.name', targetField: 'name', dataType: 'string' },
        { sourcePath: '$.user.missingField', targetField: 'missing', dataType: 'string' }
      ];

      const result = transformer.transform(data, mappings);

      expect(result).toEqual({
        name: 'John',
        missing: null
      });
    });

    test('should handle JSON data type transformation', () => {
      const data = { config: '{"theme": "dark", "lang": "en"}' };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.config', targetField: 'settings', dataType: 'json' }
      ];

      const result = transformer.transform(data, mappings);

      expect(result).toEqual({
        settings: { theme: 'dark', lang: 'en' }
      });
    });

    test('should handle transform rules (placeholder for future extensions)', () => {
      const data = { value: 'test' };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.value', targetField: 'result', dataType: 'string', transformRule: 'uppercase' }
      ];

      const result = transformer.transform(data, mappings);

      expect(result).toEqual({
        result: 'test' // transformRule not implemented yet, should return original value
      });
    });

    test('should handle empty mappings array', () => {
      const data = { user: { name: 'John' } };
      const result = transformer.transform(data, []);

      expect(result).toEqual({});
    });

    test('should handle null and undefined values', () => {
      const data = { user: { name: null, age: undefined } };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.user.name', targetField: 'name', dataType: 'string' },
        { sourcePath: '$.user.age', targetField: 'age', dataType: 'number' }
      ];

      const result = transformer.transform(data, mappings);

      expect(result).toEqual({
        name: null,
        age: null
      });
    });
  });

  describe('transformBatch', () => {
    test('should transform multiple records', () => {
      const dataArray = [
        { user: { name: 'John', age: '25' } },
        { user: { name: 'Jane', age: '30' } }
      ];

      const mappings: FieldMapping[] = [
        { sourcePath: '$.user.name', targetField: 'fullName', dataType: 'string' },
        { sourcePath: '$.user.age', targetField: 'age', dataType: 'number' }
      ];

      const result = transformer.transformBatch(dataArray, mappings);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ fullName: 'John', age: 25 });
      expect(result[1]).toEqual({ fullName: 'Jane', age: 30 });
    });

    test('should handle empty data array', () => {
      const result = transformer.transformBatch([], []);
      expect(result).toEqual([]);
    });
  });

  describe('validateSchema', () => {
    test('should validate correct data types', () => {
      const data = {
        name: 'John Doe',
        age: 25,
        active: true,
        createdDate: '2023-01-01T00:00:00.000Z'
      };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.name', targetField: 'name', dataType: 'string' },
        { sourcePath: '$.age', targetField: 'age', dataType: 'number' },
        { sourcePath: '$.active', targetField: 'active', dataType: 'boolean' },
        { sourcePath: '$.createdDate', targetField: 'createdDate', dataType: 'date' }
      ];

      const isValid = transformer.validateSchema(data, mappings);
      expect(isValid).toBe(true);
    });

    test('should reject invalid data types', () => {
      const data = {
        name: 123, // should be string
        age: 'not-a-number', // should be number
        active: 'true', // should be boolean
        createdDate: 'invalid-date' // should be valid date
      };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.name', targetField: 'name', dataType: 'string' },
        { sourcePath: '$.age', targetField: 'age', dataType: 'number' },
        { sourcePath: '$.active', targetField: 'active', dataType: 'boolean' },
        { sourcePath: '$.createdDate', targetField: 'createdDate', dataType: 'date' }
      ];

      const isValid = transformer.validateSchema(data, mappings);
      expect(isValid).toBe(false);
    });

    test('should allow null and undefined values', () => {
      const data = {
        name: null,
        age: undefined
      };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.name', targetField: 'name', dataType: 'string' },
        { sourcePath: '$.age', targetField: 'age', dataType: 'number' }
      ];

      const isValid = transformer.validateSchema(data, mappings);
      expect(isValid).toBe(true);
    });

    test('should handle unknown data types', () => {
      const data = { custom: 'value' };

      const mappings: FieldMapping[] = [
        { sourcePath: '$.custom', targetField: 'custom', dataType: 'custom' }
      ];

      const isValid = transformer.validateSchema(data, mappings);
      expect(isValid).toBe(true); // unknown types always pass validation
    });
  });
});