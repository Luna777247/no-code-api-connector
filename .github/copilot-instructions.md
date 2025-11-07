# AI Coding Agent Instructions - No-Code API Connector

## Project Overview
This is a **no-code API connector platform** with a microservices architecture:
- **Backend**: PHP 8.3 REST API (port 8000) with MongoDB Atlas
- **Frontend**: Next.js 15 with TypeScript (port 3000)
- **Scheduling**: Apache Airflow 2.9 (port 8080) for automated API execution
- **Database**: MongoDB Atlas (cloud) + PostgreSQL (Airflow metadata) + Redis (cache)
- **Deployment**: Docker Compose with multi-container orchestration

## Architecture Patterns

### Backend (PHP) - Controller → Service → Repository Pattern
**File Structure**: `app/Controllers/` → `app/Services/` → `app/Repositories/`

**Controller Pattern** (see `ConnectionController.php`):
```php
public function create(): array {
    $input = ValidationHelper::getJsonInput();
    $input = ValidationHelper::sanitizeInput($input);
    ValidationHelper::validateRequest($this->validator, $input);
    
    $saved = $this->service->create($input);
    if (!$saved) {
        http_response_code(400);
        return ['error' => 'Failed to create connection'];
    }
    return $saved; // Auto-converted to JSON
}
```

**Dashboard Analytics Pattern** (see `SmartTravelDashboardService.php`):
```php
public function getCityRanking(): array {
    $pipeline = [
        ['$group' => ['_id' => '$city', 'count' => ['$sum' => 1], 'avgRating' => ['$avg' => '$rating']]],
        ['$sort' => ['avgRating' => -1]],
        ['$limit' => 20]
    ];
    $result = $this->placesCollection->aggregate($pipeline);
    // Transform and return structured data
}
```

**Key Conventions**:
- **JSON Keys**: Always `camelCase` (e.g., `connectionId`, `cronExpression`)
- **HTTP Status**: Set explicitly with `http_response_code()` in controllers
- **Validation**: Use `ValidationHelper::validateRequest()` in controllers
- **Error Handling**: Return associative arrays; framework auto-converts to JSON
- **MongoDB IDs**: Use string IDs (e.g., `"690d27fffe8324710b06bf25"`)
- **Aggregation Pipelines**: Use MongoDB aggregation for complex analytics (group, sort, limit, unwind)

### Database Collections (MongoDB Atlas)
- `api_connections`: API connection configurations
- `api_schedules`: Schedule definitions with cron expressions
- `api_runs`: Execution history and results
- `parameter_modes`: Dynamic parameter configurations
- `smart_travel.places`: Google Places API data (4,972+ documents with ratings, categories, locations)

### Airflow Integration
**DAG Generation**: Schedules create dynamic DAGs in `dags/api_execution_dag.py`
- DAG ID: `api_execute_{schedule_id}`
- Tasks: `before_execute` → `create_run_record` → `execute_api_call` → `update_run_record`

**Schedule Creation Flow**:
1. POST to `/api/schedules` → Creates MongoDB record
2. Triggers Airflow DAG sync via `AirflowService`
3. DAG executes API calls based on cron expressions

## Development Workflow

### Setup (Windows/PowerShell)
```powershell
.\setup.ps1  # Starts all Docker services
.\start-dev.ps1  # Development mode
```

### Testing
```powershell
cd backendphp
.\test-api.ps1  # Comprehensive API test suite (12 tests)
```

**Test Coverage**: Health checks, CRUD operations, schedule creation, run execution, system diagnostics

### Building & Running
```bash
# Backend (PHP)
docker-compose up -d backend

# Frontend (Next.js)
cd frontendphp
npm run dev  # Port 3000

# Full stack
docker-compose up -d  # All services
```

### Key Endpoints
- **Health**: `GET /api/admin/health`
- **Connections**: `GET|POST /api/connections`
- **Schedules**: `GET|POST /api/schedules` (triggers Airflow sync)
- **Runs**: `GET|POST /api/runs` (manual execution)
- **Analytics**: `GET /api/analytics/*`
- **Smart Travel Dashboard**:
  - `GET /api/smart-travel/dashboard/overview`
  - `GET /api/smart-travel/dashboard/city-ranking` (new)
  - `GET /api/smart-travel/dashboard/city-category-matrix` (new)

## Frontend Patterns (Next.js + TypeScript)

### API Client (`services/apiClient.js`)
```javascript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const apiClient = {
  // 120s timeout for large datasets (increased from 30s)
  timeout: 120000,
  
  // 5-minute response caching for dashboard APIs
  // Automatic cache invalidation and error recovery
  async get(endpoint) {
    const response = await axios.get(`${API_BASE}${endpoint}`);
    return response.data;
  },
  // POST, PUT, DELETE methods...
};
```

### Dashboard Performance Patterns (`smart-travel-dashboard.jsx`)
```javascript
// Parallel API fetching in optimized groups
const group1 = Promise.all([
  fetchWithTimeout('/api/smart-travel/dashboard/overview'),
  fetchWithTimeout('/api/smart-travel/dashboard/city-ranking'), // New endpoint
]);

const group2 = Promise.all([
  fetchWithTimeout('/api/smart-travel/dashboard/city-category-matrix'), // New endpoint
  fetchWithTimeout('/api/smart-travel/dashboard/map-data', 20000), // Heavy data
]);

// Memoized chart components to prevent re-renders
const ChartCard = memo(({ title, description, children, loading }) => (
  // Optimized rendering with loading states
));
```

### Component Structure
- Uses `shadcn/ui` components with Radix UI primitives
- Tailwind CSS for styling
- TypeScript for type safety
- Client components in `components/client-*.jsx`

## Critical Integration Points

### Cross-Service Communication
- **Frontend ↔ Backend**: HTTP REST API calls
- **Backend ↔ Airflow**: HTTP triggers + DAG file generation
- **Backend ↔ MongoDB**: Direct MongoDB driver (Atlas cloud)
- **Airflow ↔ MongoDB**: Python MongoDB client in DAGs

### Dashboard Data Flow
- **Smart Travel Dashboard**: Frontend fetches from 8+ endpoints with parallel loading
- **Caching Layer**: 5-minute TTL cache in apiClient for dashboard APIs
- **Performance Optimization**: Parallel API groups (critical → secondary → heavy data)
- **Error Recovery**: Automatic fallback and detailed error logging

### Environment Variables
```env
# Backend
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
MONGODB_DATABASE=dataplatform_db

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Airflow
AIRFLOW__DATABASE__SQL_ALCHEMY_CONN=postgresql://airflow:airflow@postgres:5432/airflow
```

## Common Patterns & Gotchas

### Timeout Errors (Frontend → Backend)
**Symptom**: "timeout of 30000ms exceeded"
```
❌ Problem: Default axios timeout too short for large datasets
✅ Solution: Timeout set to 120s in apiClient.js
```

**Debugging steps**:
```powershell
# 1. Check backend status
Invoke-WebRequest -Uri "http://localhost:8000/api/admin/health"

# 2. Restart backend if needed
docker-compose restart backend

# 3. Check backend logs for slow queries
docker-compose logs backend --tail=50

# 4. Monitor MongoDB performance
docker exec -it backendphp-mongo-1 mongosh
use dataplatform_db
db.api_connections.find().hint({ $natural: -1 }).limit(5)
```

### Dashboard Loading Optimization
**Pattern**: Parallel API fetching in staged groups
```javascript
// Group 1: Critical data (fast, always needed)
const group1 = Promise.all([
  fetchWithTimeout('/api/smart-travel/dashboard/overview'),
  fetchWithTimeout('/api/smart-travel/dashboard/city-ranking')
]);

// Group 2: Secondary data (can load after critical)
const group2 = Promise.all([
  fetchWithTimeout('/api/smart-travel/dashboard/city-category-matrix'),
  fetchWithTimeout('/api/smart-travel/dashboard/map-data', 20000) // Heavy data
]);
```

❌ **Don't do this**:
```javascript
// Frontend creates schedule directly
await apiClient.post('/api/schedules', scheduleData);
// Then manually trigger Airflow
await apiClient.post('/api/airflow/trigger', {dagId: 'custom_dag'});
```

✅ **Do this**:
```javascript
// Backend handles Airflow sync automatically
const schedule = await apiClient.post('/api/schedules', scheduleData);
// AirflowService.syncDagFiles() called internally
```

### MongoDB Query Patterns
```php
// Repository pattern (see ConnectionRepository.php)
public function findById(string $id): ?array {
    $objectId = new \MongoDB\BSON\ObjectId($id);
    $results = $this->findWithPagination(['_id' => $objectId], ['limit' => 1]);
    return $results[0] ?? null;
}

// Advanced aggregation for city ranking (see SmartTravelDashboardService.php)
public function getCityRanking(): array {
    $pipeline = [
        ['$group' => ['_id' => '$city', 'count' => ['$sum' => 1], 'avgRating' => ['$avg' => '$rating']]],
        ['$sort' => ['avgRating' => -1]],
        ['$limit' => 20]
    ];
    return $this->placesCollection->aggregate($pipeline);
}

// Matrix building for heatmap visualization
public function getCityCategoryMatrix(): array {
    // Step 1: Get cities, Step 2: Get categories, Step 3: Build cross-reference matrix
    $matrix = [];
    foreach ($cities as $city) {
        $row = [];
        foreach ($categories as $category) {
            $count = $this->placesCollection->aggregate([
                ['$match' => ['city' => $city, 'types' => $category]],
                ['$count' => 'total']
            ]);
            $row[] = (int)$count;
        }
        $matrix[] = $row;
    }
}
```

### Error Handling
```php
// Controllers return structured errors
if (!$connection) {
    http_response_code(404);
    return ['error' => 'Connection not found'];
}
```

### Validation
```php
// Use ValidationHelper in controllers
$input = ValidationHelper::getJsonInput();
$input = ValidationHelper::sanitizeInput($input);
ValidationHelper::validateRequest($this->validator, $input);
```

## Dashboard Architecture Patterns

### Data Visualization Pipeline
**Pattern**: MongoDB Aggregation → PHP Service → JSON API → React Components → Charts
```php
// 1. Complex aggregation in MongoDB
$pipeline = [
    ['$group' => ['_id' => '$city', 'count' => ['$sum' => 1], 'avgRating' => ['$avg' => '$rating']]],
    ['$sort' => ['avgRating' => -1]],
    ['$limit' => 20]
];

// 2. Service transforms to frontend-friendly format
return array_map(function($doc) {
    return [
        'city' => $doc['_id'],
        'count' => (int)$doc['count'],
        'avgRating' => round($doc['avgRating'], 2)
    ];
}, $result);

// 3. React component renders with Recharts
<BarChart data={data}>
    <Bar dataKey="count" fill="#3b82f6" />
</BarChart>
```

### Performance Optimization Strategies
- **Parallel Loading**: Group API calls by priority (critical → secondary → heavy)
- **Response Caching**: 5-minute TTL for dashboard endpoints
- **Data Sampling**: Random sampling for large datasets (maps use 500 points)
- **Memoization**: React.memo for chart components to prevent re-renders

## File Organization Examples

### Adding New API Endpoint
1. **Controller**: `app/Controllers/NewController.php`
2. **Service**: `app/Services/NewService.php`
3. **Repository**: `app/Repositories/NewRepository.php`
4. **Route**: Add to `routes/api.php`
5. **Test**: Add to `test-api.ps1`

### Frontend Component
```
components/
├── NewComponent.tsx      # Main component
├── client-new.tsx        # Client-side wrapper
└── ui/                   # Reusable UI components
```

### Adding Dashboard Visualization
1. **Backend Service Method**: Add aggregation logic to `SmartTravelDashboardService.php`
2. **Backend Controller Method**: Add endpoint to `SmartTravelDashboardController.php`
3. **Backend Route**: Add route to `routes/api.php`
4. **Frontend Component**: Add visualization to `smart-travel-dashboard.jsx`
5. **API Integration**: Add parallel fetch call with timeout handling

## Deployment & Production

### Docker Services
- **mongodb**: MongoDB Atlas (cloud) - not local by default
- **backend**: PHP Apache server
- **frontend**: Next.js production build
- **airflow-webserver/scheduler/worker**: Distributed task execution
- **postgres**: Airflow metadata
- **redis**: Celery broker + caching

### Production Checklist
- [ ] Set `APP_ENV=production` in backend
- [ ] Configure MongoDB Atlas credentials
- [ ] Set up Airflow admin user
- [ ] Configure CORS for production domain
- [ ] Enable Redis caching
- [ ] Run `test-api.ps1` before deployment
- [ ] Test dashboard endpoints with production data load
- [ ] Verify parallel API fetching works under load
- [ ] Check MongoDB aggregation performance on large datasets

## AI Agent Guidelines

### When Adding Features
1. **Follow existing patterns**: Controller → Service → Repository
2. **Add comprehensive tests**: Update `test-api.ps1`
3. **Handle Airflow integration**: Use `AirflowService` for DAG management
4. **Validate inputs**: Use `ValidationHelper` in controllers
5. **Return structured responses**: Associative arrays, auto-JSON conversion

### When Adding Dashboard Visualizations
1. **Use MongoDB aggregation pipelines** for complex data analysis
2. **Implement parallel API fetching** in groups (critical → secondary → heavy)
3. **Add response caching** (5-minute TTL) for dashboard endpoints
4. **Use memoized React components** to prevent unnecessary re-renders
5. **Handle large datasets** with sampling and pagination
6. **Implement matrix building** for heatmap-style visualizations

### When Debugging
1. **Check service logs**: `docker-compose logs [service]`
2. **Test API endpoints**: Use `test-api.ps1` or manual curl
3. **Verify MongoDB data**: Connect via `mongosh` in container
4. **Check Airflow DAGs**: Visit http://localhost:8080

### When Modifying Database Schema
1. **Update collection names** in `AppConfig.php`
2. **Modify repositories** to handle new fields
3. **Update validation** in `Validation/` directory
4. **Test with sample data** before committing

### When Working with Dashboard Data
1. **Use aggregation pipelines** for complex analytics (group, sort, limit, unwind)
2. **Implement matrix building** for cross-reference visualizations
3. **Handle large datasets** with sampling and pagination
4. **Test with real data** - use MongoDB queries to verify data structure
5. **Optimize queries** - add indexes for frequently aggregated fields

---

**Key Reference Files**:
- `backendphp/README.md`: Detailed API documentation
- `backendphp/routes/api.php`: All API endpoints
- `backendphp/test-api.ps1`: Testing patterns
- `docker-compose.yml`: Service orchestration
- `frontendphp/package.json`: Frontend dependencies
- `frontendphp/components/dashboard/smart-travel-dashboard.jsx`: Dashboard implementation patterns
- `backendphp/app/Services/SmartTravelDashboardService.php`: MongoDB aggregation examples
- `frontendphp/services/apiClient.js`: Caching and timeout patterns</content>
<parameter name="filePath">d:\project\no-code-api-connector\.github\copilot-instructions.md