## Quick orientation for AI coding agents

This repository is a Next.js 15 (App Router) application implementing a no-code API connector / ETL platform. Configure API endpoints, parameters, field mappings, and scheduling without writing code.

**Architecture Overview:**
- **Frontend**: Next.js 15 App Router + React Server Components + shadcn/ui + Tailwind CSS v4
- **Backend**: Next.js Route Handlers with MongoDB Atlas for persistence
- **Core Engine**: `lib/` contains ETL pipeline logic (executor, transformer, orchestrator, parameter generator)
- **Database**: MongoDB with collections: `api_connections`, `api_runs`, `api_schedules`, `api_field_mappings`, `api_data_transformed`

**Key Files to Understand:**
- `lib/workflow-orchestrator.ts` — Full ETL pipeline orchestration (extract → transform → validate → load)
- `lib/api-executor.ts` — HTTP client with retry logic, supports GET/POST/PUT/DELETE, multiple auth types
- `lib/parameter-generator.ts` — Generates API parameter combinations (list, cartesian, template, dynamic modes)
- `lib/data-transformer.ts` — JSONPath-based field mapping with data type conversion
- `lib/mongo.ts` — Singleton MongoDB connection via `getDb()`
- `app/api/*/route.ts` — Route handlers follow MongoDB patterns (see `connections/[id]/route.ts` for CRUD example)

**Project-Specific Conventions:**
- **Next.js 15 Async Params**: All dynamic routes use `{ params: Promise<{ id: string }> }` and await before accessing `params.id`
- **Logging**: All console logs use `[v0]` prefix for consistency
- **Database**: MongoDB Atlas with connection string in `MONGODB_URI` env var (default db: `smart_travel_v2`)
- **Collections Naming**: All collections use `api_*` prefix pattern
- **Field Mappings**: Use JSONPath syntax (`$.field.nested`, `$.array[*].item`) for data extraction
- **Error Handling**: Return fallback mock data on DB errors for development resilience
- **TypeScript**: Lightweight interfaces per file; match actual API response structures (e.g., `connectionId` not `id`)
- **Component Patterns**: Client components use `'use client'` directive, handle async data fetching in `useEffect`

**Common Developer Workflows:**
```bash
# Development
npm install --legacy-peer-deps  # Note: vaul peer dependency conflict with React 19
npm run dev                     # Start at http://localhost:3000
npm run build                   # Production build
npm run lint                    # ESLint check

# Testing & Validation
node scripts/mongo-smoke.js           # Test MongoDB connection
node scripts/run-orchestrator-test.js # Test full ETL pipeline
node scripts/rapidapi-test.py         # Test RapidAPI integrations

# Environment Setup
# Create .env.local with:
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
MONGODB_DB=smart_travel_v2  # Optional, defaults to smart_travel_v2
```

**Known Issues:**
- **Peer Dependencies**: Use `--legacy-peer-deps` for npm install (vaul requires React ^16-18, project uses React 19)
- **Hydration Warning**: Body element has `suppressHydrationWarning={true}` to prevent browser extension interference
- **Mock Routes**: `app/api/connections/route.ts` GET still returns mock data; individual routes use MongoDB

**Integration Points & External Dependencies:**
- **MongoDB Atlas**: Singleton connection via `lib/mongo.ts`. Use `await getDb()` for database instance. Collections auto-create on first write.
  ```typescript
  const db = await getDb()
  const collection = db.collection('api_connections')
  ```
- **API Executor**: `lib/api-executor.ts` handles all outbound HTTP with retry logic (max 4 attempts), supports all HTTP methods, bearer/API key/basic auth
- **ETL Pipeline**: `WorkflowOrchestrator.executeWorkflow(config)` runs full extract-transform-load with these steps:
  1. Generate parameter combinations via `ParameterGenerator`
  2. Execute API calls with `ApiExecutor` (includes retry logic)
  3. Transform data with `DataTransformer` using JSONPath field mappings
  4. Validate and load to `api_data_transformed` collection
- **Analytics APIs**: `/api/analytics/connections`, `/api/analytics/runs`, `/api/analytics/schedules` provide aggregation pipeline queries for dashboards
- **Tested External APIs**: JSONPlaceholder (users/posts), RapidAPI endpoints, includes field mapping examples for nested objects and arrays

**Editing Guidelines & Safe Defaults:**
- **Backwards-compatible changes**: Add helpers in `lib/` and wire into route handlers. Maintain `[v0]` logging and stable JSON shapes
- **Database operations**: Always wrap MongoDB calls in try/catch. Return fallback mock data on errors for dev resilience
- **Field mappings**: Use JSONPath (`$.field.nested`, `$.array[*].item`) with type conversion (string/number/boolean/date)
- **Error handling**: Return JSON errors with proper status codes. Log details with `[v0]` prefix
- **Collection naming**: Core collections use `api_*` prefix, transformed data uses `*_transformed` suffix
- **TypeScript interfaces**: Match actual API responses - use `connectionId` not `id`, include optional fields with `?`

Examples (copyable patterns from repo)
- **Execute workflow** (body shape expected by `POST /api/execute-run`):

  ```json
  {
    "connectionId": "abc",
    "apiConfig": { "baseUrl": "https://...", "method": "GET", "headers": {} },
    "parameters": [ { "name": "id", "mode": "list", "values": ["1","2"] } ],
    "fieldMappings": [ { "sourcePath": "$.id", "targetField": "user_id", "dataType": "string" } ]
  }
  ```

- **MongoDB operations**: `const db = await getDb(); const collection = db.collection('api_connections')`
- **Field mapping example**: `{ "sourcePath": "$.address.city", "targetField": "city", "dataType": "string", "defaultValue": "Unknown" }`
- **Array field mapping**: `{ "sourcePath": "$.data[*].id", "targetField": "item_ids", "dataType": "number" }`
- **Analytics aggregation**: Use MongoDB pipelines (see `/api/analytics/*` routes)
- **Template substitution**: `ParameterGenerator.applyTemplate(template, vars)` for dynamic params
- **Run ETL workflow**: `new WorkflowOrchestrator().executeWorkflow(config)` for full pipeline execution

What not to change without sign-off
- Do not change the major route shapes (`/api/*`) or the public API contract in `README.md` without a matching migration note and tests.
- Avoid replacing the `[v0]` prefixed logging scheme or switching to a different logging framework without updating all files.

Where to leave TODOs
- Keep `TODO:` comments when you stub DB or external integrations, and add a short note describing the expected contract (inputs/outputs) and a reference to `scripts/*.sql` if schema changes are relevant.

If you need clarification
- Ask the repo owner about intended persistence options (Postgres via Supabase/Neon or in-memory for demos) and preferred scheduler (Vercel Cron vs external queue) before implementing those integrations.

End of file.
