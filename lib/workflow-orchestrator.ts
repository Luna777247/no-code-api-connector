// Workflow Orchestrator - Manages the full ETL pipeline
import { ApiExecutor, type ApiRequest } from "./api-executor"
import { ParameterGenerator, type Parameter } from "./parameter-generator"
import { DataTransformer, type FieldMapping } from "./data-transformer"
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
  options?: {
    maxRetries?: number
    retryDelay?: number
    batchSize?: number
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

  constructor() {
    this.executor = new ApiExecutor()
    this.paramGenerator = new ParameterGenerator()
    this.transformer = new DataTransformer()
  }

  async executeWorkflow(config: WorkflowConfig): Promise<WorkflowResult> {
    const runId = Math.random().toString(36).substr(2, 9)
    const startTime = Date.now()
    const errors: string[] = []

    console.log(`[v0] Starting workflow execution for connection: ${config.connectionId}`)
    console.log(`[v0] Run ID: ${runId}`)

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

      // Step 3: Execute API requests
      const results = await this.executor.executeBatch(requests)
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

      // Step 5: Validate data
      const validData = transformedData.filter((data) => this.transformer.validateSchema(data, config.fieldMappings))
      console.log(`[v0] Validated ${validData.length} records`)

      // Step 6: Load to database
      console.log(`[v0] Loading ${validData.length} records to database...`)
      if (validData.length > 0) {
        try {
          await this.loadToDatabase(validData, config.connectionId)
        } catch (err) {
          console.error("[v0] Error loading to database:", err)
          errors.push(err instanceof Error ? err.message : String(err))
        }
      }

      const duration = Date.now() - startTime
      const status = failedResults.length === 0 ? "success" : successfulResults.length > 0 ? "partial" : "failed"

      console.log(`[v0] Workflow completed in ${duration}ms with status: ${status}`)

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
