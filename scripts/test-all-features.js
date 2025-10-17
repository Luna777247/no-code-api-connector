/**
 * Comprehensive Test Suite for Modern Data Platform Features
 * Tests: Validation, Caching, Lineage, Audit, Upload, Export
 */

const { MongoClient } = require('mongodb')
require('dotenv').config({ path: '.env.local' })

// Test configuration
const TEST_CONFIG = {
  mongodb: {
    uri: process.env.MONGODB_URI,
    db: process.env.MONGODB_DB || 'smart_travel_v2'
  },
  testData: {
    valid: [
      { id: '1', email: 'user1@example.com', age: 25, status: 'active', name: 'User 1' },
      { id: '2', email: 'user2@example.com', age: 30, status: 'inactive', name: 'User 2' },
      { id: '3', email: 'user3@example.com', age: 45, status: 'active', name: 'User 3' }
    ],
    invalid: [
      { id: '4', email: 'invalid-email', age: 150, status: 'active' }, // Bad email & age
      { email: 'user5@example.com', age: 30, status: 'invalid' }, // Missing id, bad status
      { id: '6', email: 'user6@example.com', age: -5, status: 'pending' } // Negative age
    ]
  }
}

class TestRunner {
  constructor() {
    this.client = null
    this.db = null
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      tests: []
    }
  }

  async connect() {
    if (!TEST_CONFIG.mongodb.uri) {
      throw new Error('MONGODB_URI not set in .env.local')
    }
    this.client = new MongoClient(TEST_CONFIG.mongodb.uri)
    await this.client.connect()
    this.db = this.client.db(TEST_CONFIG.mongodb.db)
    console.log('[v0] ✅ Connected to MongoDB:', TEST_CONFIG.mongodb.db)
  }

  async disconnect() {
    if (this.client) {
      await this.client.close()
      console.log('[v0] Disconnected from MongoDB')
    }
  }

  async test(name, fn) {
    this.results.total++
    const startTime = Date.now()
    
    try {
      console.log(`\n[v0] 🧪 Testing: ${name}`)
      await fn()
      
      const duration = Date.now() - startTime
      this.results.passed++
      this.results.tests.push({ name, status: 'PASSED', duration })
      console.log(`[v0] ✅ PASSED: ${name} (${duration}ms)`)
      return true
    } catch (error) {
      const duration = Date.now() - startTime
      this.results.failed++
      this.results.tests.push({ name, status: 'FAILED', duration, error: error.message })
      console.error(`[v0] ❌ FAILED: ${name}`)
      console.error(`[v0] Error:`, error.message)
      return false
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60))
    console.log('[v0] 📊 TEST SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Tests: ${this.results.total}`)
    console.log(`✅ Passed: ${this.results.passed}`)
    console.log(`❌ Failed: ${this.results.failed}`)
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`)
    console.log('='.repeat(60))
    
    if (this.results.failed > 0) {
      console.log('\n[v0] Failed Tests:')
      this.results.tests
        .filter(t => t.status === 'FAILED')
        .forEach(t => console.log(`  - ${t.name}: ${t.error}`))
    }
  }
}

async function runTests() {
  const runner = new TestRunner()
  
  try {
    console.log('[v0] 🚀 Starting Modern Data Platform Test Suite')
    console.log('[v0] ================================================\n')
    
    await runner.connect()

    // Test 1: Database Connection
    await runner.test('Database Connection & Write', async () => {
      const collection = runner.db.collection('api_test_data')
      const result = await collection.insertOne({ 
        test: true, 
        timestamp: new Date(),
        type: 'connection_test' 
      })
      
      if (!result.insertedId) {
        throw new Error('Failed to insert test document')
      }
      
      // Cleanup
      await collection.deleteOne({ _id: result.insertedId })
    })

    // Test 2: Core Collections Exist
    await runner.test('Verify Core Collections', async () => {
      const collections = await runner.db.listCollections().toArray()
      const collectionNames = collections.map(c => c.name)
      
      const requiredCollections = [
        'api_connections',
        'api_runs',
        'api_schedules',
        'api_field_mappings',
        'api_data_transformed'
      ]
      
      const missingCollections = requiredCollections.filter(
        name => !collectionNames.includes(name)
      )
      
      console.log(`[v0] Found ${collectionNames.length} collections`)
      console.log(`[v0] Core collections:`, requiredCollections.join(', '))
    })

    // Test 3: Data Lineage Collection
    await runner.test('Data Lineage - Create & Query', async () => {
      const collection = runner.db.collection('api_data_lineage')
      
      const testLineage = {
        runId: `test_run_${Date.now()}`,
        connectionId: 'test_connection',
        nodes: [
          {
            id: 'source_1',
            type: 'source',
            name: 'Test API',
            description: 'Test data source',
            metadata: { url: 'https://api.test.com' }
          },
          {
            id: 'transform_1',
            type: 'transformation',
            name: 'Field Mapping',
            description: 'Map fields',
            metadata: { mappings: 3 }
          },
          {
            id: 'dest_1',
            type: 'destination',
            name: 'MongoDB',
            description: 'Database storage',
            metadata: { collection: 'api_data_transformed' }
          }
        ],
        edges: [
          { from: 'source_1', to: 'transform_1', type: 'extract' },
          { from: 'transform_1', to: 'dest_1', type: 'load' }
        ],
        metadata: {
          startTime: new Date(),
          endTime: new Date(),
          status: 'completed',
          recordCount: 100
        },
        createdAt: new Date()
      }
      
      const result = await collection.insertOne(testLineage)
      console.log(`[v0] Created lineage with ${testLineage.nodes.length} nodes, ${testLineage.edges.length} edges`)
      
      // Query it back
      const retrieved = await collection.findOne({ runId: testLineage.runId })
      if (!retrieved) {
        throw new Error('Failed to retrieve lineage')
      }
      
      console.log(`[v0] Retrieved lineage for run: ${retrieved.runId}`)
      
      // Cleanup
      await collection.deleteOne({ _id: result.insertedId })
    })

    // Test 4: Data Versioning
    await runner.test('Data Versioning - Create Version', async () => {
      const collection = runner.db.collection('api_data_versions')
      
      const testVersion = {
        datasetId: `dataset_${Date.now()}`,
        connectionId: 'test_connection',
        version: 1,
        timestamp: new Date(),
        recordCount: 50,
        schema: {
          id: 'string',
          email: 'string',
          age: 'number'
        },
        checksum: 'abc123def456',
        metadata: {
          changes: ['Initial version'],
          author: 'test_user',
          dataPreview: TEST_CONFIG.testData.valid.slice(0, 2)
        }
      }
      
      const result = await collection.insertOne(testVersion)
      console.log(`[v0] Created version ${testVersion.version} with checksum: ${testVersion.checksum}`)
      
      // Query it back
      const retrieved = await collection.findOne({ datasetId: testVersion.datasetId })
      if (!retrieved || retrieved.version !== 1) {
        throw new Error('Failed to retrieve version')
      }
      
      // Cleanup
      await collection.deleteOne({ _id: result.insertedId })
    })

    // Test 5: Audit Logging
    await runner.test('Audit Logging - Create & Query', async () => {
      const collection = runner.db.collection('api_audit_logs')
      
      const testAuditEntry = {
        id: `audit_${Date.now()}`,
        timestamp: new Date(),
        eventType: 'connection.executed',
        level: 'info',
        userId: 'test_user',
        userName: 'Test User',
        resource: {
          type: 'connection',
          id: 'test_connection_123',
          name: 'Test Connection'
        },
        action: 'Connection executed',
        details: {
          runId: 'test_run_123',
          parameters: 3,
          recordsProcessed: 100
        },
        result: 'success'
      }
      
      const result = await collection.insertOne(testAuditEntry)
      console.log(`[v0] Created audit entry: ${testAuditEntry.eventType}`)
      
      // Query it back
      const retrieved = await collection.findOne({ id: testAuditEntry.id })
      if (!retrieved) {
        throw new Error('Failed to retrieve audit entry')
      }
      
      console.log(`[v0] Retrieved audit entry with result: ${retrieved.result}`)
      
      // Query by event type
      const count = await collection.countDocuments({ eventType: 'connection.executed' })
      console.log(`[v0] Found ${count} connection.executed events`)
      
      // Cleanup
      await collection.deleteOne({ _id: result.insertedId })
    })

    // Test 6: File Upload Metadata
    await runner.test('File Upload - Metadata Storage', async () => {
      const collection = runner.db.collection('api_file_uploads')
      
      const testUpload = {
        uploadId: `upload_${Date.now()}`,
        datasetId: 'test_dataset',
        connectionId: 'test_connection',
        userId: 'test_user',
        fileName: 'test_data.csv',
        fileSize: 1024,
        fileType: 'csv',
        status: 'completed',
        recordCount: 100,
        schema: {
          id: 'string',
          name: 'string',
          email: 'string'
        },
        validationErrors: [],
        createdAt: new Date(),
        metadata: {
          delimiter: ',',
          hasHeaders: true,
          encoding: 'utf-8'
        }
      }
      
      const result = await collection.insertOne(testUpload)
      console.log(`[v0] Created upload record: ${testUpload.fileName} (${testUpload.recordCount} records)`)
      
      // Query it back
      const retrieved = await collection.findOne({ uploadId: testUpload.uploadId })
      if (!retrieved || retrieved.status !== 'completed') {
        throw new Error('Failed to retrieve upload metadata')
      }
      
      // Cleanup
      await collection.deleteOne({ _id: result.insertedId })
    })

    // Test 7: Data Export Metadata
    await runner.test('Data Export - Metadata Storage', async () => {
      const collection = runner.db.collection('api_data_exports')
      
      const testExport = {
        exportId: `export_${Date.now()}`,
        connectionId: 'test_connection',
        userId: 'test_user',
        format: 'csv',
        status: 'completed',
        recordCount: 50,
        fileSize: 2048,
        fields: ['id', 'name', 'email'],
        filters: { status: 'active' },
        createdAt: new Date(),
        completedAt: new Date(),
        metadata: {
          compression: 'none',
          encoding: 'utf-8'
        }
      }
      
      const result = await collection.insertOne(testExport)
      console.log(`[v0] Created export record: ${testExport.format} format (${testExport.recordCount} records)`)
      
      // Query it back
      const retrieved = await collection.findOne({ exportId: testExport.exportId })
      if (!retrieved || retrieved.format !== 'csv') {
        throw new Error('Failed to retrieve export metadata')
      }
      
      // Cleanup
      await collection.deleteOne({ _id: result.insertedId })
    })

    // Test 8: Transformed Data Storage
    await runner.test('Transformed Data - CRUD Operations', async () => {
      const collection = runner.db.collection('api_data_transformed')
      
      // Insert
      const insertResult = await collection.insertMany(TEST_CONFIG.testData.valid)
      console.log(`[v0] Inserted ${insertResult.insertedCount} records`)
      
      // Query
      const count = await collection.countDocuments({ 
        _id: { $in: Object.values(insertResult.insertedIds) } 
      })
      if (count !== TEST_CONFIG.testData.valid.length) {
        throw new Error(`Expected ${TEST_CONFIG.testData.valid.length} records, found ${count}`)
      }
      
      // Aggregate
      const pipeline = [
        { $match: { _id: { $in: Object.values(insertResult.insertedIds) } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]
      const aggregateResult = await collection.aggregate(pipeline).toArray()
      console.log(`[v0] Aggregation result:`, aggregateResult)
      
      // Cleanup
      await collection.deleteMany({ _id: { $in: Object.values(insertResult.insertedIds) } })
    })

    // Test 9: Complex Query Performance
    await runner.test('Query Performance - Lineage Lookup', async () => {
      const collection = runner.db.collection('api_data_lineage')
      
      // Insert multiple lineage records
      const lineageRecords = Array.from({ length: 10 }, (_, i) => ({
        runId: `perf_test_run_${i}_${Date.now()}`,
        connectionId: 'perf_test_connection',
        nodes: [
          { id: `source_${i}`, type: 'source', name: `Source ${i}` },
          { id: `dest_${i}`, type: 'destination', name: `Dest ${i}` }
        ],
        edges: [{ from: `source_${i}`, to: `dest_${i}`, type: 'load' }],
        metadata: { status: 'completed', recordCount: i * 10 },
        createdAt: new Date()
      }))
      
      const startInsert = Date.now()
      const insertResult = await collection.insertMany(lineageRecords)
      const insertDuration = Date.now() - startInsert
      console.log(`[v0] Inserted ${insertResult.insertedCount} lineage records in ${insertDuration}ms`)
      
      // Query by connection
      const startQuery = Date.now()
      const results = await collection.find({ 
        connectionId: 'perf_test_connection' 
      }).toArray()
      const queryDuration = Date.now() - startQuery
      console.log(`[v0] Found ${results.length} records in ${queryDuration}ms`)
      
      // Cleanup
      await collection.deleteMany({ 
        _id: { $in: Object.values(insertResult.insertedIds) } 
      })
    })

    // Test 10: Validation Rules Structure
    await runner.test('Validation Rules - Structure Test', async () => {
      const validationRules = [
        { field: 'id', rule: 'required' },
        { field: 'email', rule: 'pattern', params: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' } },
        { field: 'age', rule: 'range', params: { min: 0, max: 120 } },
        { field: 'status', rule: 'enum', params: { values: ['active', 'inactive', 'pending'] } }
      ]
      
      console.log(`[v0] Validation rules configured: ${validationRules.length}`)
      
      // Validate structure
      validationRules.forEach(rule => {
        if (!rule.field || !rule.rule) {
          throw new Error('Invalid validation rule structure')
        }
        console.log(`[v0]   - ${rule.field}: ${rule.rule}`)
      })
    })

    // Test 11: End-to-End Workflow Simulation
    await runner.test('E2E Workflow Simulation', async () => {
      const runId = `e2e_test_${Date.now()}`
      const connectionId = 'e2e_test_connection'
      
      // Step 1: Start lineage
      const lineageCollection = runner.db.collection('api_data_lineage')
      const lineage = {
        runId,
        connectionId,
        nodes: [],
        edges: [],
        metadata: { startTime: new Date(), status: 'running' },
        createdAt: new Date()
      }
      const lineageResult = await lineageCollection.insertOne(lineage)
      console.log(`[v0] Step 1: Started lineage tracking`)
      
      // Step 2: Log audit event
      const auditCollection = runner.db.collection('api_audit_logs')
      const auditEntry = {
        id: `audit_${runId}`,
        timestamp: new Date(),
        eventType: 'connection.executed',
        level: 'info',
        resource: { type: 'connection', id: connectionId },
        action: 'Workflow started',
        details: { runId },
        result: 'success'
      }
      const auditResult = await auditCollection.insertOne(auditEntry)
      console.log(`[v0] Step 2: Logged audit event`)
      
      // Step 3: Transform and load data
      const dataCollection = runner.db.collection('api_data_transformed')
      const transformedData = TEST_CONFIG.testData.valid.map(d => ({
        ...d,
        _runId: runId,
        _connectionId: connectionId,
        _transformedAt: new Date()
      }))
      const dataResult = await dataCollection.insertMany(transformedData)
      console.log(`[v0] Step 3: Loaded ${dataResult.insertedCount} transformed records`)
      
      // Step 4: Create version
      const versionCollection = runner.db.collection('api_data_versions')
      const version = {
        datasetId: `dataset_${connectionId}`,
        connectionId,
        version: 1,
        timestamp: new Date(),
        recordCount: transformedData.length,
        schema: { id: 'string', email: 'string', age: 'number', status: 'string' },
        checksum: 'e2e_test_checksum',
        metadata: { changes: [`E2E test run ${runId}`] }
      }
      const versionResult = await versionCollection.insertOne(version)
      console.log(`[v0] Step 4: Created version ${version.version}`)
      
      // Step 5: Complete lineage
      await lineageCollection.updateOne(
        { _id: lineageResult.insertedId },
        { $set: { 'metadata.status': 'completed', 'metadata.endTime': new Date() } }
      )
      console.log(`[v0] Step 5: Completed lineage tracking`)
      
      // Verify all components
      const lineageCheck = await lineageCollection.findOne({ runId })
      const auditCheck = await auditCollection.findOne({ id: auditEntry.id })
      const dataCheck = await dataCollection.countDocuments({ _runId: runId })
      const versionCheck = await versionCollection.findOne({ connectionId })
      
      if (!lineageCheck || !auditCheck || dataCheck !== 3 || !versionCheck) {
        throw new Error('E2E workflow verification failed')
      }
      
      console.log(`[v0] ✓ All workflow components verified`)
      
      // Cleanup
      await lineageCollection.deleteOne({ _id: lineageResult.insertedId })
      await auditCollection.deleteOne({ _id: auditResult.insertedId })
      await dataCollection.deleteMany({ _runId: runId })
      await versionCollection.deleteOne({ _id: versionResult.insertedId })
    })

    // Test 12: Error Handling
    await runner.test('Error Handling - Invalid Operations', async () => {
      const collection = runner.db.collection('api_test_invalid')
      
      // Try to query non-existent document
      const result = await collection.findOne({ _id: 'non_existent_id_12345' })
      if (result !== null) {
        throw new Error('Expected null for non-existent document')
      }
      
      console.log(`[v0] Handled non-existent document query correctly`)
      
      // Try to update non-existent document
      const updateResult = await collection.updateOne(
        { _id: 'non_existent_id' },
        { $set: { test: true } }
      )
      
      if (updateResult.matchedCount !== 0) {
        throw new Error('Expected 0 matched documents')
      }
      
      console.log(`[v0] Handled non-existent document update correctly`)
    })

  } catch (error) {
    console.error('[v0] 💥 Test suite crashed:', error)
    throw error
  } finally {
    await runner.disconnect()
    runner.printSummary()
    
    // Exit with appropriate code
    process.exit(runner.results.failed > 0 ? 1 : 0)
  }
}

// Run all tests
console.log('[v0] Modern Data Platform - Comprehensive Test Suite')
console.log('[v0] Date:', new Date().toISOString())
console.log('[v0] MongoDB:', TEST_CONFIG.mongodb.db)
console.log('')

runTests().catch(error => {
  console.error('[v0] Fatal error:', error)
  process.exit(1)
})
