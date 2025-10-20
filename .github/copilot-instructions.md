## AI Coding Agent Guide: no-code-api-connector

This repo is a Next.js 15 (App Router) ETL/data platform. It enables no-code API connections, field mappings, scheduling, and analytics. **MongoDB Atlas** is the main database. The frontend and backend are tightly coupled via REST APIs and direct DB queries.

## AI Coding Agent Guide — no-code-api-connector (concise)

This is a Next.js 15 (App Router) ETL/data platform. MongoDB Atlas is the canonical data store. Frontend and backend are co-located in the Next.js app using Route Handlers and Server/Client components.

### Key Architecture Patterns
- **ETL Pipeline**: `WorkflowOrchestrator` coordinates `ApiExecutor` → `ParameterGenerator` → `DataTransformer` → `PlacesNormalizer` → `DataValidator` → MongoDB
- **Data Flow**: API responses → JSONPath extraction (`$.field.nested`) → field mappings → unified `api_data` collection with type field
- **Service Boundaries**: `lib/` contains all business logic; `app/api/` handles HTTP; `app/` pages handle UI
- **Cross-component Communication**: Direct DB queries from API routes; client components fetch via `/api/*` endpoints
- **Database Schema**: Optimized to 3 unified collections with type-based partitioning and automated maintenance
- **Storage Optimization**: Automated backup, health monitoring, and retention policies

### Essential Files to Read First
- `lib/workflow-orchestrator.ts` (ETL orchestration with 6-stage pipeline + audit/caching)
- `lib/api-executor.ts`, `lib/data-transformer.ts`, `lib/data-validator.ts`, `lib/places-normalizer.ts`
- `lib/mongo.ts` (DB connection pattern - always call `getDb()`)
- `lib/database-schema.ts` (Unified collection structure with type field)
- `lib/audit-logger.ts`, `lib/data-lineage.ts`, `lib/redis-cache.ts` (Observability & performance)
- `lib/analytics-cache.ts` (Caching layer for analytics APIs with TTL management)
- `app/api/*/route.ts` (API route patterns with direct DB queries)
- `package.json` (Scripts and dependency management with `--legacy-peer-deps`)

### Developer Workflow Commands
- **Install**: `npm install --legacy-peer-deps` (peer dependency conflicts with React 19)
- **Dev Server**: `npm run dev` (starts on port 3000/3001)
- **Build**: `npm run build` (Next.js production build)
- **Tests**:
  - Unit: `npm run test:unit` (Jest with jsdom)
  - API: `npm run test:api` (Node environment, MongoDB Memory Server)
  - Integration: `npm run test:integration` (real DB operations)
  - E2E: `npm run test:e2e` (Playwright)
  - Coverage: `npm run test:coverage`
- **Storage Maintenance**:
  - Health Check: `npm run storage:health` (performance & quality metrics)
  - Backup: `npm run storage:backup` (automated in `backups/` directory)
  - Full Suite: `npm run storage:maintenance` (optimization + monitoring + backup + cleanup)
- **Linting**: `npm run lint` (Next.js ESLint)

### Project-Specific Conventions
- **Logging**: Always use `[v0]` prefix in console logs
- **Collections**: Unified `api_data` collection with `type` field (`'run' | 'transformed_data' | 'places_standardized' | 'places_raw'`)
- **Field Mapping**: JSONPath syntax for data extraction (`$.data.items[*].name`)
- **Error Handling**: Wrap DB calls in try/catch; return mock data on errors during dev
- **Hydration Safety**: Avoid `Date.now()`, `Math.random()` in Server Components
- **Client Components**: Use `'use client'` directive; fetch data via `useEffect` from `/api/*`
- **Database Access**: Always use `await getDb()` for MongoDB connections
- **Audit Logging**: Automatic audit trails for all connection executions (enabled by default)
- **Caching**: Analytics APIs use `getCachedAnalytics()` with TTL from `CacheTTL` enum
- **Mock Fallbacks**: Development mode returns mock data when external services fail
- **Data Transformation**: `DataTransformer` class handles JSONPath extraction and type conversion

### Common Patterns & Examples
```typescript
// API Route DB Pattern
const db = await getDb()
const data = await db.collection('api_data').find({ type: 'run' }).toArray()
// Always wrap in try/catch with mock fallback

// Client Component Data Fetching
useEffect(() => {
  fetch('/api/runs')
    .then(res => res.json())
    .then(data => setRuns(data.runs || []))
}, [])

// Field Mapping Transformation
const mappings = [
  { sourcePath: '$.user.id', targetField: 'user_id', dataType: 'string' },
  { sourcePath: '$.user.email', targetField: 'email', dataType: 'string' },
  { sourcePath: '$.data.items[*].name', targetField: 'item_names', dataType: 'string' } // Array extraction
]

// Data Transformation Usage
const transformer = new DataTransformer()
const transformedData = transformer.transform(apiResponse, mappings)
const isValid = transformer.validateSchema(transformedData, mappings)

// ETL Workflow Execution
const orchestrator = new WorkflowOrchestrator()
const result = await orchestrator.executeWorkflow({
  connectionId: 'conn123',
  apiConfig: { baseUrl: 'https://api.example.com', method: 'GET' },
  parameters: [...],
  fieldMappings: mappings
})

// Unified Collection Document Structure
const doc = {
  type: 'transformed_data',
  connectionId: 'conn123',
  _insertedAt: new Date().toISOString(),
  data: { /* transformed data */ }
}

// Analytics API with Caching
const analyticsData = await getCachedAnalytics(
  CacheKeys.RUNS_SUMMARY,
  async () => await fetchAnalyticsData(),
  { ttl: CacheTTL.FREQUENT } // 5 minutes cache
)
```

### Testing Infrastructure
- **Unit Tests**: Jest + jsdom for components and utilities
- **API Tests**: Separate Node environment config with in-memory MongoDB
- **Integration Tests**: Real MongoDB operations with cleanup
- **E2E Tests**: Playwright for full user workflows
- **Test DB**: Automatic setup/cleanup; collections isolated per test

### Advanced Architecture Insights

#### ETL Pipeline Deep Dive
The `WorkflowOrchestrator` implements a sophisticated 6-stage ETL pipeline:
1. **Parameter Generation**: `ParameterGenerator` creates combinations from list/Cartesian/template/dynamic modes
2. **API Execution**: `ApiExecutor` handles HTTP requests with retry logic and circuit breaker patterns
3. **Data Transformation**: `DataTransformer` applies JSONPath mappings (`$.field.nested`) to extract and type-convert data
4. **Places Normalization**: `PlacesNormalizer` standardizes location data from various APIs (Google Places, RapidAPI, etc.)
5. **Data Validation**: `DataValidator` ensures data quality with configurable rules
6. **Database Loading**: Direct MongoDB insertion with optional lineage tracking and audit logging

#### Database Schema Optimization
Migrated to 3 unified collections with type-based partitioning:
- `api_data`: All data with type field (`run`, `transformed_data`, `places_standardized`, `places_raw`)
- `api_uploads`: File upload metadata and raw data
- `api_metadata`: Configuration data (connections, mappings, schedules, audit logs, data lineage)

#### Analytics Caching System
- **Cache Keys**: Centralized in `CacheKeys` enum (`RUNS_SUMMARY`, `SYSTEM_STATUS`, etc.)
- **TTL Management**: `CacheTTL` enum (REAL_TIME: 60s, FREQUENT: 300s, STANDARD: 900s, SLOW_CHANGING: 3600s)
- **Fallback Strategy**: MockRedis for development, real Redis for production
- **Analytics Wrapper**: `getCachedAnalytics()` function handles cache/storage logic

### When to Ask for Human Help
- External credentials (MongoDB URI, RapidAPI keys) are missing
- Large schema changes or new API integrations
- Production deployment configurations
- Third-party service integrations
- Storage capacity planning or performance issues
- Backup recovery from production outages

### Gotchas & Common Fixes
- **Hydration Errors**: Move dynamic content to client components or guard with `typeof window !== 'undefined'`
- **Peer Dependencies**: Use `--legacy-peer-deps` for npm install (React 19 conflicts)
- **Port Conflicts**: Dev server may start on 3001 if 3000 is busy
- **MongoDB Connection**: Always call `getDb()` for database access; no connection pooling needed
- **JSONPath Mapping**: Always test mappings against real API responses
- **Unified Collections**: Use `type` field to partition data instead of separate collections
- **Static Chunk 404**: Run `npm run fix:chunks` if encountering static file issues
- **Environment Variables**: Ensure `MONGODB_URI` and `MONGODB_DB` are set for database operations
- **Cache Invalidation**: Analytics cache keys include query parameters for proper invalidation
- **Mock Data Pattern**: Return realistic mock data in development when external APIs fail
- **Data Lineage**: Track data flow from API → transformations → final storage