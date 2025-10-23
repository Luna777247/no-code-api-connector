// Workflow Orchestrator - Manages the full ETL pipeline
import { ApiExecutor, type ApiRequest } from "./api-executor"
import { ParameterGenerator, type Parameter } from "./parameter-generator"
import { DataTransformer, type FieldMapping } from "./data-transformer"
import { PlacesNormalizer } from "./places-normalizer"
import { DataValidator, type ValidationRule } from "./data-validator"
import { LineageTracker } from "./data-lineage" // Removed DataVersioning import
import { AuditLogger } from "./audit-logger"
import { cacheManager } from "./redis-cache"
import { getDb } from "./mongo"
import { CollectionManager, type DataDocument } from "./database-schema"

export interface WorkflowConfig {
  connectionId: string
  apiConfig: {
    baseUrl: string
    method: string
    headers?: Record<string, string>
    authType?: string
    authConfig?: any
  }
  parameters: Parameter[]
  fieldMappings: FieldMapping[]
  tableName?: string // Target collection name for storing data
  validationRules?: ValidationRule[]
  options?: {
    maxRetries?: number
    retryDelay?: number
    batchSize?: number
    enableCaching?: boolean
    enableLineageTracking?: boolean
    enablePlacesNormalization?: boolean
    enableAuditLog?: boolean
    // enableVersioning?: boolean // Commented out - versioning feature removed
  }
}

export interface WorkflowResult {
  runId: string
  status: "success" | "failed" | "partial"
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  recordsExtracted: number
  recordsLoaded: number
  duration: number
  errors: string[]
}

export class WorkflowOrchestrator {
  private executor: ApiExecutor
  private paramGenerator: ParameterGenerator
  private transformer: DataTransformer
  private lineageTracker: LineageTracker

  constructor() {
    this.executor = new ApiExecutor()
    this.paramGenerator = new ParameterGenerator()
    this.transformer = new DataTransformer()
    this.lineageTracker = new LineageTracker()
  }

  async executeWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
    const runId = Math.random().toString(36).substr(2, 9)
    const startTime = Date.now()
    const errors: string[] = []

    console.log(`[v0] Starting workflow execution for connection: ${config.connectionId}`)
    console.log(`[v0] Run ID: ${runId}`)

    // Start lineage tracking if enabled
    if (config.options?.enableLineageTracking !== false) {
      this.lineageTracker.startTracking(runId, config.connectionId)
      this.lineageTracker.trackSource(
        `api_${config.connectionId}`,
        config.apiConfig.baseUrl,
        'API',
        { method: config.apiConfig.method, authType: config.apiConfig.authType }
      )
    }

    // Log audit event for workflow execution
    if (config.options?.enableAuditLog !== false) {
      await AuditLogger.logConnectionEvent(
        'executed',
        config.connectionId,
        config.apiConfig.baseUrl,
        undefined, // TODO: Get userId from context
        { runId, parameters: config.parameters.length }
      )
    }

    try {
      // Step 1: Generate parameter combinations
      // Handle both Parameter[] and simple object formats
      let processedParameters: Parameter[] = [];

      if (Array.isArray(config.parameters)) {
        if (config.parameters.length > 0 && typeof config.parameters[0] === 'object' && 'name' in config.parameters[0] && 'value' in config.parameters[0]) {
          // Convert array of simple parameter objects {name, value, type} to Parameter format
          processedParameters = config.parameters.map((paramObj: any) => ({
            name: paramObj.name,
            type: 'query' as const,
            mode: 'list' as const,
            values: [paramObj.value]
          }));
        } else {
          processedParameters = config.parameters;
        }
      } else if (typeof config.parameters === 'object' && config.parameters !== null) {
        // Convert single parameter object to Parameter array
        processedParameters = Object.entries(config.parameters).map(([key, value]) => ({
          name: key,
          type: 'query' as const,
          mode: 'list' as const,
          values: [value as string]
        }));
      }

      const paramCombinations = this.paramGenerator.generateCombinations(processedParameters)
      console.log(`[v0] Processed parameters:`, processedParameters)
      console.log(`[v0] Generated ${paramCombinations.length} parameter combinations:`, paramCombinations)

      // Step 2: Build API requests
      const requests: ApiRequest[] = paramCombinations.map((params) => ({
        url: this.buildUrl(config.apiConfig.baseUrl, params),
        method: config.apiConfig.method,
        headers: this.buildHeaders(config.apiConfig),
        // params are already included in the URL, don't pass them separately
      }))

      // Step 3: Execute API requests with caching
      let results: any[]
      
      if (config.options?.enableCaching !== false && config.apiConfig.method === 'GET') {
        // Check cache for GET requests
        const cacheKey = `api:${config.connectionId}:${JSON.stringify(requests)}`
        const cached = await cacheManager.get(cacheKey)
        
        if (cached) {
          console.log(`[v0] Cache hit for ${requests.length} requests`)
          results = cached
        } else {
          console.log(`[v0] Cache miss, executing API requests`)
          results = await this.executor.executeBatch(requests)
          
          // Cache successful results for 5 minutes
          const successfulResults = results.filter((r) => r.success)
          if (successfulResults.length > 0) {
            await cacheManager.set(cacheKey, results, 300)
          }
        }
      } else {
        results = await this.executor.executeBatch(requests)
      }
      const successfulResults = results.filter((r) => r.success)
      const failedResults = results.filter((r) => !r.success)

      // Collect errors
      failedResults.forEach((result) => {
        if (result.error) errors.push(result.error)
      })

      // Step 4: Extract and transform data
      const extractedData = successfulResults.flatMap((result) => {
        if (Array.isArray(result.data)) {
          return result.data
        }
        // Handle API responses that return objects with data arrays
        if (result.data && typeof result.data === 'object') {
          // Check for common array fields in API responses
          if (Array.isArray(result.data.results)) {
            return result.data.results // Google Maps, etc.
          }
          if (Array.isArray(result.data.data)) {
            return result.data.data // Some APIs use 'data'
          }
          if (Array.isArray(result.data.items)) {
            return result.data.items // Some APIs use 'items'
          }
        }
        return [result.data]
      })

      console.log(`[v0] Extracted ${extractedData.length} records`)
      console.log(`[v0] First extracted record:`, JSON.stringify(extractedData[0], null, 2))

      const transformedData = this.transformer.transformBatch(extractedData, config.fieldMappings)
      console.log(`[v0] Transformed ${transformedData.length} records`)
      console.log(`[v0] First transformed record:`, JSON.stringify(transformedData[0], null, 2))

      // Track transformation in lineage
      if (config.options?.enableLineageTracking !== false) {
        this.lineageTracker.trackTransformation(
          `transform_${runId}`,
          'field_mapping',
          [`mappings: ${config.fieldMappings.length}`, `records: ${transformedData.length}`]
        )
      }

      // Step 4.1: Save raw data if it's places data
      if (this.isPlacesData(extractedData)) {
        console.log(`[v0] Detected places data, saving raw data...`)
        await this.saveRawPlacesToDatabase(extractedData, config.connectionId)
      }

      // Step 4.2: Places normalization (nếu là places data và được enable)
      const placesData: any[] = []
      if (this.isPlacesData(extractedData) && config.options?.enablePlacesNormalization !== false) {
        console.log(`[v0] Places normalization enabled, normalizing...`)
        const placesNormalizer = new PlacesNormalizer()
        const sourceApi = this.extractSourceApi(config.connectionId || 'unknown')

        for (const result of successfulResults) {
          const normalized = placesNormalizer.normalizeToPlaces(result.data, sourceApi)
          placesData.push(...normalized)
        }

        console.log(`[v0] Normalized ${placesData.length} places`)

        // Save normalized places
        if (placesData.length > 0) {
          await this.saveNormalizedPlacesToDatabase(placesData, config.connectionId)
        }
      }

      // Step 5: Validate data
      let validData: any[]
      
      if (config.validationRules && config.validationRules.length > 0) {
        // Use DataValidator for advanced validation
        const validator = new DataValidator(config.validationRules)
        const validationResult = await validator.validate(transformedData)
        
        console.log(`[v0] Validation: ${validationResult.metadata.validRecords} valid, ${validationResult.metadata.invalidRecords} invalid`)
        
        if (validationResult.errors.length > 0) {
          console.log(`[v0] Validation errors:`, validationResult.errors.slice(0, 10)) // Log first 10 errors
          errors.push(...validationResult.errors.slice(0, 10).map(e => `Row ${e.recordIndex}: ${e.field} - ${e.message}`))
        }
        
        // Filter out invalid records based on error indices
        const invalidIndices = new Set(validationResult.errors.map(e => e.recordIndex).filter((idx): idx is number => idx !== undefined))
        validData = transformedData.filter((_: any, i: number) => !invalidIndices.has(i))
      } else {
        // Fallback to simple schema validation
        validData = transformedData.filter((data) => this.transformer.validateSchema(data, config.fieldMappings))
      }
      
      console.log(`[v0] Validated ${validData.length} records`)

      // Step 6: Load to database (only for non-places data)
      const isPlacesData = this.isPlacesData(extractedData)
      console.log(`[v0] Is places data: ${isPlacesData}`)

      if (!isPlacesData) {
        // Only save transformed data if it's NOT places data
        console.log(`[v0] Loading ${validData.length} transformed records to database...`)
        if (validData.length > 0) {
          try {
            await this.loadToDatabase(validData, config.connectionId, config.tableName)

            // Track destination in lineage
            if (config.options?.enableLineageTracking !== false) {
              this.lineageTracker.trackDestination(
                `db_${config.connectionId}`,
                config.tableName || 'api_data',
                'MongoDB',
                [`transform_${runId}`] // Input nodes array
              )

              // Complete lineage tracking
              await this.lineageTracker.completeTracking('completed', validData.length)
            }

            // Log successful data load
            if (config.options?.enableAuditLog !== false) {
              await AuditLogger.logDataAccess(
                'accessed',
                config.connectionId,
                undefined, // TODO: Get userId from context
                { runId, recordCount: validData.length, action: 'loaded' }
              )
            }
          } catch (err) {
            console.error("[v0] Error loading to database:", err)
            errors.push(err instanceof Error ? err.message : String(err))

            // Track failed lineage
            if (config.options?.enableLineageTracking !== false) {
              await this.lineageTracker.completeTracking('failed')
            }

            // Log error
            if (config.options?.enableAuditLog !== false) {
              await AuditLogger.logError(
                'error.occurred',
                'Load data to database',
                'connection',
                config.connectionId,
                err instanceof Error ? err.message : String(err),
                undefined, // TODO: Get userId from context
                { runId }
              )
            }
          }
        }
      } else {
        console.log(`[v0] Skipping transformed data load for places data (already saved as places_raw/places_standardized)`)

        // Complete lineage tracking for places data
        if (config.options?.enableLineageTracking !== false) {
          await this.lineageTracker.completeTracking('completed', placesData.length)
        }
      }

      const duration = Date.now() - startTime
      const status = failedResults.length === 0 ? "success" : successfulResults.length > 0 ? "partial" : "failed"

      console.log(`[v0] Workflow completed in ${duration}ms with status: ${status}`)

      // Step 7: Save run to api_data collection with type 'run'
      try {
        const db = await getDb()
        const recordsLoaded = isPlacesData ? placesData.length : validData.length

        const runDocument = {
          type: 'run' as const,
          connectionId: config.connectionId,
          runId: runId,
          _connectionId: config.connectionId,
          _insertedAt: new Date().toISOString(),
          data: {
            dataPreview: extractedData.slice(0, 5), // Store first 5 raw records
            transformedData: isPlacesData ? [] : validData.slice(0, 10), // Only store transformed data for non-places
          },
          runMetadata: {
            status: status as 'success' | 'failed' | 'partial',
            totalRequests: requests.length,
            successfulRequests: successfulResults.length,
            failedRequests: failedResults.length,
            recordsExtracted: extractedData.length,
            recordsLoaded: recordsLoaded,
            dataType: isPlacesData ? 'places' : 'transformed',
            duration,
            errors: errors.length > 0 ? errors : [],
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString()
          }
        }

        await db.collection(CollectionManager.getCollectionName('DATA')).insertOne(runDocument)
        console.log(`[v0] Saved run ${runId} to api_data collection (type: run)`)
      } catch (dbError) {
        console.error("[v0] Error saving run to database:", dbError)
        // Don't fail the workflow if run save fails
      }

      // Log workflow completion
      if (config.options?.enableAuditLog !== false) {
        await AuditLogger.logConnectionEvent(
          status === 'failed' ? 'deleted' : 'executed', // Use 'deleted' as fallback for 'failed'
          config.connectionId,
          config.apiConfig.baseUrl,
          undefined, // TODO: Get userId from context
          { 
            runId, 
            status, 
            duration,
            recordsExtracted: extractedData.length,
            recordsLoaded: validData.length,
            errors: errors.length
          }
        )
      }

      return {
        runId,
        status,
        totalRequests: requests.length,
        successfulRequests: successfulResults.length,
        failedRequests: failedResults.length,
        recordsExtracted: extractedData.length,
        recordsLoaded: validData.length,
        duration,
        errors,
      }
    } catch (error) {
      console.error("[v0] Workflow execution failed:", error)
      const duration = Date.now() - startTime

      // Log critical failure
      if (config.options?.enableAuditLog !== false) {
        await AuditLogger.logError(
          'error.occurred',
          'Execute workflow',
          'connection',
          config.connectionId,
          error instanceof Error ? error.message : 'Unknown error',
          undefined, // TODO: Get userId from context
          { runId, duration }
        )
      }

      // Track failed lineage
      if (config.options?.enableLineageTracking !== false) {
        await this.lineageTracker.completeTracking('failed')
      }

      return {
        runId,
        status: "failed",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        recordsExtracted: 0,
        recordsLoaded: 0,
        duration,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  private buildUrl(baseUrl: string, params: Record<string, any>): string {
    const url = new URL(baseUrl)
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
    return url.toString()
  }

  private buildHeaders(apiConfig: WorkflowConfig["apiConfig"]): Record<string, string> {
    const headers: Record<string, string> = {
      ...apiConfig.headers,
    }

    if (apiConfig.authType === "bearer" && apiConfig.authConfig?.token) {
      headers["Authorization"] = `Bearer ${apiConfig.authConfig.token}`
    } else if (apiConfig.authType === "api_key" && apiConfig.authConfig?.keyName && apiConfig.authConfig?.keyValue) {
      headers[apiConfig.authConfig.keyName] = apiConfig.authConfig.keyValue
    }

    return headers
  }

  // Helper methods for Places normalization
  private isPlacesData(data: any[]): boolean {
    if (!data || data.length === 0) return false
    
    const firstItem = data[0]
    if (!firstItem || typeof firstItem !== 'object') return false
    
    // Check for common places fields
    const placesFields = ['name', 'address', 'latitude', 'longitude', 'location', 'place_id', 'business_name']
    const hasPlacesFields = placesFields.some(field => 
      field in firstItem || 
      (firstItem.location && typeof firstItem.location === 'object') ||
      (firstItem.geometry && typeof firstItem.geometry === 'object')
    )
    
    return hasPlacesFields
  }

  private detectSourceApi(baseUrl: string): string {
    const url = baseUrl.toLowerCase()
    
    if (url.includes('rapidapi')) return 'rapidapi_places'
    if (url.includes('google') || url.includes('maps')) return 'google_places' 
    if (url.includes('tripadvisor')) return 'tripadvisor'
    if (url.includes('foursquare')) return 'foursquare'
    if (url.includes('yelp')) return 'yelp'
    
    // Fallback to generic
    return 'generic_places'
  }

  private async saveRawPlacesToDatabase(placesData: any[], connectionId: string): Promise<void> {
    try {
      const db = await getDb()
      const collection = db.collection(CollectionManager.getCollectionName('DATA'))
      
      const rawPlacesWithMetadata = placesData.map(place => ({
        type: 'places_raw' as const,
        connectionId,
        _connectionId: connectionId,
        _insertedAt: new Date().toISOString(),
        data: place,
        placesMetadata: {
          sourceApi: this.extractSourceApi(connectionId),
          normalized: false,
          raw: true
        }
      }))
      
      const result = await collection.insertMany(rawPlacesWithMetadata)
      console.log(`[v0] Saved ${result.insertedCount} raw places to ${CollectionManager.getCollectionName('DATA')} (type: places_raw)`)
      
    } catch (error) {
      console.error("[v0] Error saving raw places to database:", error)
      throw error
    }
  }
  
  private async saveNormalizedPlacesToDatabase(placesData: any[], connectionId: string): Promise<void> {
    try {
      const db = await getDb()
      const collection = db.collection(CollectionManager.getCollectionName('DATA'))
      
      const placesWithMetadata = placesData.map(place => ({
        type: 'places_standardized' as const,
        connectionId,
        _connectionId: connectionId,
        _insertedAt: new Date().toISOString(),
        data: place,
        placesMetadata: {
          sourceApi: this.extractSourceApi(connectionId),
          normalized: true,
          standardizationVersion: '1.0'
        }
      }))
      
      const result = await collection.insertMany(placesWithMetadata)
      console.log(`[v0] Saved ${result.insertedCount} normalized places to ${CollectionManager.getCollectionName('DATA')} (type: places_standardized)`)
      
    } catch (error) {
      console.error("[v0] Error saving normalized places to database:", error)
      throw error
    }
  }
  
  // Persist transformed records into MongoDB collection specified by tableName
  private async loadToDatabase(records: Record<string, any>[], connectionId: string, tableName?: string) {
    const db = await getDb()

    // Determine data type based on tableName or default
    const dataType = this.getDataType(tableName)

    // Create documents for the unified collection
    const docs = records.map((record) => ({
      _id: undefined, // Let MongoDB generate ObjectId
      type: dataType,
      connectionId,
      _connectionId: connectionId,
      _insertedAt: new Date().toISOString(),
      data: record
      // placesMetadata is only added for places_raw and places_standardized types
    }))

    const collection = db.collection(CollectionManager.getCollectionName('DATA'))
    const res = await collection.insertMany(docs)
    console.log(`[v0] Inserted ${res.insertedCount} documents into ${CollectionManager.getCollectionName('DATA')} (type: ${dataType})`)
  }

  private getDataType(tableName?: string): DataDocument['type'] {
    // Always return 'transformed_data' for regular API data transformation
    // Places data is handled separately with places_raw and places_standardized types
    return 'transformed_data'
  }

  private extractSourceApi(connectionId: string): string {
    // Extract source API from connection ID or return default
    if (connectionId.includes('rapidapi')) return 'rapidapi'
    if (connectionId.includes('google')) return 'google'
    return 'unknown'
  }
}
