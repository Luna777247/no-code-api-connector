// Modified workflow orchestrator that can handle binary API responses
import { BinaryApiExecutor, type BinaryApiRequest, type BinaryExecutionResult } from "./binary-api-executor"
import { ParameterGenerator, type Parameter } from "./parameter-generator"
import { DataTransformer, type FieldMapping } from "./data-transformer"
import { getDb } from "./mongo"
import { CollectionManager } from "./database-schema"

export interface BinaryWorkflowConfig {
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
  isBinaryResponse?: boolean
}

export interface BinaryWorkflowResult {
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

export class BinaryWorkflowOrchestrator {
  private binaryExecutor: BinaryApiExecutor
  private paramGenerator: ParameterGenerator
  private transformer: DataTransformer

  constructor() {
    this.binaryExecutor = new BinaryApiExecutor()
    this.paramGenerator = new ParameterGenerator()
    this.transformer = new DataTransformer()
  }

  async executeBinaryWorkflow(config: BinaryWorkflowConfig): Promise<BinaryWorkflowResult> {
    const runId = Math.random().toString(36).substr(2, 9)
    const startTime = Date.now()
    const errors: string[] = []

    console.log(`[v0] Starting binary workflow execution for connection: ${config.connectionId}`)
    console.log(`[v0] Run ID: ${runId}`)

    try {
      // Step 1: Generate parameter combinations
      const paramCombinations = this.paramGenerator.generateCombinations(config.parameters)
      console.log(`[v0] Generated ${paramCombinations.length} parameter combinations`)

      // Step 2: Build API requests
      const requests: BinaryApiRequest[] = paramCombinations.map((paramCombo) => {
        // Convert parameter objects to flat key-value pairs
        const flatParams: Record<string, any> = {}

        // Handle different parameter formats
        if (Array.isArray(paramCombo)) {
          // Array format: [{name, value, ...}, ...]
          paramCombo.forEach((param: any) => {
            flatParams[param.name] = param.value
          })
        } else {
          // Object format: {paramName: paramValue, ...}
          Object.assign(flatParams, paramCombo)
        }

        return {
          url: this.buildUrl(config.apiConfig.baseUrl, flatParams),
          method: config.apiConfig.method,
          headers: this.buildHeaders(config.apiConfig),
          params: flatParams,
        }
      })

      // Step 3: Execute API requests
      const results: BinaryExecutionResult[] = await this.binaryExecutor.executeBatch(requests)
      const successfulResults = results.filter((r) => r.success)
      const failedResults = results.filter((r) => !r.success)

      // Collect errors
      failedResults.forEach((result) => {
        if (result.error) errors.push(result.error)
      })

      // Step 4: Handle binary data extraction
      const extractedData = successfulResults.map((result) => {
        if (result.isBinary && result.metadata) {
          // For binary responses, use the metadata as the data
          return {
            ...result.metadata,
            _apiParams: result.data?.params || {},
            _responseTime: result.responseTime
          }
        }
        // For JSON responses, return the data
        return result.data
      })

      console.log(`[v0] Extracted ${extractedData.length} binary records`)

      // Step 5: Transform data using field mappings (for binary data, use direct mapping)
      const transformedData = this.transformBinaryData(extractedData, config.fieldMappings)
      console.log(`[v0] Transformed ${transformedData.length} binary records`)

      // Step 6: Load to database
      console.log(`[v0] Loading ${transformedData.length} binary records to database...`)
      let recordsLoaded = 0
      if (transformedData.length > 0) {
        try {
          await this.loadBinaryDataToDatabase(transformedData, config.connectionId)
          recordsLoaded = transformedData.length
        } catch (dbError) {
          console.error("[v0] Error loading binary data to database:", dbError)
          // Don't fail the workflow for database errors
        }
      }

      const duration = Date.now() - startTime
      const status = failedResults.length === 0 ? "success" : successfulResults.length > 0 ? "partial" : "failed"

      console.log(`[v0] Binary workflow completed in ${duration}ms with status: ${status}`)

      // Step 7: Save run to api_data collection with type 'run'
      try {
        const db = await getDb()
        const runDocument = {
          type: 'run' as const,
          connectionId: config.connectionId,
          runId: runId,
          _insertedAt: new Date().toISOString(),
          data: {
            dataPreview: extractedData.slice(0, 3),
            transformedData: transformedData.slice(0, 5)
          },
          runMetadata: {
            status,
            totalRequests: requests.length,
            successfulRequests: successfulResults.length,
            failedRequests: failedResults.length,
            recordsExtracted: transformedData.length,
            recordsLoaded: recordsLoaded,
            duration,
            startedAt: new Date(startTime).toISOString(),
            completedAt: new Date().toISOString(),
            errors: errors.length > 0 ? errors : []
          }
        }
        await db.collection(CollectionManager.getCollectionName('DATA')).insertOne(runDocument)
        console.log(`[v0] Saved binary run ${runId} to api_data collection (type: run)`)
      } catch (dbError) {
        console.error("[v0] Error saving binary run to database:", dbError)
      }

      return {
        runId,
        status,
        totalRequests: requests.length,
        successfulRequests: successfulResults.length,
        failedRequests: failedResults.length,
        recordsExtracted: extractedData.length,
        recordsLoaded,
        duration,
        errors,
      }
    } catch (error) {
      console.error("[v0] Binary workflow execution failed:", error)
      const duration = Date.now() - startTime

      return {
        runId,
        status: "failed",
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 1,
        recordsExtracted: 0,
        recordsLoaded: 0,
        duration,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      }
    }
  }

  private buildUrl(baseUrl: string, params: Record<string, any>): string {
    return baseUrl // Parameters will be added by the executor
  }

  private buildHeaders(apiConfig: any): Record<string, string> {
    const headers: Record<string, string> = {}
    if (apiConfig.headers) {
      Object.assign(headers, apiConfig.headers)
    }
    return headers
  }

  private transformBinaryData(dataArray: any[], mappings: FieldMapping[]): Record<string, any>[] {
    console.log(`[v0] Transforming binary data with ${mappings.length} mappings`)
    return dataArray.map((data) => this.transformBinaryRecord(data, mappings))
  }

  private transformBinaryRecord(data: any, mappings: FieldMapping[]): Record<string, any> {
    const transformed: Record<string, any> = {}

    mappings.forEach((mapping) => {
      // For binary data, use direct property access
      let value = data[mapping.sourcePath]
      if (value === undefined) {
        value = data[mapping.targetField]
      }

      // Apply basic data type transformation
      if (mapping.dataType === "number") {
        value = Number(value)
      } else if (mapping.dataType === "boolean") {
        value = Boolean(value)
      } else {
        value = String(value)
      }

      transformed[mapping.targetField] = value
    })

    return transformed
  }

  private async loadBinaryDataToDatabase(records: Record<string, any>[], connectionId: string) {
    const db = await getDb()
    const coll = db.collection("api_data_transformed")

    const docs = records.map((r) => ({
      ...r,
      _connectionId: connectionId,
      _insertedAt: new Date(),
      _isBinaryData: true
    }))

    const res = await coll.insertMany(docs)
    console.log(`[v0] Inserted ${res.insertedCount} binary documents into api_data_transformed`)
  }
}