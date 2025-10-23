# Database Schema Consolidation

## Tổng quan

Hệ thống đã được tối ưu hóa để giảm số lượng collections từ ~10 xuống còn 3 collections chính, giúp dễ quản lý và bảo trì hơn.

## Cấu trúc mới

### 1. `api_data` - Collection tổng hợp cho dữ liệu
Thay thế: `api_runs`, `api_data_transformed`, `api_places_standardized`, `api_places`

**Cấu trúc document:**
```typescript
{
  _id: ObjectId,
  type: 'run' | 'transformed_data' | 'places_standardized' | 'places_raw',
  connectionId: string,
  runId?: string, // Chỉ có khi type = 'run'
  _connectionId: string, // Partition key
  _insertedAt: string,
  _updatedAt?: string,
  data: any, // Dữ liệu thực tế
  runMetadata?: { // Chỉ có khi type = 'run'
    status: 'success' | 'failed' | 'partial',
    totalRequests: number,
    successfulRequests: number,
    failedRequests: number,
    recordsExtracted: number,
    recordsLoaded: number,
    duration: number,
    errors: string[],
    startedAt: string,
    completedAt?: string
  },
  placesMetadata?: { // Chỉ có khi type chứa 'places'
    sourceApi: string,
    normalized: boolean,
    standardizationVersion?: string
  }
}
```

### 2. `api_uploads` - Collection cho file uploads
Thay thế: `api_file_uploads` + `api_data_raw`

**Cấu trúc document:**
```typescript
{
  _id: ObjectId,
  connectionId: string,
  fileName: string,
  fileType: 'csv' | 'json' | 'excel' | 'xml',
  fileSize: number,
  recordCount: number,
  uploadStatus: 'processing' | 'completed' | 'failed',
  errorMessage?: string,
  _insertedAt: string,
  rawData: any[], // Dữ liệu thô được embed trực tiếp
  schema?: {
    fields: Array<{
      name: string,
      type: string,
      nullable: boolean
    }>
  }
}
```

### 3. `api_metadata` - Collection cho metadata
Thay thế: `api_connections`, `api_audit_logs`, `api_data_lineage`

**Cấu trúc document:**
```typescript
{
  _id: ObjectId,
  type: 'connection' | 'audit_log' | 'data_lineage',
  _connectionId?: string,
  _insertedAt: string,
  _updatedAt?: string,

  // Connection data
  connectionData?: {
    name: string,
    apiConfig: { baseUrl: string, method: string, headers?: any, authType?: string, authConfig?: any },
    parameters: any[],
    fieldMappings: any[],
    tableName?: string,
    validationRules?: any[],
    options?: any
  },

  // Audit log data
  auditData?: {
    action: string,
    userId?: string,
    resourceId: string,
    resourceType: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  },

  // Data lineage data
  lineageData?: {
    sourceId: string,
    sourceType: string,
    targetId: string,
    targetType: string,
    transformationSteps: any[],
    createdAt: string
  }
}
```

## Cách sử dụng

### Query dữ liệu

```typescript
import { CollectionManager } from '@/lib/database-schema'

// Lấy runs của một connection
const runs = await db.collection(CollectionManager.getCollectionName('DATA'))
  .find(CollectionManager.getDataQuery('run', connectionId))
  .sort({ _insertedAt: -1 })
  .toArray()

// Lấy connections
const connections = await db.collection(CollectionManager.getCollectionName('METADATA'))
  .find(CollectionManager.getMetadataQuery('connection'))
  .toArray()

// Lấy uploads
const uploads = await db.collection(CollectionManager.getCollectionName('UPLOADS'))
  .find({ connectionId })
  .sort({ _insertedAt: -1 })
  .toArray()
```

### Thêm dữ liệu mới

```typescript
// Thêm connection
const connectionDoc = {
  type: 'connection',
  _connectionId: connectionId,
  _insertedAt: new Date().toISOString(),
  connectionData: { /* connection data */ }
}
await db.collection(CollectionManager.getCollectionName('METADATA')).insertOne(connectionDoc)

// Thêm run
const runDoc = {
  type: 'run',
  connectionId,
  runId,
  _connectionId: connectionId,
  _insertedAt: new Date().toISOString(),
  data: { /* run data */ },
  runMetadata: { /* run metadata */ }
}
await db.collection(CollectionManager.getCollectionName('DATA')).insertOne(runDoc)
```

## Migration

Để migrate dữ liệu cũ sang cấu trúc mới:

```bash
# Chạy migration script
npx ts-node scripts/migrate-to-consolidated-schema.ts

# Hoặc với npm script (nếu có)
npm run migrate:consolidate
```

**Lưu ý:**
- Script sẽ copy dữ liệu từ collections cũ sang collections mới
- Collections cũ sẽ được giữ nguyên để backup
- Sau khi verify dữ liệu mới chính xác, có thể xóa collections cũ

## Lợi ích

1. **Dễ quản lý**: Chỉ cần theo dõi 3 collections thay vì 10+
2. **Query hiệu quả**: Sử dụng type field để phân loại dữ liệu
3. **Scalable**: Dễ dàng thêm loại dữ liệu mới
4. **Maintainable**: Giảm complexity trong code
5. **Performance**: Partitioning theo connectionId

## Backward Compatibility

Hệ thống vẫn tương thích ngược thông qua API routes. Frontend không cần thay đổi gì.