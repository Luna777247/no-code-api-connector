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

```

#### 2. Access the Platform
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Airflow UI**: http://localhost:8080
- **API Health Check**: GET http://localhost:8000/api/admin/health

#### 3. Backend Development
[Backend](backendphp/README.md)

#### 4. Frontend Development
[Frontend](frontendphp/README.md)

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
