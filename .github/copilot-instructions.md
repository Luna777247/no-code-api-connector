## AI Coding Agent Guide: no-code-api-connector

This repo is a Next.js 15 (App Router) ETL/data platform. It enables no-code API connections, field mappings, scheduling, and analytics. **MongoDB Atlas** is the main database. The frontend and backend are tightly coupled via REST APIs and direct DB queries.

## AI Coding Agent Guide — no-code-api-connector (concise)

This is a Next.js 15 (App Router) ETL/data platform. MongoDB Atlas is the canonical data store. Frontend and backend are co-located in the Next.js app using Route Handlers and Server/Client components.

### Key Architecture Patterns
- **ETL Pipeline**: `WorkflowOrchestrator` coordinates `ApiExecutor` → `ParameterGenerator` → `DataTransformer` → `DataValidator` → MongoDB
- **Data Flow**: API responses → JSONPath extraction (`$.field.nested`) → field mappings → `api_*` collections
- **Service Boundaries**: `lib/` contains all business logic; `app/api/` handles HTTP; `app/` pages handle UI
- **Cross-component Communication**: Direct DB queries from API routes; client components fetch via `/api/*` endpoints

### Essential Files to Read First
- `lib/workflow-orchestrator.ts` (ETL orchestration)
- `lib/api-executor.ts`, `lib/data-transformer.ts`, `lib/data-validator.ts`
- `lib/mongo.ts` (DB connection pattern)
- `app/api/*/route.ts` (API route patterns)
- `test/api/setup.ts` (test database management)

### Developer Workflow Commands
- **Install**: `npm install --legacy-peer-deps` (peer dependency conflicts)
- **Dev Server**: `npm run dev` (starts on port 3000/3001)
- **Tests**:
  - Unit: `npm run test:unit` (Jest with jsdom)
  - API: `npm run test:api` (Node environment, MongoDB)
  - Integration: `npm run test:integration` (real DB operations)
  - E2E: `npm run test:e2e` (Playwright)
- **Quick Checks**: `node scripts/mongo-smoke.js`, `node scripts/test-all-apis.js`

### Project-Specific Conventions
- **Logging**: Always use `[v0]` prefix in console logs
- **Collections**: MongoDB collections prefixed with `api_` (e.g., `api_runs`, `api_connections`)
- **Field Mapping**: JSONPath syntax for data extraction (`$.data.items[*].name`)
- **Error Handling**: Wrap DB calls in try/catch; return mock data on errors during dev
- **Hydration Safety**: Avoid `Date.now()`, `Math.random()` in Server Components
- **Client Components**: Use `'use client'` directive; fetch data via `useEffect` from `/api/*`

### Common Patterns & Examples
```typescript
// API Route DB Pattern
const db = await getDb()
const data = await db.collection('api_runs').find().toArray()
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
  { sourcePath: '$.user.email', targetField: 'email', dataType: 'string' }
]

// ETL Workflow Execution
const orchestrator = new WorkflowOrchestrator()
const result = await orchestrator.executeWorkflow({
  connectionId: 'conn123',
  apiConfig: { baseUrl: 'https://api.example.com', method: 'GET' },
  parameters: [...],
  fieldMappings: mappings
})
```

### Testing Infrastructure
- **Unit Tests**: Jest + jsdom for components and utilities
- **API Tests**: Separate Node environment config with in-memory MongoDB
- **Integration Tests**: Real MongoDB operations with cleanup
- **E2E Tests**: Playwright for full user workflows
- **Test DB**: Automatic setup/cleanup; collections isolated per test

### When to Ask for Human Help
- External credentials (MongoDB URI, RapidAPI keys) are missing
- Large schema changes or new API integrations
- Production deployment configurations
- Third-party service integrations

### Gotchas & Common Fixes
- **Hydration Errors**: Move dynamic content to client components or guard with `typeof window !== 'undefined'`
- **Peer Dependencies**: Use `--legacy-peer-deps` for npm install
- **Port Conflicts**: Dev server may start on 3001 if 3000 is busy
- **MongoDB Connection**: Always call `getDb()` for database access
- **Test Isolation**: API tests use separate database with automatic cleanup
```tsx
