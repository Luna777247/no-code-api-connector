// Workflow Orchestrator - Manages the full ETL pipeline
import { ApiExecutor, type ApiRequest } from "./api-executor"
import { ParameterGenerator, type Parameter } from "./parameter-generator"
import { DataTransformer, type FieldMapping } from "./data-transformer"
import { PlacesNormalizer } from "./places-normalizer"
import { DataValidator, type ValidationRule } from "./data-validator"
import { LineageTracker, DataVersioning } from "./data-lineage"
import { AuditLogger } from "./audit-logger"
import { cacheManager } from "./redis-cache"
import { getDb } from "./mongo"

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
  validationRules?: ValidationRule[]
  options?: {
    maxRetries?: number
    retryDelay?: number
    batchSize?: number
    enableCaching?: boolean
    enableLineageTracking?: boolean
    enableVersioning?: boolean
    enableAuditLog?: boolean
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
      const paramCombinations = this.paramGenerator.generateCombinations(config.parameters)
      console.log(`[v0] Generated ${paramCombinations.length} parameter combinations`)

      // Step 2: Build API requests
      const requests: ApiRequest[] = paramCombinations.map((params) => ({
        url: this.buildUrl(config.apiConfig.baseUrl, params),
        method: config.apiConfig.method,
        headers: this.buildHeaders(config.apiConfig),
        params,
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
        return [result.data]
      })

      console.log(`[v0] Extracted ${extractedData.length} records`)

      const transformedData = this.transformer.transformBatch(extractedData, config.fieldMappings)
      console.log(`[v0] Transformed ${transformedData.length} records`)

      // Track transformation in lineage
      if (config.options?.enableLineageTracking !== false) {
        this.lineageTracker.trackTransformation(
          `transform_${runId}`,
          'field_mapping',
          [`mappings: ${config.fieldMappings.length}`, `records: ${transformedData.length}`]
        )
      }

      // Step 4.1: Places normalization (nếu là places data)
      let placesData: any[] = []
      if (this.isPlacesData(extractedData)) {
        console.log(`[v0] Detected places data, normalizing...`)
        const placesNormalizer = new PlacesNormalizer()
        const sourceApi = this.detectSourceApi(config.apiConfig.baseUrl)
        
        for (const result of successfulResults) {
          const normalized = placesNormalizer.normalizeToPlaces(result.data, sourceApi)
          placesData.push(...normalized)
        }
        
        console.log(`[v0] Normalized ${placesData.length} places`)
        
        // Save normalized places to separate collection
        if (placesData.length > 0) {
          await this.savePlacesToDatabase(placesData, config.connectionId)
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

      // Step 6: Load to database
      console.log(`[v0] Loading ${validData.length} records to database...`)
      if (validData.length > 0) {
        try {
          await this.loadToDatabase(validData, config.connectionId)
          
          // Track destination in lineage
          if (config.options?.enableLineageTracking !== false) {
            this.lineageTracker.trackDestination(
              `db_${config.connectionId}`,
              'api_data_transformed',
              'MongoDB',
              [`transform_${runId}`] // Input nodes array
            )
            
            // Complete lineage tracking
            await this.lineageTracker.completeTracking('completed', validData.length)
          }
          
          // Create data version if enabled
          if (config.options?.enableVersioning !== false) {
            const newVersion = await DataVersioning.createVersion(
              `dataset_${config.connectionId}`,
              config.connectionId,
              validData,
              [`Workflow execution ${runId}`, `Loaded ${validData.length} records`],
              undefined // TODO: Get userId from context
            )
            console.log(`[v0] Created data version: ${newVersion}`)
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

      const duration = Date.now() - startTime
      const status = failedResults.length === 0 ? "success" : successfulResults.length > 0 ? "partial" : "failed"

      console.log(`[v0] Workflow completed in ${duration}ms with status: ${status}`)

      // Step 7: Save run to api_runs collection for tracking
      try {
        const db = await getDb()
        await db.collection('api_runs').insertOne({
          _id: runId as any, // MongoDB accepts string as _id
          connectionId: config.connectionId,
          status,
          startedAt: new Date(startTime),
          completedAt: new Date(),
          executionTime: duration,
          recordsProcessed: validData.length,
          totalRequests: requests.length,
          successfulRequests: successfulResults.length,
          failedRequests: failedResults.length,
          dataPreview: extractedData.slice(0, 5), // Store first 5 raw records
          transformedData: validData.slice(0, 10), // Store first 10 transformed records
          errors: errors.length > 0 ? errors : undefined,
          metadata: {
            apiUrl: config.apiConfig.baseUrl,
            method: config.apiConfig.method,
            parameterCount: config.parameters.length,
            fieldMappingCount: config.fieldMappings.length
          }
        })
        console.log(`[v0] Saved run ${runId} to api_runs collection`)
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

  private async savePlacesToDatabase(placesData: any[], connectionId: string): Promise<void> {
    try {
      const db = await getDb()
      const collection = db.collection('api_places_standardized')
      
      const placesWithMetadata = placesData.map(place => ({
        ...place,
        connectionId,
        _insertedAt: new Date(),
        _source: {
          connection_id: connectionId,
          normalized_at: new Date()
        }
      }))
      
      const result = await collection.insertMany(placesWithMetadata)
      console.log(`[v0] Saved ${result.insertedCount} normalized places to database`)
      
    } catch (error) {
      console.error("[v0] Error saving places to database:", error)
      throw error
    }
  }
  
  // Persist transformed records into MongoDB collection `api_data_transformed`
  private async loadToDatabase(records: Record<string, any>[], connectionId: string) {
    const db = await getDb()
    const coll = db.collection("api_data_transformed")

    // add metadata to each record
    const docs = records.map((r) => ({
      ...r,
      _connectionId: connectionId,
      _insertedAt: new Date(),
    }))

    const res = await coll.insertMany(docs)
    console.log(`[v0] Inserted ${res.insertedCount} documents into api_data_transformed`)
  }
}
