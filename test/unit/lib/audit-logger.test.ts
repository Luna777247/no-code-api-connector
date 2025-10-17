import { AuditLogger, AuditEventType, AuditLevel } from '@/lib/audit-logger';
import { LineageTracker, DataVersioning, LineageNode, LineageEdge } from '@/lib/data-lineage';

// Mock MongoDB
jest.mock('@/lib/mongo');

describe('Audit Logger & Data Lineage', () => {
  let mockDb: any;
  let mockCollection: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCollection = {
      insertOne: jest.fn().mockResolvedValue({}),
      insertMany: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
          })
        })
      }),
      toArray: jest.fn().mockResolvedValue([])
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    };

    require('@/lib/mongo').getDb.mockResolvedValue(mockDb);
  });

  describe('AuditLogger', () => {
    describe('log', () => {
      test('should log audit entry successfully', async () => {
        const auditEntry = {
          eventType: 'connection.created' as AuditEventType,
          level: 'info' as AuditLevel,
          userId: 'user123',
          resource: {
            type: 'connection',
            id: 'conn123',
            name: 'Test Connection'
          },
          action: 'Connection created',
          details: { apiUrl: 'https://api.example.com' },
          result: 'success' as const
        };

        await AuditLogger.log(auditEntry);

        expect(mockDb.collection).toHaveBeenCalledWith('api_audit_logs');
        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'connection.created',
            level: 'info',
            userId: 'user123',
            resource: expect.objectContaining({
              type: 'connection',
              id: 'conn123'
            }),
            action: 'Connection created',
            result: 'success'
          })
        );
      });

      test('should handle database errors gracefully', async () => {
        mockCollection.insertOne.mockRejectedValue(new Error('DB Error'));

        const auditEntry = {
          eventType: 'error.occurred' as AuditEventType,
          level: 'error' as AuditLevel,
          resource: { type: 'system', id: 'system' },
          action: 'Test error',
          result: 'failure' as const
        };

        // Should not throw
        await expect(AuditLogger.log(auditEntry)).resolves.not.toThrow();
      });
    });

    describe('logConnectionEvent', () => {
      test('should log connection creation', async () => {
        await AuditLogger.logConnectionEvent(
          'created',
          'conn123',
          'Test Connection',
          'user123',
          { apiUrl: 'https://api.example.com' }
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'connection.created',
            level: 'info',
            userId: 'user123',
            resource: {
              type: 'connection',
              id: 'conn123',
              name: 'Test Connection'
            },
            action: 'Connection created',
            result: 'success'
          })
        );
      });

      test('should log connection execution with details', async () => {
        await AuditLogger.logConnectionEvent(
          'executed',
          'conn123',
          'Test Connection',
          'user123',
          { recordCount: 100, duration: 5000 }
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'connection.executed',
            action: 'Connection executed',
            details: { recordCount: 100, duration: 5000 }
          })
        );
      });
    });

    describe('logDataAccess', () => {
      test('should log data access with info level', async () => {
        await AuditLogger.logDataAccess(
          'accessed',
          'dataset123',
          'user123',
          { recordCount: 50 }
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'data.accessed',
            level: 'info',
            action: 'Data accessed',
            result: 'success'
          })
        );
      });

      test('should log data deletion with warning level', async () => {
        await AuditLogger.logDataAccess(
          'deleted',
          'dataset123',
          'user123'
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'data.deleted',
            level: 'warning',
            action: 'Data deleted'
          })
        );
      });
    });

    describe('logUserEvent', () => {
      test('should log user login with IP and user agent', async () => {
        await AuditLogger.logUserEvent(
          'login',
          'user123',
          'John Doe',
          'john@example.com',
          '192.168.1.1',
          'Mozilla/5.0...'
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'user.login',
            level: 'info',
            userId: 'user123',
            userName: 'John Doe',
            userEmail: 'john@example.com',
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            action: 'User login'
          })
        );
      });
    });

    describe('logPermissionChange', () => {
      test('should log permission granted', async () => {
        await AuditLogger.logPermissionChange(
          'granted',
          'user123',
          'read:connections',
          'connection',
          'conn123',
          'admin456'
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'permission.granted',
            level: 'warning',
            userId: 'admin456',
            resource: { type: 'connection', id: 'conn123' },
            action: 'Permission granted: read:connections',
            details: {
              targetUserId: 'user123',
              permission: 'read:connections'
            }
          })
        );
      });
    });

    describe('logError', () => {
      test('should log error with failure result', async () => {
        await AuditLogger.logError(
          'error.occurred',
          'API call failed',
          'connection',
          'conn123',
          'Connection timeout',
          'user123',
          { attemptCount: 3 }
        );

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType: 'error.occurred',
            level: 'error',
            userId: 'user123',
            resource: { type: 'connection', id: 'conn123' },
            action: 'API call failed',
            result: 'failure',
            errorMessage: 'Connection timeout',
            details: { attemptCount: 3 }
          })
        );
      });
    });
  });

  describe('LineageTracker', () => {
    let tracker: LineageTracker;

    beforeEach(() => {
      tracker = new LineageTracker();
    });

    describe('startTracking', () => {
      test('should initialize lineage tracking', () => {
        tracker['startTracking']('run123', 'conn456');

        const lineage = tracker['currentLineage'];
        expect(lineage).toBeDefined();
        expect(lineage?.runId).toBe('run123');
        expect(lineage?.connectionId).toBe('conn456');
        expect(lineage?.nodes).toEqual([]);
        expect(lineage?.edges).toEqual([]);
        expect(lineage?.metadata.status).toBe('running');
      });
    });

    describe('addNode', () => {
      test('should add node to lineage', () => {
        tracker['startTracking']('run123', 'conn456');

        const node: LineageNode = {
          id: 'source1',
          type: 'source',
          name: 'API Source',
          description: 'REST API endpoint'
        };

        tracker['addNode'](node);

        const lineage = tracker['currentLineage'];
        expect(lineage?.nodes).toHaveLength(1);
        expect(lineage?.nodes[0]).toEqual(node);
      });

      test('should not add node without active tracking', () => {
        const node: LineageNode = {
          id: 'source1',
          type: 'source',
          name: 'API Source'
        };

        tracker['addNode'](node);

        expect(tracker['currentLineage']).toBeNull();
      });
    });

    describe('addEdge', () => {
      test('should add edge to lineage', () => {
        tracker['startTracking']('run123', 'conn456');

        const edge: Omit<LineageEdge, 'timestamp'> = {
          from: 'source1',
          to: 'transform1',
          type: 'transform'
        };

        tracker['addEdge'](edge);

        const lineage = tracker['currentLineage'];
        expect(lineage?.edges).toHaveLength(1);
        expect(lineage?.edges[0]).toEqual(
          expect.objectContaining({
            from: 'source1',
            to: 'transform1',
            type: 'transform'
          })
        );
        expect(lineage?.edges[0].timestamp).toBeInstanceOf(Date);
      });
    });

    describe('trackSource', () => {
      test('should track data source', () => {
        tracker['startTracking']('run123', 'conn456');

        tracker['trackSource']('api_conn123', 'REST API', 'API', {
          method: 'GET',
          baseUrl: 'https://api.example.com'
        });

        const lineage = tracker['currentLineage'];
        expect(lineage?.nodes).toHaveLength(1);
        expect(lineage?.nodes[0]).toEqual({
          id: 'api_conn123',
          type: 'source',
          name: 'REST API',
          description: 'API data source',
          metadata: {
            sourceType: 'API',
            method: 'GET',
            baseUrl: 'https://api.example.com'
          }
        });
      });
    });

    describe('trackTransformation', () => {
      test('should track transformation with input edges', () => {
        tracker['startTracking']('run123', 'conn456');

        tracker['trackTransformation'](
          'transform1',
          'field_mapping',
          ['source1', 'source2'],
          { fieldCount: 5 }
        );

        const lineage = tracker['currentLineage'];
        expect(lineage?.nodes).toHaveLength(1);
        expect(lineage?.edges).toHaveLength(2);

        // Check transformation node
        expect(lineage?.nodes[0]).toEqual({
          id: 'transform1',
          type: 'transformation',
          name: 'field_mapping',
          description: 'Data transformation: field_mapping',
          metadata: { fieldCount: 5 }
        });

        // Check edges
        expect(lineage?.edges).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ from: 'source1', to: 'transform1', type: 'transform' }),
            expect.objectContaining({ from: 'source2', to: 'transform1', type: 'transform' })
          ])
        );
      });
    });

    describe('trackDestination', () => {
      test('should track destination with input edges', () => {
        tracker['startTracking']('run123', 'conn456');

        tracker['trackDestination'](
          'dest1',
          'MongoDB Collection',
          'MongoDB',
          ['transform1'],
          { collection: 'api_data' }
        );

        const lineage = tracker['currentLineage'];
        expect(lineage?.nodes).toHaveLength(1);
        expect(lineage?.edges).toHaveLength(1);

        // Check destination node
        expect(lineage?.nodes[0]).toEqual({
          id: 'dest1',
          type: 'destination',
          name: 'MongoDB Collection',
          description: 'MongoDB destination',
          metadata: {
            destType: 'MongoDB',
            collection: 'api_data'
          }
        });

        // Check edge
        expect(lineage?.edges[0]).toEqual(
          expect.objectContaining({
            from: 'transform1',
            to: 'dest1',
            type: 'load'
          })
        );
      });
    });

    describe('completeTracking', () => {
      test('should complete tracking successfully', async () => {
        tracker['startTracking']('run123', 'conn456');

        await tracker['completeTracking']('completed', 100);

        expect(mockCollection.insertOne).toHaveBeenCalledWith(
          expect.objectContaining({
            runId: 'run123',
            connectionId: 'conn456',
            metadata: expect.objectContaining({
              status: 'completed',
              recordCount: 100,
              endTime: expect.any(Date),
              duration: expect.any(Number)
            })
          })
        );

        expect(tracker['currentLineage']).toBeNull();
      });

      test('should handle completion without active tracking', async () => {
        await tracker['completeTracking']('completed', 50);

        expect(mockCollection.insertOne).not.toHaveBeenCalled();
      });
    });

    describe('getLineage', () => {
      test('should retrieve lineage by run ID', async () => {
        const mockLineage = {
          runId: 'run123',
          connectionId: 'conn456',
          nodes: [],
          edges: [],
          metadata: { status: 'completed' }
        };

        mockCollection.findOne.mockResolvedValue(mockLineage);

        const result = await LineageTracker.getLineage('run123');

        expect(result).toEqual(mockLineage);
        expect(mockCollection.findOne).toHaveBeenCalledWith({ runId: 'run123' });
      });

      test('should return null for non-existent lineage', async () => {
        mockCollection.findOne.mockResolvedValue(null);

        const result = await LineageTracker.getLineage('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('getConnectionLineage', () => {
      test('should retrieve lineage history for connection', async () => {
        const mockLineages = [
          { runId: 'run1', timestamp: new Date() },
          { runId: 'run2', timestamp: new Date() }
        ];

        const mockFind = {
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(mockLineages)
            })
          })
        };

        mockCollection.find.mockReturnValue(mockFind);

        const result = await LineageTracker.getConnectionLineage('conn123', 10);

        expect(result).toEqual(mockLineages);
        expect(mockCollection.find).toHaveBeenCalledWith({ connectionId: 'conn123' });
      });
    });

    describe('traceBackwards', () => {
      test('should trace data lineage backwards', async () => {
        const mockLineage = {
          runId: 'run123',
          nodes: [
            { id: 'source1', type: 'source', name: 'API' },
            { id: 'transform1', type: 'transformation', name: 'Mapping' },
            { id: 'dest1', type: 'destination', name: 'DB' }
          ],
          edges: [
            { from: 'source1', to: 'transform1', type: 'transform', timestamp: new Date() },
            { from: 'transform1', to: 'dest1', type: 'load', timestamp: new Date() }
          ]
        };

        mockCollection.findOne.mockResolvedValue(mockLineage);

        const result = await LineageTracker.traceBackwards('dest1', 'run123');

        expect(result).toHaveLength(3);
        expect(result[0].id).toBe('source1');
        expect(result[1].id).toBe('transform1');
        expect(result[2].id).toBe('dest1');
      });
    });
  });

  describe('DataVersioning', () => {
    describe('createVersion', () => {
      test('should create first version of dataset', async () => {
        mockCollection.findOne.mockResolvedValue(null); // No existing versions

        const data = [
          { id: 1, name: 'John', age: 25 },
          { id: 2, name: 'Jane', age: 30 }
        ];

        const version = await DataVersioning.createVersion(
          'dataset123',
          'conn456',
          data,
          ['Initial data load'],
          'user123'
        );

        expect(version).toBe(1);
        expect(mockCollection.insertOne).toHaveBeenCalledTimes(1); // Only version metadata
      });

      test('should create subsequent version', async () => {
        mockCollection.findOne.mockResolvedValue({ version: 2 });

        const data = [{ id: 3, name: 'Bob', age: 35 }];

        const version = await DataVersioning.createVersion(
          'dataset123',
          'conn456',
          data,
          ['Added new record'],
          'user456'
        );

        expect(version).toBe(3);
      });
    });

    describe('getVersionHistory', () => {
      test('should retrieve version history', async () => {
        const mockVersions = [
          { version: 2, timestamp: new Date() },
          { version: 1, timestamp: new Date() }
        ];

        const mockFind = {
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(mockVersions)
            })
          })
        };

        mockCollection.find.mockReturnValue(mockFind);

        const result = await DataVersioning.getVersionHistory('dataset123', 10);

        expect(result).toEqual(mockVersions);
        expect(mockCollection.find).toHaveBeenCalledWith({ datasetId: 'dataset123' });
      });
    });

    describe('getVersionData', () => {
      test('should retrieve data for specific version', async () => {
        const mockData = [
          { id: 1, name: 'John', _version: 1, _versionedAt: new Date() },
          { id: 2, name: 'Jane', _version: 1, _versionedAt: new Date() }
        ];

        mockCollection.find.mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockData)
        });

        const result = await DataVersioning.getVersionData('dataset123', 1);

        expect(result).toHaveLength(2);
        expect(result[0]).not.toHaveProperty('_version');
        expect(result[0]).not.toHaveProperty('_versionedAt');
      });
    });

    describe('compareVersions', () => {
      test('should compare two versions', async () => {
        const v1Doc = {
          datasetId: 'dataset123',
          version: 1,
          recordCount: 100,
          schema: { id: 'number', name: 'string' }
        };

        const v2Doc = {
          datasetId: 'dataset123',
          version: 2,
          recordCount: 120,
          schema: { id: 'number', name: 'string', age: 'number' }
        };

        mockCollection.findOne
          .mockResolvedValueOnce(v1Doc)
          .mockResolvedValueOnce(v2Doc);

        const result = await DataVersioning.compareVersions('dataset123', 1, 2);

        expect(result.added).toBe(20);
        expect(result.removed).toBe(0);
        expect(result.modified).toBe(0);
        expect(result.schemaChanges).toContain('Added field: age (number)');
      });

      test('should handle version not found', async () => {
        mockCollection.findOne.mockResolvedValue(null);

        const result = await DataVersioning.compareVersions('dataset123', 1, 2);

        expect(result.added).toBe(0);
        expect(result.removed).toBe(0);
        expect(result.modified).toBe(0);
        expect(result.schemaChanges).toEqual([]);
      });
    });
  });
});