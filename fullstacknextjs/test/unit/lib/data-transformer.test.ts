import { DataTransformer } from '@/lib/data-transformer'

describe('DataTransformer', () => {
  let transformer: DataTransformer

  beforeEach(() => {
    transformer = new DataTransformer()
  })

  describe('transform', () => {
    test('should transform simple JSONPath', () => {
      const data = { user: { id: 123, email: 'test@example.com' } }
      const mappings = [
        { sourcePath: '$.user.id', targetField: 'user_id', dataType: 'number' },
        { sourcePath: '$.user.email', targetField: 'email', dataType: 'string' }
      ]

      const result = transformer.transform(data, mappings)

      expect(result).toEqual({
        user_id: 123,
        email: 'test@example.com'
      })
    })

    test('should handle array notation', () => {
      const data = {
        items: [
          { name: 'Item 1', price: 10.99 },
          { name: 'Item 2', price: 15.50 }
        ]
      }
      const mappings = [
        { sourcePath: '$.items[*].name', targetField: 'names', dataType: 'string' }
      ]

      const result = transformer.transform(data, mappings)

      expect(result.names).toBe('Item 1,Item 2')
    })

    test('should handle missing data gracefully', () => {
      const data = { user: { id: 123 } }
      const mappings = [
        { sourcePath: '$.user.email', targetField: 'email', dataType: 'string' }
      ]

      const result = transformer.transform(data, mappings)

      expect(result.email).toBeNull()
    })
  })

  describe('validateSchema', () => {
    test('should validate correct data types', () => {
      const data = { id: 123, email: 'test@example.com' }
      const mappings = [
        { sourcePath: '$.id', targetField: 'id', dataType: 'number' },
        { sourcePath: '$.email', targetField: 'email', dataType: 'string' }
      ]

      const isValid = transformer.validateSchema(data, mappings)

      expect(isValid).toBe(true)
    })

    test('should reject invalid data types', () => {
      const data = { id: '123', email: 'test@example.com' }
      const mappings = [
        { sourcePath: '$.id', targetField: 'id', dataType: 'number' }
      ]

      const isValid = transformer.validateSchema(data, mappings)

      expect(isValid).toBe(false)
    })
  })
})
