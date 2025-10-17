import { WorkflowOrchestrator, WorkflowConfig, WorkflowResult } from '@/lib/workflow-orchestrator';

// Mock all dependencies
jest.mock('@/lib/api-executor');
jest.mock('@/lib/parameter-generator');
jest.mock('@/lib/data-transformer');
jest.mock('@/lib/places-normalizer');
jest.mock('@/lib/data-validator', () => ({
  DataValidator: jest.fn().mockImplementation(() => ({
    validate: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {
        totalRecords: 2,
        validRecords: 2,
        invalidRecords: 0,
        validationTime: 5
      }
    })
  }))
}));
jest.mock('@/lib/data-lineage');
jest.mock('@/lib/audit-logger');
jest.mock('@/lib/redis-cache');
jest.mock('@/lib/mongo');

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockApiExecutor: any;
  let mockParamGenerator: any;
  let mockTransformer: any;
  let mockPlacesNormalizer: any;
  let mockDataValidator: any;
  let mockLineageTracker: any;
  let mockAuditLogger: any;
  let mockCacheManager: any;
  let mockGetDb: any;

  let mockValidatorInstance: any;
  let mockApiExecutorInstance: any;
  let mockParamGeneratorInstance: any;
  let mockTransformerInstance: any;
  let mockGetDbInstance: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Get mock instances
    mockApiExecutor = require('@/lib/api-executor').ApiExecutor;
    mockParamGenerator = require('@/lib/parameter-generator').ParameterGenerator;
    mockTransformer = require('@/lib/data-transformer').DataTransformer;
    mockPlacesNormalizer = require('@/lib/places-normalizer').PlacesNormalizer;
    mockDataValidator = require('@/lib/data-validator').DataValidator;
    mockLineageTracker = require('@/lib/data-lineage').LineageTracker;
    mockAuditLogger = require('@/lib/audit-logger').AuditLogger;
    mockCacheManager = require('@/lib/redis-cache').cacheManager;
    mockGetDb = require('@/lib/mongo').getDb;
    // Mock DataValidator constructor globally
    mockValidatorInstance = {
      validate: jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          totalRecords: 2,
          validRecords: 2,
          invalidRecords: 0,
          validationTime: 10
        }
      })
    };
    mockDataValidator.mockImplementation(() => mockValidatorInstance);

    // Mock other dependencies
    mockApiExecutorInstance = {
      executeBatch: jest.fn().mockResolvedValue([
        { success: true, data: [{ name: 'John', age: '25' }], responseTime: 100 },
        { success: true, data: [{ name: 'Jane', age: '30' }], responseTime: 120 }
      ])
    };
    mockApiExecutor.mockImplementation(() => mockApiExecutorInstance);

    mockParamGeneratorInstance = {
      generateCombinations: jest.fn().mockReturnValue([
        { limit: '10', offset: '0' },
        { limit: '10', offset: '10' }
      ])
    };
    mockParamGenerator.mockImplementation(() => mockParamGeneratorInstance);

    mockTransformerInstance = {
      transformBatch: jest.fn().mockReturnValue([
        { fullName: 'John', age: 25 },
        { fullName: 'Jane', age: 30 }
      ])
    };
    mockTransformer.mockImplementation(() => mockTransformerInstance);

    mockGetDbInstance = jest.fn().mockResolvedValue({
      collection: jest.fn().mockReturnValue({
        insertOne: jest.fn().mockResolvedValue({}),
        insertMany: jest.fn().mockResolvedValue({ insertedCount: 2 })
      })
    });

    // Mock cacheManager
    mockCacheManager.get = jest.fn().mockResolvedValue(null);
    mockCacheManager.set = jest.fn().mockResolvedValue(undefined);

    // Create orchestrator instance
    orchestrator = new WorkflowOrchestrator();
  });

  describe('executeWorkflow', () => {
    const mockConfig: WorkflowConfig = {
      connectionId: 'test-connection',
      apiConfig: {
        baseUrl: 'https://api.example.com/data',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        authType: 'bearer',
        authConfig: { token: 'test-token' }
      },
      parameters: [
        { name: 'limit', type: 'query', mode: 'list', values: ['10'] },
        { name: 'offset', type: 'query', mode: 'list', values: ['0', '10'] }
      ],
      fieldMappings: [
        { sourcePath: '$.name', targetField: 'fullName', dataType: 'string' },
        { sourcePath: '$.age', targetField: 'age', dataType: 'number' }
      ],
      validationRules: [
        { field: 'age', rule: 'range', params: { min: 18, max: 100 } }
      ],
      options: {
        maxRetries: 2,
        enableCaching: false, // Disable caching for this test
        enableLineageTracking: false, // Disable lineage tracking for this test
        enableVersioning: false, // Disable versioning for this test
        enableAuditLog: false, // Disable audit logging for this test
      }
    };

    test('should execute complete workflow successfully', async () => {
      // Mock parameter generation
      mockParamGenerator.prototype.generateCombinations.mockReturnValue([
        { limit: '10', offset: '0' },
        { limit: '10', offset: '10' }
      ]);

      // Mock API execution
      mockApiExecutor.prototype.executeBatch.mockResolvedValue([
        { success: true, data: [{ name: 'John', age: '25' }], responseTime: 100 },
        { success: true, data: [{ name: 'Jane', age: '30' }], responseTime: 120 }
      ]);

      // Mock data transformation
      mockTransformer.prototype.transformBatch.mockReturnValue([
        { fullName: 'John', age: 25 },
        { fullName: 'Jane', age: 30 }
      ]);

      // Mock database operations
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue({}),
          insertMany: jest.fn().mockResolvedValue({ insertedCount: 2 })
        })
      };
      mockGetDb.mockResolvedValue(mockDb);

      // Mock lineage tracking
      mockLineageTracker.prototype.startTracking = jest.fn();
      mockLineageTracker.prototype.trackSource = jest.fn();
      mockLineageTracker.prototype.trackTransformation = jest.fn();
      mockLineageTracker.prototype.trackDestination = jest.fn();
      mockLineageTracker.prototype.completeTracking = jest.fn();

      // Mock isPlacesData to return false
      jest.spyOn(orchestrator as any, 'isPlacesData').mockReturnValue(false);

      const result: WorkflowResult = await orchestrator.executeWorkflow(mockConfig);
      console.log('Result status:', result.status);

      expect(result.status).toBe('success');
      expect(result.totalRequests).toBe(2);
      expect(result.successfulRequests).toBe(2);
      expect(result.failedRequests).toBe(0);
      expect(result.recordsExtracted).toBe(2);
      expect(result.recordsLoaded).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.runId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should handle partial success with some failed requests', async () => {
      // Mock parameter generation
      mockParamGeneratorInstance.generateCombinations.mockReturnValue([
        { limit: '10', offset: '0' },
        { limit: '10', offset: '10' }
      ]);

      // Mock API execution with partial failure
      mockApiExecutorInstance.executeBatch.mockResolvedValue([
        { success: true, data: [{ name: 'John', age: '25' }], responseTime: 100 },
        { success: false, error: 'Network timeout', responseTime: 5000 }
      ]);

      // Mock data transformation
      mockTransformerInstance.transformBatch.mockReturnValue([
        { fullName: 'John', age: 25 }
      ]);

      // Mock database
      const mockDb = {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue({}),
          insertMany: jest.fn().mockResolvedValue({ insertedCount: 1 })
        })
      };
      mockGetDb.mockResolvedValue(mockDb);

      // Mock isPlacesData to return false
      jest.spyOn(orchestrator as any, 'isPlacesData').mockReturnValue(false);

      const result = await orchestrator.executeWorkflow(mockConfig);

      expect(result.status).toBe('partial');
      expect(result.successfulRequests).toBe(1);
      expect(result.failedRequests).toBe(1);
      expect(result.recordsExtracted).toBe(1);
      expect(result.recordsLoaded).toBe(1);
      expect(result.errors).toContain('Network timeout');
    });

    test('should handle complete failure', async () => {
      // Mock parameter generation
      // Mock parameter generation
      mockParamGeneratorInstance.generateCombinations.mockReturnValue([
        { limit: '10', offset: '0' }
      ]);

      // Mock API execution failure
      mockApiExecutorInstance.executeBatch.mockResolvedValue([
        { success: false, error: 'Connection failed', responseTime: 100 }
      ]);

      // Mock data transformation (won't be called since no data)
      mockTransformerInstance.transformBatch.mockReturnValue([]);

      const result = await orchestrator.executeWorkflow(mockConfig);

      expect(result.status).toBe('failed');
      expect(result.successfulRequests).toBe(0);
      expect(result.failedRequests).toBe(1);
      expect(result.recordsExtracted).toBe(0);
      expect(result.recordsLoaded).toBe(0);
      expect(result.errors).toContain('Connection failed');
    });

    test('should use caching for GET requests when enabled', async () => {
      const cacheConfig = { ...mockConfig, options: { ...mockConfig.options, enableCaching: true } };

      // Mock cache hit
      mockCacheManager.get.mockResolvedValue([
        { success: true, data: [{ name: 'Cached', age: '25' }], responseTime: 50 }
      ]);

      mockParamGeneratorInstance.generateCombinations.mockReturnValue([
        { limit: '10', offset: '0' }
      ]);

      mockTransformerInstance.transformBatch.mockReturnValue([
        { fullName: 'Cached', age: 25 }
      ]);

      // Mock data validation
      mockValidatorInstance.validate.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          totalRecords: 1,
          validRecords: 1,
          invalidRecords: 0,
          validationTime: 2
        }
      });

      // Mock isPlacesData to return false
      jest.spyOn(orchestrator as any, 'isPlacesData').mockReturnValue(false);

      const result = await orchestrator.executeWorkflow(cacheConfig);

      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockApiExecutorInstance.executeBatch).not.toHaveBeenCalled();
      expect(result.recordsExtracted).toBe(1);
    });

    test('should skip caching for non-GET requests', async () => {
      const postConfig = { ...mockConfig, apiConfig: { ...mockConfig.apiConfig, method: 'POST' } };

      mockParamGeneratorInstance.generateCombinations.mockReturnValue([
        { limit: '10', offset: '0' }
      ]);

      mockApiExecutorInstance.executeBatch.mockResolvedValue([
        { success: true, data: [{ name: 'John', age: '25' }], responseTime: 100 }
      ]);

      mockTransformerInstance.transformBatch.mockReturnValue([
        { fullName: 'John', age: 25 }
      ]);

      // Mock data validation
      mockValidatorInstance.validate.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          totalRecords: 1,
          validRecords: 1,
          invalidRecords: 0,
          validationTime: 2
        }
      });

      await orchestrator.executeWorkflow(postConfig);

      expect(mockCacheManager.get).not.toHaveBeenCalled();
      expect(mockApiExecutorInstance.executeBatch).toHaveBeenCalled();
    });

    test('should handle places data normalization', async () => {
      const placesConfig = { ...mockConfig };

      mockParamGeneratorInstance.generateCombinations.mockReturnValue([
        { limit: '10', offset: '0' }
      ]);

      mockApiExecutorInstance.executeBatch.mockResolvedValue([
        { success: true, data: [{ name: 'Restaurant A', latitude: 40.7128, longitude: -74.0060 }], responseTime: 100 }
      ]);

      mockTransformerInstance.transformBatch.mockReturnValue([
        { name: 'Restaurant A', latitude: 40.7128, longitude: -74.0060 }
      ]);

      // Mock places normalizer
      mockPlacesNormalizer.prototype.normalizeToPlaces.mockReturnValue([
        { name: 'Restaurant A', location: { lat: 40.7128, lng: -74.0060 } }
      ]);

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue({}),
          insertMany: jest.fn().mockResolvedValue({ insertedCount: 1 })
        })
      };
      mockGetDb.mockResolvedValue(mockDb);

      // Mock data validation
      mockValidatorInstance.validate.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
        metadata: {
          totalRecords: 1,
          validRecords: 1,
          invalidRecords: 0,
          validationTime: 2
        }
      });

      const result = await orchestrator.executeWorkflow(placesConfig);

      expect(mockPlacesNormalizer.prototype.normalizeToPlaces).toHaveBeenCalled();
      expect(result.recordsExtracted).toBe(1);
    });

    test('should handle validation errors', async () => {
      const validationConfig = {
        ...mockConfig,
        validationRules: [
          { field: 'age', rule: 'range' as const, params: { min: 18, max: 100 } }
        ]
      };

      mockParamGeneratorInstance.generateCombinations.mockReturnValue([
        { limit: '10', offset: '0' }
      ]);

      mockApiExecutorInstance.executeBatch.mockResolvedValue([
        { success: true, data: [{ name: 'John', age: '15' }], responseTime: 100 } // Invalid age
      ]);

      mockTransformerInstance.transformBatch.mockReturnValue([
        { fullName: 'John', age: 15 }
      ]);

      // Mock validation failure
      mockValidatorInstance.validate.mockResolvedValue({
        metadata: { validRecords: 0, invalidRecords: 1 },
        errors: [{ recordIndex: 0, field: 'age', message: 'Age must be between 18 and 100' }]
      });

      // Mock isPlacesData to return false
      jest.spyOn(orchestrator as any, 'isPlacesData').mockReturnValue(false);

      const mockDb = {
        collection: jest.fn().mockReturnValue({
          insertOne: jest.fn().mockResolvedValue({}),
          insertMany: jest.fn().mockResolvedValue({ insertedCount: 0 })
        })
      };
      mockGetDb.mockResolvedValue(mockDb);

      const result = await orchestrator.executeWorkflow(validationConfig);

      expect(result.recordsLoaded).toBe(0);
      expect(result.errors).toContain('Row 0: age - Age must be between 18 and 100');
    });
  });

  describe('buildUrl', () => {
    test('should build URL with query parameters', () => {
      const baseUrl = 'https://api.example.com/data';
      const params = { limit: '10', offset: '0', sort: 'name' };

      const result = (orchestrator as any).buildUrl(baseUrl, params);

      expect(result).toBe('https://api.example.com/data?limit=10&offset=0&sort=name');
    });

    test('should handle empty parameters', () => {
      const baseUrl = 'https://api.example.com/data';
      const params = {};

      const result = (orchestrator as any).buildUrl(baseUrl, params);

      expect(result).toBe('https://api.example.com/data');
    });
  });

  describe('buildHeaders', () => {
    test('should build headers with bearer auth', () => {
      const apiConfig = {
        baseUrl: 'https://api.example.com',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        authType: 'bearer' as const,
        authConfig: { token: 'test-token' }
      };

      const result = (orchestrator as any).buildHeaders(apiConfig);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      });
    });

    test('should build headers with API key auth', () => {
      const apiConfig = {
        baseUrl: 'https://api.example.com',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        authType: 'api_key' as const,
        authConfig: { keyName: 'X-API-Key', keyValue: 'secret-key' }
      };

      const result = (orchestrator as any).buildHeaders(apiConfig);

      expect(result).toEqual({
        'Content-Type': 'application/json',
        'X-API-Key': 'secret-key'
      });
    });

    test('should handle no auth', () => {
      const apiConfig = {
        baseUrl: 'https://api.example.com',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      const result = (orchestrator as any).buildHeaders(apiConfig);

      expect(result).toEqual({
        'Content-Type': 'application/json'
      });
    });
  });

  describe('isPlacesData', () => {
    test('should detect places data by common fields', () => {
      const placesData = [
        { name: 'Restaurant A', latitude: 40.7128, longitude: -74.0060 },
        { name: 'Restaurant B', latitude: 40.7589, longitude: -73.9851 }
      ];

      const result = (orchestrator as any).isPlacesData(placesData);
      expect(result).toBe(true);
    });

    test('should detect places data by location object', () => {
      const placesData = [
        { name: 'Restaurant A', location: { lat: 40.7128, lng: -74.0060 } }
      ];

      const result = (orchestrator as any).isPlacesData(placesData);
      expect(result).toBe(true);
    });

    test('should detect places data by geometry object', () => {
      const placesData = [
        { name: 'Restaurant A', geometry: { location: { lat: 40.7128, lng: -74.0060 } } }
      ];

      const result = (orchestrator as any).isPlacesData(placesData);
      expect(result).toBe(true);
    });

    test('should not detect non-places data', () => {
      const nonPlacesData = [
        { id: 1, title: 'Post 1', content: 'Content 1' },
        { id: 2, title: 'Post 2', content: 'Content 2' }
      ];

      const result = (orchestrator as any).isPlacesData(nonPlacesData);
      expect(result).toBe(false);
    });

    test('should handle empty data', () => {
      const result = (orchestrator as any).isPlacesData([]);
      expect(result).toBe(false);
    });
  });

  describe('detectSourceApi', () => {
    test('should detect RapidAPI places', () => {
      const result = (orchestrator as any).detectSourceApi('https://rapidapi-places.p.rapidapi.com');
      expect(result).toBe('rapidapi_places');
    });

    test('should detect Google Places', () => {
      const result = (orchestrator as any).detectSourceApi('https://maps.googleapis.com/maps/api/place');
      expect(result).toBe('google_places');
    });

    test('should detect TripAdvisor', () => {
      const result = (orchestrator as any).detectSourceApi('https://api.tripadvisor.com/api/partner/2.0');
      expect(result).toBe('tripadvisor');
    });

    test('should detect Foursquare', () => {
      const result = (orchestrator as any).detectSourceApi('https://api.foursquare.com/v3/places');
      expect(result).toBe('foursquare');
    });

    test('should detect Yelp', () => {
      const result = (orchestrator as any).detectSourceApi('https://api.yelp.com/v3/businesses');
      expect(result).toBe('yelp');
    });

    test('should fallback to generic for unknown APIs', () => {
      const result = (orchestrator as any).detectSourceApi('https://unknown-api.com/data');
      expect(result).toBe('generic_places');
    });
  });
});