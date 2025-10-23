// Database Schema - Optimized Collection Structure
// Giảm số lượng collection từ ~10 xuống ~3 collections chính

export interface BaseDocument {
  _id?: string
  _insertedAt: string
  _updatedAt?: string
  _connectionId?: string // Partition key cho multi-tenant
}

// ===== COLLECTION TỔNG HỢP: api_data =====
// Thay thế: api_runs, api_data_transformed, api_places_standardized, api_places
export interface DataDocument extends BaseDocument {
  type: 'run' | 'transformed_data' | 'places_standardized' | 'places_raw'

  // Metadata chung
  connectionId: string
  runId?: string // Chỉ có khi type = 'run'

  // Data payload
  data: any

  // Type-specific fields
  runMetadata?: {
    status: 'success' | 'failed' | 'partial'
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    recordsExtracted: number
    recordsLoaded: number
    duration: number
    errors: string[]
    startedAt: string
    completedAt?: string
  }

  placesMetadata?: {
    sourceApi: string
    normalized: boolean
    standardizationVersion?: string
  }
}

// ===== COLLECTION: api_uploads =====
// Thay thế: api_file_uploads + api_data_raw
export interface UploadDocument extends BaseDocument {
  connectionId: string
  fileName: string
  fileType: 'csv' | 'json' | 'excel' | 'xml'
  fileSize: number
  recordCount: number
  uploadStatus: 'processing' | 'completed' | 'failed'
  errorMessage?: string

  // Embedded raw data thay vì collection riêng
  rawData: any[]

  // Processing metadata
  processedAt?: string
  schema?: {
    fields: Array<{
      name: string
      type: string
      nullable: boolean
    }>
  }
}

// ===== COLLECTION: api_metadata =====
// Thay thế: api_connections, api_audit_logs, api_data_lineage
export interface MetadataDocument extends BaseDocument {
  type: 'connection' | 'audit_log' | 'data_lineage'

  // Connection data
  connectionData?: {
    name: string
    apiConfig: {
      baseUrl: string
      method: string
      headers?: Record<string, string>
      authType?: string
      authConfig?: any
    }
    parameters: any[]
    fieldMappings: any[]
    tableName?: string
    validationRules?: any[]
    options?: any
  }

  // Audit log data
  auditData?: {
    action: string
    userId?: string
    resourceId: string
    resourceType: string
    details?: any
    ipAddress?: string
    userAgent?: string
  }

  // Data lineage data
  lineageData?: {
    sourceId: string
    sourceType: string
    targetId: string
    targetType: string
    transformationSteps: any[]
    createdAt: string
  }
}

// ===== UTILITY FUNCTIONS =====

export class CollectionManager {
  private static readonly COLLECTIONS = {
    DATA: 'api_data',
    UPLOADS: 'api_uploads',
    METADATA: 'api_metadata'
  } as const

  static getCollectionName(type: keyof typeof CollectionManager.COLLECTIONS): string {
    return CollectionManager.COLLECTIONS[type]
  }

  // Helper methods cho query
  static getDataQuery(type: DataDocument['type'], connectionId?: string, runId?: string) {
    const query: any = { type }
    if (connectionId) query.connectionId = connectionId
    if (runId) query.runId = runId
    return query
  }

  static getMetadataQuery(type: MetadataDocument['type'], connectionId?: string) {
    const query: any = { type }
    if (connectionId) query._connectionId = connectionId
    return query
  }
}