// Workflow Orchestrator - Manages the full ETL pipeline
import { ApiExecutor, type ApiRequest } from "./api-executor"
import { ParameterGenerator, type Parameter } from "./parameter-generator"
import { DataTransformer, type FieldMapping } from "./data-transformer"
import { PlacesNormalizer } from "./places-normalizer"
import { DataValidator, type ValidationRule } from "./data-validator"
import { LineageTracker } from "./data-lineage" // Removed DataVersioning import
import { AuditLogger } from "./audit-logger"
import { cacheManager } from "./cache-manager"
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
  tableName?: string
  validationRules?: ValidationRule[]
  expectBinary?: boolean
  options?: {
    maxRetries?: number
    retryDelay?: number
    batchSize?: number
    enableCaching?: boolean
    enableLineageTracking?: boolean
    enablePlacesNormalization?: boolean
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
    const requestDetails: Array<{
      url: string
      method: string
      statusCode?: number
      responseTime: number
      success: boolean
      error?: string
      recordsReturned?: number
    }> = []

    // Start lineage tracking if enabled
    if (config.options?.enableLineageTracking !== false) {
      this.lineageTracker.startTracking(runId, config.connectionId)
      this.lineageTracker.trackSource(`api_${config.connectionId}`, config.apiConfig.baseUrl, "API", {
        method: config.apiConfig.method,
        authType: config.apiConfig.authType,
      })
    }

    // Log audit event for workflow execution
    if (config.options?.enableAuditLog !== false) {
      await AuditLogger.logConnectionEvent("executed", config.connectionId, config.apiConfig.baseUrl, undefined, {
        runId,
        parameters: config.parameters.length,
      })
    }

    try {
      // Step 1: Generate parameter combinations
      let processedParameters: Parameter[] = []

      if (Array.isArray(config.parameters)) {
        if (
          config.parameters.length > 0 &&
          typeof config.parameters[0] === "object" &&
          "name" in config.parameters[0] &&
          "value" in config.parameters[0]
        ) {
          processedParameters = config.parameters.map((paramObj: any) => ({
            name: paramObj.name,
            type: "query" as const,
            mode: "list" as const,
            values: [paramObj.value],
          }))
        } else {
          processedParameters = config.parameters
        }
      } else if (typeof config.parameters === "object" && config.parameters !== null) {
        processedParameters = Object.entries(config.parameters).map(([key, value]) => ({
          name: key,
          type: "query" as const,
          mode: "list" as const,
          values: [value as string],
        }))
      }

      const paramCombinations = this.paramGenerator.generateCombinations(processedParameters)

      // Step 2: Build API requests
      const requests: ApiRequest[] = paramCombinations.map((params) => ({
        url: this.buildUrl(config.apiConfig.baseUrl, params),
        method: config.apiConfig.method,
        headers: this.buildHeaders(config.apiConfig),
        expectBinary: config.expectBinary,
      }))

      // Step 3: Execute API requests with caching
      let results: any[]

      if (config.options?.enableCaching !== false && config.apiConfig.method === "GET" && !config.expectBinary) {
        const cacheKey = `api:${config.connectionId}:${JSON.stringify(requests)}`
        const cached = await cacheManager.get(cacheKey)

        if (cached) {
          results = cached
        } else {
          results = await this.executor.executeBatch(requests)

          const successfulResults = results.filter((r) => r.success)
          if (successfulResults.length > 0) {
            await cacheManager.set(cacheKey, results, 300)
          }
        }
      } else {
        results = await this.executor.executeBatch(requests)
      }

      results.forEach((result, index) => {
        requestDetails.push({
          url: requests[index]?.url || "unknown",
          method: requests[index]?.method || "GET",
          statusCode: result.statusCode,
          responseTime: result.responseTime || 0,
          success: result.success,
          error: result.error,
          recordsReturned: Array.isArray(result.data) ? result.data.length : 1,
        })
      })

      const successfulResults = results.filter((r) => r.success)
      const failedResults = results.filter((r) => !r.success)

      failedResults.forEach((result) => {
        if (result.error) errors.push(result.error)
      })

      // Step 4: Extract and transform data
      const extractedData = successfulResults.flatMap((result) => {
        if (result.isBinary && result.metadata) {
          return [{ ...result.metadata, _responseTime: result.responseTime }]
        }

        if (Array.isArray(result.data)) {
          return result.data
        }
        if (result.data && typeof result.data === "object") {
          if (Array.isArray(result.data.results)) {
            return result.data.results
          }
          if (Array.isArray(result.data.data)) {
            return result.data.data
          }
          if (Array.isArray(result.data.items)) {
            return result.data.items
          }
        }
        return [result.data]
      })

      const transformedData = this.transformer.transformBatch(extractedData, config.fieldMappings)

      // Track transformation in lineage
      if (config.options?.enableLineageTracking !== false) {
        this.lineageTracker.trackTransformation(`transform_${runId}`, "field_mapping", [
          `mappings: ${config.fieldMappings.length}`,
          `records: ${transformedData.length}`,
        ])
      }

      // Step 4.1: Save raw data if it's places data
      if (!config.expectBinary && this.isPlacesData(extractedData)) {
        await this.saveRawPlacesToDatabase(extractedData, config.connectionId)
      }

      // Step 4.2: Places normalization
      const placesData: any[] = []
      if (
        !config.expectBinary &&
        this.isPlacesData(extractedData) &&
        config.options?.enablePlacesNormalization !== false
      ) {
        const placesNormalizer = new PlacesNormalizer()
        const sourceApi = this.extractSourceApi(config.connectionId || "unknown")

        for (const result of successfulResults) {
          const normalized = placesNormalizer.normalizeToPlaces(result.data, sourceApi)
          placesData.push(...normalized)
        }

        if (placesData.length > 0) {
          await this.saveNormalizedPlacesToDatabase(placesData, config.connectionId)
        }
      }

      // Step 5: Validate data
      let validData: any[]

      if (config.validationRules && config.validationRules.length > 0) {
        const validator = new DataValidator(config.validationRules)
        const validationResult = await validator.validate(transformedData)

        if (validationResult.errors.length > 0) {
          errors.push(
            ...validationResult.errors.slice(0, 10).map((e) => `Row ${e.recordIndex}: ${e.field} - ${e.message}`),
          )
        }

        const invalidIndices = new Set(
          validationResult.errors.map((e) => e.recordIndex).filter((idx): idx is number => idx !== undefined),
        )
        validData = transformedData.filter((_: any, i: number) => !invalidIndices.has(i))
      } else {
        validData = transformedData.filter((data) => this.transformer.validateSchema(data, config.fieldMappings))
      }

      // Step 6: Load to database
      const isPlacesData = !config.expectBinary && this.isPlacesData(extractedData)

      if (!isPlacesData) {
        if (validData.length > 0) {
          try {
            await this.loadToDatabase(validData, config.connectionId, config.tableName)

            if (config.options?.enableLineageTracking !== false) {
              this.lineageTracker.trackDestination(
                `db_${config.connectionId}`,
                config.tableName || "api_data",
                "MongoDB",
                [`transform_${runId}`],
              )

              await this.lineageTracker.completeTracking("completed", validData.length)
            }

            if (config.options?.enableAuditLog !== false) {
              await AuditLogger.logDataAccess("accessed", config.connectionId, undefined, {
                runId,
                recordCount: validData.length,
                action: "loaded",
              })
            }
          } catch (err) {
            errors.push(err instanceof Error ? err.message : String(err))

            if (config.options?.enableLineageTracking !== false) {
              await this.lineageTracker.completeTracking("failed")
            }

            if (config.options?.enableAuditLog !== false) {
              await AuditLogger.logError(
                "error.occurred",
                "Load data to database",
                "connection",
                config.connectionId,
                err instanceof Error ? err.message : String(err),
                undefined,
                { runId },
              )
            }
          }
        }
      } else {
        if (config.options?.enableLineageTracking !== false) {
          await this.lineageTracker.completeTracking("completed", placesData.length)
        }
      }

      const duration = Date.now() - startTime
      const status = failedResults.length === 0 ? "success" : successfulResults.length > 0 ? "partial" : "failed"

      // Step 7: Save run to database
      try {
        const db = await getDb()
        const recordsLoaded = isPlacesData ? placesData.length : validData.length

        const runDocument = {
          type: "run" as const,
          connectionId: config.connectionId,
          runId: runId,
          scheduleId: (config as any).scheduleId,
          _connectionId: config.connectionId,
          _insertedAt: new Date().toISOString(),
          data: {
            dataPreview: extractedData.slice(0, 5),
            transformedData: isPlacesData ? [] : validData.slice(0, 10),
          },
          runMetadata: {
            status: status as "success" | "failed" | "partial",
            totalRequests: requests.length,
            successfulRequests: successfulResults.length,
            failedRequests: failedResults.length,
            recordsExtracted: extractedData.length,
            recordsLoaded: recordsLoaded,
            dataType: isPlacesData ? "places" : config.expectBinary ? "binary" : "transformed",
            duration,
            errors: errors.length > 0 ? errors : [],
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            requestDetails: requestDetails,
            dataSize: JSON.stringify(validData).length,
            compressionRatio: 1.0,
          },
        }

        await db.collection(CollectionManager.getCollectionName("DATA")).insertOne(runDocument)
      } catch (dbError) {
        // Silently fail
      }

      if (config.options?.enableAuditLog !== false) {
        await AuditLogger.logConnectionEvent(
          status === "failed" ? "deleted" : "executed",
          config.connectionId,
          config.apiConfig.baseUrl,
          undefined,
          {
            runId,
            status,
            duration,
            recordsExtracted: extractedData.length,
            recordsLoaded: validData.length,
            errors: errors.length,
          },
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
      const duration = Date.now() - startTime

      if (config.options?.enableAuditLog !== false) {
        await AuditLogger.logError(
          "error.occurred",
          "Execute workflow",
          "connection",
          config.connectionId,
          error instanceof Error ? error.message : "Unknown error",
          undefined,
          { runId, duration },
        )
      }

      if (config.options?.enableLineageTracking !== false) {
        await this.lineageTracker.completeTracking("failed")
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
    if (!firstItem || typeof firstItem !== "object") return false

    // Check for common places fields
    const placesFields = ["name", "address", "latitude", "longitude", "location", "place_id", "business_name"]
    const hasPlacesFields = placesFields.some(
      (field) =>
        field in firstItem ||
        (firstItem.location && typeof firstItem.location === "object") ||
        (firstItem.geometry && typeof firstItem.geometry === "object"),
    )

    return hasPlacesFields
  }

  private detectSourceApi(baseUrl: string): string {
    const url = baseUrl.toLowerCase()

    if (url.includes("rapidapi")) return "rapidapi_places"
    if (url.includes("google") || url.includes("maps")) return "google_places"
    if (url.includes("tripadvisor")) return "tripadvisor"
    if (url.includes("foursquare")) return "foursquare"
    if (url.includes("yelp")) return "yelp"

    // Fallback to generic
    return "generic_places"
  }

  private async saveRawPlacesToDatabase(placesData: any[], connectionId: string): Promise<void> {
    try {
      const db = await getDb()
      const collection = db.collection(CollectionManager.getCollectionName("DATA"))

      const rawPlacesWithMetadata = placesData.map((place) => ({
        type: "places_raw" as const,
        connectionId,
        _connectionId: connectionId,
        _insertedAt: new Date().toISOString(),
        data: place,
        placesMetadata: {
          sourceApi: this.extractSourceApi(connectionId),
          normalized: false,
          raw: true,
        },
      }))

      const result = await collection.insertMany(rawPlacesWithMetadata)
      console.log(
        `[v0] Saved ${result.insertedCount} raw places to ${CollectionManager.getCollectionName("DATA")} (type: places_raw)`,
      )
    } catch (error) {
      console.error("[v0] Error saving raw places to database:", error)
      throw error
    }
  }

  private async saveNormalizedPlacesToDatabase(placesData: any[], connectionId: string): Promise<void> {
    try {
      const db = await getDb()
      const collection = db.collection(CollectionManager.getCollectionName("DATA"))

      const placesWithMetadata = placesData.map((place) => ({
        type: "places_standardized" as const,
        connectionId,
        _connectionId: connectionId,
        _insertedAt: new Date().toISOString(),
        data: place,
        placesMetadata: {
          sourceApi: this.extractSourceApi(connectionId),
          normalized: true,
          standardizationVersion: "1.0",
        },
      }))

      const result = await collection.insertMany(placesWithMetadata)
      console.log(
        `[v0] Saved ${result.insertedCount} normalized places to ${CollectionManager.getCollectionName("DATA")} (type: places_standardized)`,
      )
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
      data: record,
      // placesMetadata is only added for places_raw and places_standardized types
    }))

    const collection = db.collection(CollectionManager.getCollectionName("DATA"))
    const res = await collection.insertMany(docs)
    console.log(
      `[v0] Inserted ${res.insertedCount} documents into ${CollectionManager.getCollectionName("DATA")} (type: ${dataType})`,
    )
  }

  private getDataType(tableName?: string): DataDocument["type"] {
    // Always return 'transformed_data' for regular API data transformation
    // Places data is handled separately with places_raw and places_standardized types
    return "transformed_data"
  }

  private extractSourceApi(connectionId: string): string {
    // Extract source API from connection ID or return default
    if (connectionId.includes("rapidapi")) return "rapidapi"
    if (connectionId.includes("google")) return "google"
    return "unknown"
  }
}
