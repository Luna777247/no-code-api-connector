# No-Code API Connector Platform

A powerful microservices-based platform for managing, scheduling, and analyzing APIs without writing code. Built with modern technologies including PHP, Next.js, MongoDB, and Apache Airflow.

## 🎯 Project Overview

**No-Code API Connector** is an enterprise-grade platform that enables users to:
- 🔌 **Connect** to any REST API without coding
- ⏰ **Schedule** automated API executions with cron expressions
- 📊 **Analyze** API data with rich dashboards and visualizations
- 💾 **Store** API responses in MongoDB Atlas
- 🔄 **Transform** and map API data into structured formats

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                    │
│              Port 3000 - React Components                   │
└──────────────┬────────────────────────────────────┬─────────┘
               │                                    │
┌──────────────▼────────────────┐    ┌─────────────▼──────────┐
│   Backend (PHP 8.3 REST API)  │    │  Airflow (Scheduler)   │
│      Port 8000 - Apache       │    │   Port 8080            │
│   Controller → Service →      │    │ - Task scheduling      │
│   Repository Pattern          │    │ - DAG management       │
└──────────────┬────────────────┘    └─────────────┬──────────┘
               │                                    │
┌──────────────┴────────────────┬───────────────────┴──────────┐
│                                │                             │
│   ┌─────────────────────────────┴──────────┐                 │
│   │   MongoDB Atlas (Cloud Database)       │                 │
│   │   - api_connections                   │                 │
│   │   - api_schedules                     │                 │
│   │   - api_runs                          │                 │
│   │   - smart_travel.places (4,972+ docs)│                 │
│   └────────────────────────────────────────┘                 │
│                                                              │
│   ┌─────────────────────────────┬──────────┐                 │
│   │  PostgreSQL                 │  Redis   │                 │
│   │  (Airflow metadata)         │ (Cache)  │                 │
│   └─────────────────────────────┴──────────┘                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- Git

### Setup & Running

#### 1. Clone and Setup (Windows PowerShell)
```powershell
# Clone the repository
git clone https://github.com/Luna777247/no-code-api-connector.git
cd no-code-api-connector

# Run setup script (starts all Docker services)
.\setup.ps1

# Start development mode
.\start-dev.ps1
```

#### 2. Access the Platform
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Airflow UI**: http://localhost:8080
- **API Health Check**: GET http://localhost:8000/api/admin/health

#### 3. Backend Development
```powershell
cd backendphp

# Run comprehensive API test suite (12 tests)
.\test-api.ps1

# View backend logs
docker-compose logs backend -f

# Restart backend service
docker-compose restart backend
```

#### 4. Frontend Development
```powershell
cd frontendphp

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📚 Core Features

### 1. API Connection Management
- **Create connections** to any REST API with custom headers, authentication
- **Test connections** before saving
- **Connection templates** for popular services
- **Secure credential storage** in MongoDB

**Endpoints**:
```
GET    /api/connections              # List all connections
POST   /api/connections              # Create new connection
GET    /api/connections/{id}         # Get connection details
PUT    /api/connections/{id}         # Update connection
DELETE /api/connections/{id}         # Delete connection
```

### 2. Smart Scheduling
- **Cron expression support** for flexible scheduling
- **Automatic DAG generation** in Apache Airflow
- **Pause/resume** schedules on demand
- **Execution history** tracking with MongoDB

**Endpoints**:
```
GET    /api/schedules                # List all schedules
POST   /api/schedules                # Create schedule (triggers Airflow sync)
GET    /api/schedules/{id}           # Get schedule details
PUT    /api/schedules/{id}           # Update schedule
DELETE /api/schedules/{id}           # Delete schedule
```

**Airflow Integration Flow**:
1. POST to `/api/schedules` → Creates MongoDB record
2. Backend triggers `AirflowService::syncDagFiles()`
3. Dynamic DAG generated: `api_execute_{schedule_id}`
4. Airflow scheduler picks up and executes on cron trigger

### 3. API Execution & Monitoring
- **Manual execution** of API calls
- **Automatic execution** via Airflow schedules
- **Run history** with request/response data
- **Error tracking** and retry logic

**Endpoints**:
```
GET    /api/runs                     # Get execution history
POST   /api/runs                     # Execute API manually
GET    /api/runs/{id}                # Get run details
```

### 4. Data Mapping & Transformation
- **Automatic field extraction** from API responses
- **JSON to MongoDB mapping** with type inference
- **Custom field renaming** and transformation
- **Array normalization** (handles nested data structures)

### 5. Smart Travel Dashboard (Analytics)
Advanced analytics dashboard showcasing data visualization capabilities:

**Key Metrics**:
- 📊 **Place Categories Distribution** - Bar chart of top 20 categories
- 🎯 **City Rankings** - Top 20 cities by average rating with medal badges
- 📈 **Rating Distribution** - Pie chart of places by rating ranges
- 🗺️ **Geographic Distribution** - Heatmap of cities vs categories
- ⭐ **Top Rated Places** - Top 10 highest-rated places table
- 🔥 **City-Category Heatmap** - 5-level intensity visualization

**Endpoints**:
```
GET /api/smart-travel/dashboard/overview
GET /api/smart-travel/dashboard/city-ranking
GET /api/smart-travel/dashboard/city-category-matrix
GET /api/smart-travel/dashboard/places-by-category
GET /api/smart-travel/dashboard/places-by-rating
GET /api/smart-travel/dashboard/average-rating-by-category
GET /api/smart-travel/dashboard/places-by-province
GET /api/smart-travel/dashboard/top-places
GET /api/smart-travel/dashboard/map-data
```

## 📊 Database Schema

### MongoDB Collections

#### `api_connections`
```javascript
{
  "_id": ObjectId,
  "name": "Google Places API",
  "baseUrl": "https://maps.googleapis.com/maps/api/place",
  "headers": {
    "Authorization": "Bearer token..."
  },
  "authentication": {
    "type": "bearer|basic|api_key",
    "credentials": {...}
  },
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### `api_schedules`
```javascript
{
  "_id": ObjectId,
  "connectionId": ObjectId,
  "name": "Daily Place Updates",
  "cronExpression": "0 0 * * *",
  "isActive": true,
  "created_at": ISODate,
  "updated_at": ISODate
}
```

#### `api_runs`
```javascript
{
  "_id": ObjectId,
  "scheduleId": ObjectId,
  "connectionId": ObjectId,
  "status": "success|failure|pending",
  "requestData": {...},
  "responseData": {...},
  "startTime": ISODate,
  "endTime": ISODate,
  "duration": 1234,  // milliseconds
  "errorMessage": null
}
```

#### `smart_travel.places` (Sample Data)
```javascript
{
  "_id": ObjectId,
  "name": "Opera House",
  "city": "Sydney",
  "province": "New South Wales",
  "latitude": -33.8568,
  "longitude": 151.2153,
  "rating": 4.7,
  "types": ["tourist_attraction", "landmark"],
  "address": "Bennelong Point, Sydney NSW 2000, Australia",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

Documents: **4,972 tourist places** across multiple countries with ratings, categories, and geolocation.

## 🎨 Frontend Pages

### Main Pages
- **Dashboard** (`/`) - Overview and quick actions
- **Smart Travel Dashboard** (`/dashboards/smart-travel`) - Advanced analytics with 9 visualizations
- **Connections** (`/connections`) - Manage API connections
- **Schedules** (`/schedules`) - Create and manage schedules
- **Runs** (`/runs`) - View execution history
- **Data Explorer** (`/data`) - Browse stored data

### Wizard Pages (Create New API Integration)
- **Step 1: Connection** - Configure API endpoint
- **Step 2: Data Mapping** - Map API fields to database
- **Step 3: Schedule** - Set up automatic execution
- **Step 4: Review** - Verify configuration before saving

## 🔧 Development Patterns

### Backend: Controller → Service → Repository

```php
// 1. Controller handles HTTP request/response
class ConnectionController {
    public function create(): array {
        $input = ValidationHelper::getJsonInput();
        $input = ValidationHelper::sanitizeInput($input);
        ValidationHelper::validateRequest($this->validator, $input);
        
        $saved = $this->service->create($input);
        if (!$saved) {
            http_response_code(400);
            return ['error' => 'Failed to create'];
        }
        return $saved;  // Auto-converted to JSON
    }
}

// 2. Service contains business logic
class ConnectionService {
    public function create(array $data): ?array {
        return $this->repository->save($data);
    }
}

// 3. Repository handles database operations
class ConnectionRepository {
    public function save(array $data): ?array {
        $result = $this->connections->insertOne($data);
        return $this->findById((string)$result->getInsertedId());
    }
}
```

### Frontend: API Client with Caching & Timeouts

```javascript
// services/apiClient.js
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export const apiClient = {
  timeout: 120000,  // 120s for large datasets
  
  async get(endpoint, timeoutMs = 15000) {
    return Promise.race([
      axios.get(`${API_BASE}${endpoint}`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      ),
    ]);
  },
  // POST, PUT, DELETE methods...
};
```

### MongoDB Aggregation Pipeline Pattern

```php
// ✅ CORRECT: Single pipeline (1 database call, fast)
public function getCityRanking(): array {
    $pipeline = [
        ['$group' => [
            '_id' => '$city',
            'count' => ['$sum' => 1],
            'avgRating' => ['$avg' => '$rating']
        ]],
        ['$sort' => ['avgRating' => -1]],
        ['$limit' => 20]
    ];
    $result = $this->placesCollection->aggregate($pipeline);
    return array_map(fn($doc) => [
        'city' => $doc['_id'],
        'count' => (int)$doc['count'],
        'avgRating' => round($doc['avgRating'], 2)
    ], iterator_to_array($result));
}

// ❌ SLOW: Nested loops (400+ database calls, timeout)
public function getCityRanking_SLOW(): array {
    $cities = $this->getUniqueCities();
    $matrix = [];
    foreach ($cities as $city) {  // N iterations
        $count = $this->placesCollection->countDocuments(['city' => $city]);
        // More queries...
    }
    return $matrix;
}
```

**Performance**: 400+ queries → 1 pipeline = **120s+ timeout → <5s response (400× faster)**

## 📈 Performance Optimization

### Frontend Timeout Strategy
Different endpoints require different timeouts based on query complexity:

```javascript
// Critical endpoints (fast aggregations)
const fetchCritical = () => Promise.all([
  fetchWithTimeout('/api/smart-travel/dashboard/overview', 15000),
  fetchWithTimeout('/api/smart-travel/dashboard/city-ranking', 15000),
]);

// Complex aggregations (heatmap with $unwind/$group)
const fetchHeavy = () => Promise.all([
  fetchWithTimeout('/api/smart-travel/dashboard/city-category-matrix', 30000),  // Needs 30s
  fetchWithTimeout('/api/smart-travel/dashboard/map-data', 20000),
]);

// Sequential loading: Critical → Heavy
Promise.all([...fetchCritical()]).then(() => Promise.all([...fetchHeavy()]));
```

### MongoDB Query Optimization

**Key Techniques**:
1. **Single aggregation pipeline** instead of N×M queries
2. **Result limiting** to avoid memory explosion (e.g., top 15×15 for heatmaps)
3. **Proper MongoDB indexes** on frequently aggregated fields
4. **Connection initialization** before aggregation (`connectToMongoDB()`)

## 🧪 Testing

### API Test Suite
```powershell
cd backendphp
.\test-api.ps1
```

**Tests Covered** (12 total):
- ✅ Health check endpoints
- ✅ Connection CRUD operations
- ✅ Schedule creation and Airflow sync
- ✅ Manual API execution
- ✅ Dashboard analytics endpoints
- ✅ Error handling and validation

### Expected Results
```
✅ GET /api/admin/health → 200 OK
✅ POST /api/connections → 201 Created
✅ GET /api/smart-travel/dashboard/city-ranking → 200 OK (< 10s)
✅ GET /api/smart-travel/dashboard/city-category-matrix → 200 OK (< 10s)
...and 8 more tests
```

## 🌐 Environment Variables

### Backend (`.env`)
```env
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
MONGODB_DATABASE=dataplatform_db

# App Configuration
APP_ENV=production
APP_DEBUG=false
APP_PORT=8000

# Airflow Integration
AIRFLOW_HOME=/app/airflow
AIRFLOW_BASE_URL=http://airflow-webserver:8080
```

### Frontend (`.env.local`)
```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Optional: Analytics, Monitoring, etc.
NEXT_PUBLIC_ANALYTICS_ID=...
```

### Airflow (`config/airflow.cfg`)
```ini
[core]
sql_alchemy_conn = postgresql://airflow:airflow@postgres:5432/airflow
executor = CeleryExecutor
base_log_folder = /app/airflow/logs

[database]
load_examples = False
```

## 📦 Docker Services

```yaml
# docker-compose.yml
services:
  backend:       # PHP 8.3 Apache (port 8000)
  frontend:      # Next.js dev server (port 3000)
  mongodb:       # MongoDB Atlas connection (cloud)
  postgres:      # PostgreSQL for Airflow (port 5432)
  redis:         # Redis cache (port 6379)
  airflow-webserver:      # Airflow UI (port 8080)
  airflow-scheduler:      # DAG scheduler
  airflow-worker:         # Task execution worker
```

### Running Services

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild images
docker-compose build --no-cache
```

## 🔐 Security Considerations

### API Authentication
- ✅ Credential encryption for stored API keys
- ✅ HTTPS recommended in production
- ✅ Rate limiting on API endpoints
- ✅ Input validation and sanitization

### Database
- ✅ MongoDB Atlas with IP whitelist
- ✅ Connection pooling
- ✅ Data at rest encryption

### Airflow
- ✅ Airflow admin user required
- ✅ DAG authorization rules
- ✅ Secret management for sensitive data

## 🐛 Troubleshooting

### Frontend Timeout Issues
**Problem**: "timeout of 120000ms exceeded"
**Solution**: 
1. Check backend health: `Invoke-WebRequest http://localhost:8000/api/admin/health`
2. Verify MongoDB connection in logs: `docker-compose logs backend`
3. Increase timeout for complex queries (heatmap needs 30s)

### Backend Not Responding
**Problem**: "No response from server"
**Solution**:
1. Restart backend: `docker-compose restart backend`
2. Check logs: `docker-compose logs backend --tail=50`
3. Verify MongoDB credentials in `.env`

### Airflow DAG Not Executing
**Problem**: Schedule created but not executing
**Solution**:
1. Check Airflow UI: http://localhost:8080
2. Verify DAG file generated: `docker exec airflow-scheduler ls /app/airflow/dags/`
3. Trigger manually in Airflow UI or check scheduler logs

## 📚 API Documentation

### Health Check
```bash
curl http://localhost:8000/api/admin/health
```

### Create Connection
```bash
curl -X POST http://localhost:8000/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weather API",
    "baseUrl": "https://api.openweathermap.org",
    "headers": {"User-Agent": "MyApp"},
    "authentication": {
      "type": "api_key",
      "credentials": {"api_key": "your_key"}
    }
  }'
```

### Create Schedule
```bash
curl -X POST http://localhost:8000/api/schedules \
  -H "Content-Type: application/json" \
  -d '{
    "connectionId": "connection_id",
    "name": "Daily Weather Update",
    "cronExpression": "0 8 * * *",  # 8 AM daily
    "isActive": true
  }'
```

### Get Dashboard Data
```bash
curl http://localhost:8000/api/smart-travel/dashboard/city-ranking
curl http://localhost:8000/api/smart-travel/dashboard/city-category-matrix
```

## 🚀 Deployment

### Production Build
```bash
# Backend
docker build -t api-connector-backend:latest ./backendphp
docker push your-registry/api-connector-backend:latest

# Frontend
docker build -t api-connector-frontend:latest ./frontendphp
docker push your-registry/api-connector-frontend:latest
```

### Kubernetes Deployment
See `/k8s` directory for Kubernetes manifests (if available).

### Docker Compose Production
```bash
# Scale workers for high volume
docker-compose up -d --scale airflow-worker=3

# Monitor resources
docker stats
```

## 📝 Version History

- **v1.1.0** (Nov 11, 2025)
  - ✅ Frontend UI fully converted to English
  - ✅ Dashboard performance optimization (400× faster queries)
  - ✅ Connection initialization fixes for all service methods
  - ✅ Comprehensive AI coding instructions added
  - ✅ 8+ gradient-styled dashboard components

- **v1.0.0** (Initial Release)
  - Core API connection management
  - Smart scheduling with Airflow integration
  - Data mapping and transformation
  - Basic dashboard and analytics

## 🤝 Contributing

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** following the patterns in `/copilot-instructions.md`
4. **Test thoroughly**: `.\test-api.ps1`
5. **Commit with clear messages**: `git commit -m "feat: description"`
6. **Push and create Pull Request**

### Code Style
- PHP: PSR-12 compliant
- JavaScript/React: ESLint + Prettier configured
- Component structure: shadcn/ui + Tailwind CSS
- Comments: Clear and comprehensive

## 📄 License

MIT License - See LICENSE file for details

## 👥 Support

- 📧 Email: support@example.com
- 🐛 Issues: https://github.com/Luna777247/no-code-api-connector/issues
- 📚 Documentation: See `/docs` directory
- 💬 Discussions: GitHub Discussions

## 🎓 Learning Resources

### Key Documentation
- **AI Coding Instructions**: `.github/copilot-instructions.md` (730+ lines of patterns, best practices, debugging guides)
- **Architecture Patterns**: See "Development Patterns" section above
- **Database Schema**: MongoDB collections documented above
- **API Endpoints**: Full list in "Core Features" section

### Example Use Cases
1. **Weather API Integration**: Fetch daily weather → Store in MongoDB → Display on dashboard
2. **E-commerce Data Sync**: Pull product data from Shopify → Map to custom schema → Run analytics
3. **Social Media Analytics**: Collect posts from Twitter/Instagram → Aggregate metrics → Visualize trends
4. **IoT Data Pipeline**: Stream sensor data → API endpoint → Aggregate by location → Real-time dashboard

---

**Built with ❤️ using PHP, Next.js, MongoDB, and Apache Airflow**

Last Updated: November 11, 2025
