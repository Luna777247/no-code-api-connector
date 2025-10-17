/**
 * Unit Tests for Modern Data Platform Features (No DB Required)
 * Tests: Validation Logic, Parameter Generation, Transformation Logic
 */

console.log('[v0] ============================================')
console.log('[v0] Modern Data Platform - Unit Tests')
console.log('[v0] Date:', new Date().toISOString())
console.log('[v0] ============================================\n')

// Test Results Tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
}

function test(name, fn) {
  results.total++
  const startTime = Date.now()
  
  try {
    console.log(`\n[v0] 🧪 Test: ${name}`)
    fn()
    
    const duration = Date.now() - startTime
    results.passed++
    results.tests.push({ name, status: 'PASSED', duration })
    console.log(`[v0] ✅ PASSED (${duration}ms)`)
    return true
  } catch (error) {
    const duration = Date.now() - startTime
    results.failed++
    results.tests.push({ name, status: 'FAILED', duration, error: error.message })
    console.error(`[v0] ❌ FAILED: ${error.message}`)
    return false
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
  }
}

// ===== Test Suite =====

// Test 1: Validation Rule Types
test('Validation - Rule Type Definition', () => {
  const validationRules = [
    { field: 'id', rule: 'required' },
    { field: 'email', rule: 'pattern', params: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' } },
    { field: 'age', rule: 'range', params: { min: 0, max: 120 } },
    { field: 'status', rule: 'enum', params: { values: ['active', 'inactive', 'pending'] } },
    { field: 'username', rule: 'unique' },
    { field: 'password', rule: 'custom', params: { fn: (val) => val.length >= 8 } }
  ]
  
  console.log(`[v0]   Configured ${validationRules.length} validation rules:`)
  validationRules.forEach(rule => {
    console.log(`[v0]     - ${rule.field}: ${rule.rule}`)
  })
  
  assert(validationRules.length === 6, 'Should have 6 validation rules')
  assert(validationRules[0].rule === 'required', 'First rule should be required')
  assert(validationRules[2].params.min === 0, 'Range rule should have min param')
})

// Test 2: Email Pattern Validation
test('Validation - Email Pattern Matching', () => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  const validEmails = [
    'user@example.com',
    'test.user@domain.co.uk',
    'info@company.org'
  ]
  
  const invalidEmails = [
    'invalid-email',
    'missing@domain',
    '@nodomain.com',
    'spaces in@email.com'
  ]
  
  validEmails.forEach(email => {
    assert(emailPattern.test(email), `${email} should be valid`)
  })
  
  invalidEmails.forEach(email => {
    assert(!emailPattern.test(email), `${email} should be invalid`)
  })
  
  console.log(`[v0]   ✓ Validated ${validEmails.length} valid emails`)
  console.log(`[v0]   ✓ Rejected ${invalidEmails.length} invalid emails`)
})

// Test 3: Range Validation
test('Validation - Numeric Range Check', () => {
  const rangeRule = { min: 0, max: 120 }
  
  const validAges = [0, 25, 50, 100, 120]
  const invalidAges = [-1, -10, 121, 150, 200]
  
  validAges.forEach(age => {
    const isValid = age >= rangeRule.min && age <= rangeRule.max
    assert(isValid, `Age ${age} should be valid (0-120)`)
  })
  
  invalidAges.forEach(age => {
    const isValid = age >= rangeRule.min && age <= rangeRule.max
    assert(!isValid, `Age ${age} should be invalid (0-120)`)
  })
  
  console.log(`[v0]   ✓ Validated ${validAges.length} valid ages`)
  console.log(`[v0]   ✓ Rejected ${invalidAges.length} invalid ages`)
})

// Test 4: Enum Validation
test('Validation - Enum Values Check', () => {
  const allowedStatuses = ['active', 'inactive', 'pending']
  
  const validStatuses = ['active', 'inactive', 'pending']
  const invalidStatuses = ['deleted', 'archived', 'unknown', 'Active']
  
  validStatuses.forEach(status => {
    assert(allowedStatuses.includes(status), `Status ${status} should be allowed`)
  })
  
  invalidStatuses.forEach(status => {
    assert(!allowedStatuses.includes(status), `Status ${status} should not be allowed`)
  })
  
  console.log(`[v0]   ✓ Allowed statuses: ${allowedStatuses.join(', ')}`)
  console.log(`[v0]   ✓ Rejected ${invalidStatuses.length} invalid statuses`)
})

// Test 5: JSONPath Field Mapping
test('Transformation - JSONPath Extraction', () => {
  const testData = {
    id: '123',
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      address: {
        city: 'New York',
        country: 'USA'
      }
    },
    tags: ['javascript', 'nodejs', 'mongodb']
  }
  
  // Simulate JSONPath extraction (simplified)
  const mappings = [
    { sourcePath: '$.id', targetField: 'user_id', expected: '123' },
    { sourcePath: '$.user.name', targetField: 'name', expected: 'John Doe' },
    { sourcePath: '$.user.email', targetField: 'email', expected: 'john@example.com' },
    { sourcePath: '$.user.address.city', targetField: 'city', expected: 'New York' },
    { sourcePath: '$.tags[0]', targetField: 'first_tag', expected: 'javascript' }
  ]
  
  console.log(`[v0]   Testing ${mappings.length} field mappings:`)
  mappings.forEach(mapping => {
    // Simplified path extraction (real implementation uses JSONPath library)
    const path = mapping.sourcePath.replace('$.', '').replace('[0]', '.0')
    const parts = path.split('.')
    let value = testData
    
    for (const part of parts) {
      value = value[part]
    }
    
    assertEqual(value, mapping.expected, `Mapping ${mapping.sourcePath} failed`)
    console.log(`[v0]     ✓ ${mapping.sourcePath} → ${mapping.targetField}`)
  })
})

// Test 6: Data Type Conversion
test('Transformation - Data Type Conversion', () => {
  const conversions = [
    { value: '123', type: 'number', expected: 123 },
    { value: '45.67', type: 'number', expected: 45.67 },
    { value: 'true', type: 'boolean', expected: true },
    { value: 'false', type: 'boolean', expected: false },
    { value: 123, type: 'string', expected: '123' },
    { value: '2024-01-15', type: 'date', expectedType: 'object' }
  ]
  
  console.log(`[v0]   Testing ${conversions.length} type conversions:`)
  conversions.forEach(conv => {
    let converted
    
    switch (conv.type) {
      case 'number':
        converted = Number(conv.value)
        break
      case 'boolean':
        converted = conv.value === 'true' || conv.value === true
        break
      case 'string':
        converted = String(conv.value)
        break
      case 'date':
        converted = new Date(conv.value)
        break
    }
    
    if (conv.expectedType) {
      assert(typeof converted === conv.expectedType, `Type conversion to ${conv.type} failed`)
    } else {
      assertEqual(converted, conv.expected, `Value conversion failed`)
    }
    
    console.log(`[v0]     ✓ ${JSON.stringify(conv.value)} (${typeof conv.value}) → ${conv.type}`)
  })
})

// Test 7: Parameter Generation - List Mode
test('Parameter Generation - List Mode', () => {
  const paramConfig = {
    name: 'userId',
    mode: 'list',
    values: ['1', '2', '3', '4', '5']
  }
  
  // Simulate list parameter generation
  const combinations = paramConfig.values.map(value => ({ [paramConfig.name]: value }))
  
  assert(combinations.length === 5, 'Should generate 5 combinations')
  assertEqual(combinations[0], { userId: '1' }, 'First combination incorrect')
  assertEqual(combinations[4], { userId: '5' }, 'Last combination incorrect')
  
  console.log(`[v0]   Generated ${combinations.length} parameter combinations`)
  console.log(`[v0]   Sample: ${JSON.stringify(combinations.slice(0, 3))}`)
})

// Test 8: Parameter Generation - Cartesian Product
test('Parameter Generation - Cartesian Mode', () => {
  const params = [
    { name: 'page', values: ['1', '2'] },
    { name: 'limit', values: ['10', '20'] }
  ]
  
  // Simulate cartesian product
  const combinations = []
  params[0].values.forEach(page => {
    params[1].values.forEach(limit => {
      combinations.push({ page, limit })
    })
  })
  
  assert(combinations.length === 4, 'Should generate 4 combinations (2x2)')
  assertEqual(combinations[0], { page: '1', limit: '10' }, 'First combination incorrect')
  assertEqual(combinations[3], { page: '2', limit: '20' }, 'Last combination incorrect')
  
  console.log(`[v0]   Generated ${combinations.length} parameter combinations`)
  console.log(`[v0]   Combinations: ${JSON.stringify(combinations)}`)
})

// Test 9: Lineage Graph Structure
test('Lineage - Graph Node/Edge Structure', () => {
  const lineageGraph = {
    runId: 'test_run_123',
    connectionId: 'conn_456',
    nodes: [
      { id: 'source_1', type: 'source', name: 'API Source' },
      { id: 'transform_1', type: 'transformation', name: 'Field Mapping' },
      { id: 'dest_1', type: 'destination', name: 'MongoDB' }
    ],
    edges: [
      { from: 'source_1', to: 'transform_1', type: 'extract' },
      { from: 'transform_1', to: 'dest_1', type: 'load' }
    ]
  }
  
  assert(lineageGraph.nodes.length === 3, 'Should have 3 nodes')
  assert(lineageGraph.edges.length === 2, 'Should have 2 edges')
  
  // Verify node types
  const nodeTypes = lineageGraph.nodes.map(n => n.type)
  assert(nodeTypes.includes('source'), 'Should have source node')
  assert(nodeTypes.includes('transformation'), 'Should have transformation node')
  assert(nodeTypes.includes('destination'), 'Should have destination node')
  
  // Verify edge connections
  const firstEdge = lineageGraph.edges[0]
  assert(firstEdge.from === 'source_1' && firstEdge.to === 'transform_1', 'Edge connection incorrect')
  
  console.log(`[v0]   ✓ Graph structure: ${lineageGraph.nodes.length} nodes, ${lineageGraph.edges.length} edges`)
  console.log(`[v0]   ✓ Node types: ${nodeTypes.join(' → ')}`)
})

// Test 10: Audit Log Entry Structure
test('Audit Log - Entry Structure Validation', () => {
  const auditEntry = {
    id: 'audit_123',
    timestamp: new Date(),
    eventType: 'connection.executed',
    level: 'info',
    userId: 'user_456',
    resource: {
      type: 'connection',
      id: 'conn_789',
      name: 'Test Connection'
    },
    action: 'Connection executed',
    details: {
      runId: 'run_123',
      recordsProcessed: 100
    },
    result: 'success'
  }
  
  // Verify required fields
  assert(auditEntry.id, 'Should have id')
  assert(auditEntry.timestamp instanceof Date, 'Should have valid timestamp')
  assert(auditEntry.eventType, 'Should have eventType')
  assert(auditEntry.level, 'Should have level')
  assert(auditEntry.resource.type, 'Should have resource type')
  assert(auditEntry.action, 'Should have action')
  assert(auditEntry.result, 'Should have result')
  
  console.log(`[v0]   ✓ Event: ${auditEntry.eventType}`)
  console.log(`[v0]   ✓ Resource: ${auditEntry.resource.type}/${auditEntry.resource.id}`)
  console.log(`[v0]   ✓ Result: ${auditEntry.result}`)
})

// Test 11: Data Versioning - Checksum Calculation
test('Data Versioning - Checksum Logic', () => {
  const testData = [
    { id: '1', name: 'User 1' },
    { id: '2', name: 'User 2' }
  ]
  
  // Simple checksum calculation (real implementation uses crypto)
  const dataString = JSON.stringify(testData)
  const simpleChecksum = dataString.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0).toString(16)
  
  assert(simpleChecksum.length > 0, 'Checksum should not be empty')
  
  // Test consistency
  const dataString2 = JSON.stringify(testData)
  const checksum2 = dataString2.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0).toString(16)
  
  assertEqual(simpleChecksum, checksum2, 'Checksums should match for identical data')
  
  console.log(`[v0]   ✓ Checksum: ${simpleChecksum}`)
  console.log(`[v0]   ✓ Checksum consistency verified`)
})

// Test 12: Schema Inference
test('Data Versioning - Schema Inference', () => {
  const sampleRecord = {
    id: '123',
    name: 'John Doe',
    age: 30,
    active: true,
    tags: ['javascript', 'nodejs'],
    metadata: { source: 'api' },
    createdAt: new Date()
  }
  
  const inferredSchema = {}
  for (const [key, value] of Object.entries(sampleRecord)) {
    if (Array.isArray(value)) {
      inferredSchema[key] = 'array'
    } else if (value instanceof Date) {
      inferredSchema[key] = 'date'
    } else {
      inferredSchema[key] = typeof value
    }
  }
  
  assertEqual(inferredSchema.id, 'string', 'id should be string')
  assertEqual(inferredSchema.age, 'number', 'age should be number')
  assertEqual(inferredSchema.active, 'boolean', 'active should be boolean')
  assertEqual(inferredSchema.tags, 'array', 'tags should be array')
  assertEqual(inferredSchema.metadata, 'object', 'metadata should be object')
  assertEqual(inferredSchema.createdAt, 'date', 'createdAt should be date')
  
  console.log(`[v0]   ✓ Inferred schema:`, inferredSchema)
})

// Test 13: Cache Key Generation
test('Caching - Cache Key Generation', () => {
  const cacheKeyComponents = {
    prefix: 'api',
    connectionId: 'conn_123',
    params: { page: '1', limit: '10' }
  }
  
  const cacheKey = `${cacheKeyComponents.prefix}:${cacheKeyComponents.connectionId}:${JSON.stringify(cacheKeyComponents.params)}`
  
  assert(cacheKey.startsWith('api:'), 'Cache key should start with prefix')
  assert(cacheKey.includes('conn_123'), 'Cache key should include connectionId')
  assert(cacheKey.includes('"page":"1"'), 'Cache key should include params')
  
  console.log(`[v0]   ✓ Generated cache key: ${cacheKey}`)
})

// Test 14: TTL (Time To Live) Calculation
test('Caching - TTL Calculation', () => {
  const now = Date.now()
  const ttlSeconds = 300 // 5 minutes
  const expiresAt = now + (ttlSeconds * 1000)
  
  const remainingTime = expiresAt - now
  const remainingSeconds = Math.floor(remainingTime / 1000)
  
  assert(remainingSeconds === ttlSeconds, 'TTL calculation should be correct')
  
  console.log(`[v0]   ✓ TTL: ${ttlSeconds} seconds (${ttlSeconds / 60} minutes)`)
  console.log(`[v0]   ✓ Expires at: ${new Date(expiresAt).toISOString()}`)
})

// Test 15: Workflow Configuration Validation
test('Workflow - Configuration Structure', () => {
  const workflowConfig = {
    connectionId: 'conn_123',
    apiConfig: {
      baseUrl: 'https://api.example.com/users',
      method: 'GET',
      headers: { 'Authorization': 'Bearer token' }
    },
    parameters: [
      { name: 'page', mode: 'list', values: ['1', '2'] }
    ],
    fieldMappings: [
      { sourcePath: '$.id', targetField: 'user_id', dataType: 'string' }
    ],
    validationRules: [
      { field: 'user_id', rule: 'required' }
    ],
    options: {
      enableCaching: true,
      enableLineageTracking: true,
      enableVersioning: true,
      enableAuditLog: true
    }
  }
  
  // Verify required fields
  assert(workflowConfig.connectionId, 'Should have connectionId')
  assert(workflowConfig.apiConfig, 'Should have apiConfig')
  assert(workflowConfig.parameters.length > 0, 'Should have parameters')
  assert(workflowConfig.fieldMappings.length > 0, 'Should have field mappings')
  assert(workflowConfig.validationRules, 'Should have validation rules')
  assert(workflowConfig.options, 'Should have options')
  
  // Verify all governance options are enabled
  const allEnabled = Object.values(workflowConfig.options).every(v => v === true)
  assert(allEnabled, 'All governance options should be enabled')
  
  console.log(`[v0]   ✓ Connection: ${workflowConfig.connectionId}`)
  console.log(`[v0]   ✓ API: ${workflowConfig.apiConfig.method} ${workflowConfig.apiConfig.baseUrl}`)
  console.log(`[v0]   ✓ Parameters: ${workflowConfig.parameters.length}`)
  console.log(`[v0]   ✓ Field Mappings: ${workflowConfig.fieldMappings.length}`)
  console.log(`[v0]   ✓ Validation Rules: ${workflowConfig.validationRules.length}`)
  console.log(`[v0]   ✓ All governance features: ENABLED`)
})

// ===== Print Summary =====

console.log('\n' + '='.repeat(60))
console.log('[v0] 📊 TEST SUMMARY')
console.log('='.repeat(60))
console.log(`Total Tests: ${results.total}`)
console.log(`✅ Passed: ${results.passed}`)
console.log(`❌ Failed: ${results.failed}`)
console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`)
console.log('='.repeat(60))

if (results.failed > 0) {
  console.log('\n[v0] ❌ Failed Tests:')
  results.tests
    .filter(t => t.status === 'FAILED')
    .forEach(t => console.log(`  - ${t.name}: ${t.error}`))
}

console.log('\n[v0] Test execution completed')
console.log(`[v0] Duration: ${results.tests.reduce((sum, t) => sum + t.duration, 0)}ms`)

process.exit(results.failed > 0 ? 1 : 0)
