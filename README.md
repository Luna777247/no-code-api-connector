# No-Code API Connector Platform

A microservices platform for managing, scheduling, and analyzing APIs without coding. Built with PHP, Next.js, MongoDB, and Apache Airflow.

## � Quick Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend development)
- Git

### 1. Clone & Setup
```bash
git clone https://github.com/Luna777247/no-code-api-connector.git
cd no-code-api-connector

# Windows (default: localhost ports)
.\setup.ps1

# Linux/Mac (default: localhost ports)
chmod +x setup.sh && ./setup.sh
```

### 2. Custom Host/Port Setup
Configure for different IPs or ports using environment variables:

**Windows:**
```powershell
# Deploy on different IP/port
$env:BACKEND_HOST = "192.168.1.100"
$env:BACKEND_PORT = "8080"
$env:AIRFLOW_PORT = "9090"
.\setup.ps1
```

**Linux/Mac:**
```bash
# Deploy on different IP/port
export BACKEND_HOST=192.168.1.100
export BACKEND_PORT=8080
export AIRFLOW_PORT=9090
./setup.sh
```

### 3. Manual Setup (Alternative)
```bash
# Backend environment
cd backendphp
cp .env.example .env

# Frontend environment
cd ../frontendphp
cp .env.example .env.local

# Start services
cd ../backendphp
docker-compose up -d

# Start frontend (development)
cd ../frontendphp
npm install
npm run dev
```

### 4. Access URLs
- **Frontend**: http://localhost:3000 (or your configured host)
- **Backend API**: http://localhost:8000 (or your configured host:port)
- **Airflow UI**: http://localhost:8080 (or your configured host:port) - admin/admin
- **Health Check**: http://localhost:8000/api/admin/health

### 5. Test Portability
Test deployment on different configurations:
```bash
# Windows
.\test-portability.ps1 -TestHost 192.168.1.100 -TestPort 8080

# Linux/Mac
./test-portability.sh 192.168.1.100 8080
```

## 🌐 Deployment Scenarios

### Local Development (Default)
- **Host**: localhost
- **Backend Port**: 8000
- **Airflow Port**: 8080
- **MongoDB**: localhost:27017
- **Setup**: `.\setup.ps1` or `./setup.sh`

### Remote Server Deployment
```bash
# Set environment variables for your server
export BACKEND_HOST=your-server-ip
export BACKEND_PORT=80
export AIRFLOW_PORT=8080

# Run setup
./setup.sh
```

### Docker Network Deployment
- **Backend**: Accessible at `http://backend:80` (internal Docker network)
- **Frontend**: Configured to connect to backend service
- **External Access**: Map ports as needed

### Production Deployment Examples
```bash
# Example 1: Server with custom ports
export BACKEND_HOST=192.168.1.100
export BACKEND_PORT=8080
export AIRFLOW_PORT=9090

# Example 2: Domain-based deployment
export BACKEND_HOST=api.yourdomain.com
export BACKEND_PORT=443
export AIRFLOW_PORT=8080
```

## 📁 Project Structure

```
├── backendphp/          # PHP REST API (Port 8000)
├── frontendphp/         # Next.js UI (Port 3000)
├── setup.ps1           # Windows setup script
├── setup.sh            # Linux/Mac setup script
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_PORT` | 8000 | Backend API port |
| `AIRFLOW_PORT` | 8080 | Airflow UI port |
| `MONGO_PORT` | 27017 | MongoDB port |
| `NEXT_PUBLIC_API_BASE_URL` | http://localhost:8000 | Frontend API endpoint |

### Custom Ports
```bash
# Run on different ports
BACKEND_PORT=9000 AIRFLOW_PORT=9090 docker-compose up -d
```

## 🐛 Troubleshooting

### Services Won't Start
```bash
cd backendphp
docker-compose logs
docker-compose restart backend
```

### Port Conflicts
```bash
# Check what's using ports
netstat -ano | findstr :8000  # Windows
lsof -i :8000                # Linux/Mac

# Change ports
BACKEND_PORT=8001 docker-compose up -d
```

### Database Issues
```bash
# Reset database
cd backendphp
docker-compose down -v
docker-compose up -d
```

## 📚 Documentation

- [Backend API](backendphp/README.md)
- [Frontend UI](frontendphp/README.md)

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
