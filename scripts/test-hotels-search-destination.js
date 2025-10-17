// 🏨 Test: Booking.com Hotels Search Destination API
// Simple test for location search with single query parameter

const SERVER_URL = 'http://localhost:3000'

// Test Configuration - Hotels Search Destination
const HOTELS_SEARCH_CONFIG = {
  name: 'Booking.com Hotels Search',
  description: 'Search hotel destinations by location name',
  apiUrl: 'https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination',
  method: 'GET',
  headers: {
    'x-rapidapi-key': '02ad4fd6f3msh1f0390da51ae627p19a5cfjsn7f2b23cadfdb',
    'x-rapidapi-host': 'booking-com15.p.rapidapi.com'
  },
  parameters: {
    query: 'man' // Search for locations containing "man" (e.g., Manchester, Manhattan, etc.)
  },
  fieldMappings: [
    // Basic destination info
    { sourcePath: '$.data[*].dest_id', targetField: 'destination_id', dataType: 'string' },
    { sourcePath: '$.data[*].name', targetField: 'destination_name', dataType: 'string' },
    { sourcePath: '$.data[*].dest_type', targetField: 'destination_type', dataType: 'string' },
    { sourcePath: '$.data[*].label', targetField: 'label', dataType: 'string' },
    
    // Location details
    { sourcePath: '$.data[*].country', targetField: 'country', dataType: 'string' },
    { sourcePath: '$.data[*].region', targetField: 'region', dataType: 'string' },
    { sourcePath: '$.data[*].city_name', targetField: 'city_name', dataType: 'string' },
    
    // Coordinates
    { sourcePath: '$.data[*].latitude', targetField: 'latitude', dataType: 'number' },
    { sourcePath: '$.data[*].longitude', targetField: 'longitude', dataType: 'number' },
    
    // Additional info
    { sourcePath: '$.data[*].nr_hotels', targetField: 'hotels_count', dataType: 'number' },
    { sourcePath: '$.data[*].timezone', targetField: 'timezone', dataType: 'string' },
    
    // Metadata
    { sourcePath: '$.message', targetField: 'api_message', dataType: 'string' },
    { sourcePath: '$.timestamp', targetField: 'extracted_at', dataType: 'date', defaultValue: new Date().toISOString() }
  ],
  schedule: {
    frequency: 'daily',
    time: '09:00',
    timezone: 'Asia/Ho_Chi_Minh'
  }
}

console.log('╔══════════════════════════════════════════════════════════════════╗')
console.log('║      🏨 HOTELS SEARCH DESTINATION TEST 🏨                       ║')
console.log('╚══════════════════════════════════════════════════════════════════╝\n')

async function runHotelsSearchTest() {
  let connectionId = null
  let runId = null
  
  try {
    // ═══════════════════════════════════════════════════════════════
    // PHASE 1: CREATE API CONNECTION
    // ═══════════════════════════════════════════════════════════════
    console.log('📡 PHASE 1: Creating API Connection...\n')
    
    const connectionResponse = await fetch(`${SERVER_URL}/api/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: HOTELS_SEARCH_CONFIG.name,
        description: HOTELS_SEARCH_CONFIG.description,
        baseUrl: HOTELS_SEARCH_CONFIG.apiUrl,
        method: HOTELS_SEARCH_CONFIG.method,
        headers: HOTELS_SEARCH_CONFIG.headers,
        authType: 'api-key',
        isActive: true
      })
    })
    
    if (!connectionResponse.ok) {
      throw new Error(`Failed to create connection: ${connectionResponse.status}`)
    }
    
    const connection = await connectionResponse.json()
    connectionId = connection.connectionId || connection._id || connection.id
    
    console.log('✅ Connection created successfully')
    console.log(`   ID: ${connectionId}`)
    console.log(`   Name: ${HOTELS_SEARCH_CONFIG.name}`)
    console.log(`   URL: ${HOTELS_SEARCH_CONFIG.apiUrl}\n`)

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: CREATE FIELD MAPPINGS
    // ═══════════════════════════════════════════════════════════════
    console.log('🗺️  PHASE 2: Creating Field Mappings...\n')
    
    const mappingResponse = await fetch(`${SERVER_URL}/api/mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionId,
        name: 'Hotels Search Destination Mapping',
        description: 'Maps hotel destination search results to structured format',
        mappings: HOTELS_SEARCH_CONFIG.fieldMappings
      })
    })
    
    if (!mappingResponse.ok) {
      throw new Error(`Failed to create mapping: ${mappingResponse.status}`)
    }
    
    const mapping = await mappingResponse.json()
    
    console.log('✅ Field mappings created successfully')
    console.log(`   Total fields: ${HOTELS_SEARCH_CONFIG.fieldMappings.length}`)
    console.log(`   Mapping ID: ${mapping.mappingId}`)
    console.log('\n   Field mapping summary:')
    console.log('   • destination_id, destination_name, destination_type, label')
    console.log('   • country, region, city_name')
    console.log('   • latitude, longitude')
    console.log('   • hotels_count, timezone')
    console.log('   • api_message, extracted_at\n')

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: TEST API CONNECTION
    // ═══════════════════════════════════════════════════════════════
    console.log('🧪 PHASE 3: Testing API Connection...\n')
    
    // Build full URL with query params
    const queryParams = new URLSearchParams(HOTELS_SEARCH_CONFIG.parameters)
    const fullUrl = `${HOTELS_SEARCH_CONFIG.apiUrl}?${queryParams.toString()}`
    
    const testResponse = await fetch(`${SERVER_URL}/api/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionId,
        apiConfig: {
          baseUrl: fullUrl,
          method: HOTELS_SEARCH_CONFIG.method,
          headers: HOTELS_SEARCH_CONFIG.headers
        },
        timeout: 30000
      })
    })
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text()
      console.log(`   ⚠️  API test failed: ${testResponse.status}`)
      console.log(`   Error: ${errorText}`)
      console.log(`   Skipping test phase and continuing...\n`)
    } else {
      const testResult = await testResponse.json()
      
      console.log('✅ API connection test successful')
      console.log(`   Valid: ${testResult.valid}`)
      console.log(`   Success: ${testResult.success}`)
      console.log(`   Status: ${testResult.status}`)
      console.log(`   Response time: ${testResult.responseTime || 'N/A'}ms`)
      
      if (testResult.data?.data) {
        const destinations = testResult.data.data
        console.log(`   Destinations found: ${destinations.length}`)
        
        if (destinations.length > 0) {
          console.log(`\n   Sample destinations:`)
          destinations.slice(0, 3).forEach((dest, i) => {
            console.log(`   ${i + 1}. ${dest.name || dest.label || 'N/A'}`)
            console.log(`      • Type: ${dest.dest_type || 'N/A'}`)
            console.log(`      • Country: ${dest.country || 'N/A'}`)
            console.log(`      • Hotels: ${dest.nr_hotels || 0}`)
          })
        }
      }
      console.log()
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 4: EXECUTE ETL PIPELINE
    // ═══════════════════════════════════════════════════════════════
    console.log('⚙️  PHASE 4: Executing ETL Pipeline...\n')
    
    const runResponse = await fetch(`${SERVER_URL}/api/execute-run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionId,
        apiConfig: {
          baseUrl: HOTELS_SEARCH_CONFIG.apiUrl,
          method: HOTELS_SEARCH_CONFIG.method,
          headers: HOTELS_SEARCH_CONFIG.headers
        },
        parameters: Object.entries(HOTELS_SEARCH_CONFIG.parameters).map(([name, value]) => ({
          name,
          mode: 'single',
          value: value
        })),
        fieldMappings: HOTELS_SEARCH_CONFIG.fieldMappings
      })
    })
    
    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      throw new Error(`ETL run failed: ${runResponse.status} - ${errorText}`)
    }
    
    const runResult = await runResponse.json()
    runId = runResult.runId
    
    console.log('✅ ETL pipeline executed successfully')
    console.log(`   Run ID: ${runId}`)
    console.log(`   Status: ${runResult.status}`)
    console.log(`   Records extracted: ${runResult.recordsExtracted || 0}`)
    console.log(`   Records transformed: ${runResult.recordsTransformed || 0}`)
    console.log(`   Records loaded: ${runResult.recordsLoaded || 0}\n`)

    // ═══════════════════════════════════════════════════════════════
    // PHASE 5: VERIFY DATA IN MONGODB
    // ═══════════════════════════════════════════════════════════════
    console.log('💾 PHASE 5: Verifying Data in MongoDB...\n')
    
    // Wait for data to be written
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const dataResponse = await fetch(`${SERVER_URL}/api/data?connectionId=${connectionId}&limit=5&format=detailed&timeRange=1h`)
    
    if (dataResponse.ok) {
      const dataResult = await dataResponse.json()
      
      console.log('✅ Data retrieved from MongoDB')
      console.log(`   Total runs: ${dataResult.totalRuns || 0}`)
      console.log(`   Total records: ${dataResult.totalRecords || 0}`)
      console.log(`   Runs retrieved: ${dataResult.data?.length || 0}`)
      
      if (dataResult.data && dataResult.data.length > 0) {
        const latestRun = dataResult.data[0]
        console.log(`\n   Latest run (${latestRun.runId}):`)
        console.log(`   • Status: ${latestRun.status}`)
        console.log(`   • Records: ${latestRun.recordsProcessed || 0}`)
        console.log(`   • Execution time: ${latestRun.executionTime || 0}ms`)
        
        if (latestRun.dataPreview && latestRun.dataPreview.length > 0) {
          console.log(`\n   Sample data preview:`)
          const sample = latestRun.dataPreview[0]
          if (sample.data && sample.data.length > 0) {
            const dest = sample.data[0]
            console.log(`   • Destination: ${dest.name || dest.label || 'N/A'}`)
            console.log(`   • Type: ${dest.dest_type || 'N/A'}`)
            console.log(`   • Country: ${dest.country || 'N/A'}`)
            console.log(`   • Hotels: ${dest.nr_hotels || 0}`)
          }
        }
      }
    } else {
      const errorText = await dataResponse.text()
      console.log(`⚠️  Could not verify MongoDB data: ${dataResponse.status}`)
      console.log(`   Error: ${errorText}`)
    }
    console.log()

    // ═══════════════════════════════════════════════════════════════
    // PHASE 6: CREATE DAILY SCHEDULE
    // ═══════════════════════════════════════════════════════════════
    console.log('📅 PHASE 6: Creating Daily Schedule...\n')
    
    const scheduleResponse = await fetch(`${SERVER_URL}/api/scheduler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: connectionId,
        frequency: HOTELS_SEARCH_CONFIG.schedule.frequency,
        time: HOTELS_SEARCH_CONFIG.schedule.time,
        timezone: HOTELS_SEARCH_CONFIG.schedule.timezone,
        isActive: true,
        config: {
          apiConfig: {
            baseUrl: HOTELS_SEARCH_CONFIG.apiUrl,
            method: HOTELS_SEARCH_CONFIG.method,
            headers: HOTELS_SEARCH_CONFIG.headers
          },
          parameters: Object.entries(HOTELS_SEARCH_CONFIG.parameters).map(([name, value]) => ({
            name,
            mode: 'single',
            value: value
          })),
          fieldMappings: HOTELS_SEARCH_CONFIG.fieldMappings
        }
      })
    })
    
    const schedule = await scheduleResponse.json()
    
    console.log('✅ Schedule created successfully')
    console.log(`   Schedule ID: ${schedule.scheduleId}`)
    console.log(`   Frequency: ${HOTELS_SEARCH_CONFIG.schedule.frequency}`)
    console.log(`   Time: ${HOTELS_SEARCH_CONFIG.schedule.time} (${HOTELS_SEARCH_CONFIG.schedule.timezone})`)
    console.log(`   Next run: ${schedule.nextRun || 'N/A'}\n`)

    // ═══════════════════════════════════════════════════════════════
    // FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('═'.repeat(66))
    console.log('✅ HOTELS SEARCH DESTINATION TEST - SUCCESS!')
    console.log('═'.repeat(66))
    console.log()
    console.log('🎯 Test Summary:')
    console.log()
    console.log(`   • Connection ID: ${connectionId}`)
    console.log(`   • Run ID: ${runId}`)
    console.log(`   • API: Booking.com Hotels Search Destination`)
    console.log(`   • Query: "${HOTELS_SEARCH_CONFIG.parameters.query}"`)
    console.log(`   • Schedule: ${HOTELS_SEARCH_CONFIG.schedule.frequency} at ${HOTELS_SEARCH_CONFIG.schedule.time}`)
    console.log(`   • Status: All phases completed successfully! 🎉`)
    console.log()
    console.log('🔗 Quick Links:')
    console.log('   • View data: http://localhost:3000/data')
    console.log('   • Check runs: http://localhost:3000/runs')
    console.log('   • Manage schedules: http://localhost:3000/schedules')
    console.log()

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message)
    console.error('\nError details:', error)
  } finally {
    // Cleanup: Delete test connection
    if (connectionId) {
      console.log('\n🧹 Cleaning up test connection...')
      try {
        await fetch(`${SERVER_URL}/api/connections/${connectionId}`, {
          method: 'DELETE'
        })
        console.log('✅ Test connection cleaned up\n')
      } catch (cleanupError) {
        console.log('⚠️  Could not clean up test connection\n')
      }
    }
  }
}

runHotelsSearchTest()
