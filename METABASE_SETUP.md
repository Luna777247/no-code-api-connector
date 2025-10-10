# Metabase Integration for No-Code API Connector

This document provides comprehensive instructions for setting up Metabase to create visual dashboards and analytics for the ETL data from the No-Code API Connector.

## Overview

Metabase integration provides:

- **Real-time Dashboards**: Visual analytics of ETL performance, data quality, and system health
- **Custom Queries**: MongoDB aggregations and Next.js API data for ad-hoc analysis  
- **Automated Reporting**: Scheduled reports and alerts
- **Data Exploration**: Interactive charts, tables, and filters
- **Simplified Stack**: Uses only MongoDB and Next.js APIs - no additional databases needed

## Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   Next.js App   │    │    Metabase      │
│  (Port 3000)    │────│  (Port 3001)     │
└─────────────────┘    └──────────────────┘
         │                        │
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    MongoDB      │────│  Analytics APIs  │    │   Redis Cache   │
│  (Atlas Cloud)  │    │ /api/analytics/* │    │  (Port 6380)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Prerequisites

- Docker and Docker Compose installed
- No-Code API Connector running (with MongoDB integration)
- At least 2GB RAM available for Metabase
- Port 3001 available for Metabase web interface
- MongoDB Atlas connection (your existing smart_travel_v2 database)

## Quick Start

### 1. Start Metabase Stack

```bash
# Navigate to project directory
cd d:\project\no-code-api-connector

# Start all Metabase services
docker-compose -f docker-compose.metabase.yml up -d

# Check services are running
docker-compose -f docker-compose.metabase.yml ps
```

### 2. Initial Metabase Setup

1. **Open Metabase**: Navigate to [http://localhost:3001](http://localhost:3001)

2. **Create Admin Account**:
   - Email: `admin@yourcompany.com`
   - Password: Choose a secure password
   - First/Last Name: Your details

3. **Skip Usage Data** (optional): Choose whether to share anonymous usage data

### 3. Add Data Sources

#### MongoDB Connection (Primary ETL Data)

1. Go to **Admin → Databases → Add database**
2. **Database type**: MongoDB  
3. **Display name**: `ETL Data (MongoDB)`
4. **Connection String**: `mongodb+srv://mongodb:12345@cluster0.olqzq.mongodb.net/smart_travel_v2?retryWrites=true&w=majority`
5. **Database name**: `smart_travel_v2`
6. **Test connection** and **Save**

#### Next.js Analytics APIs (JSON Data Source)

1. **Add database** → **HTTP/JSON**
2. **Display name**: `Live Analytics APIs`  
3. **Base URL**: `http://host.docker.internal:3000/api/analytics`
4. **Headers**: Add `Content-Type: application/json`
5. **Test connection** and **Save**

### 4. Sync Data and Verify Connection

```bash
# Wait for initial data sync (1-2 minutes)
docker-compose -f docker-compose.metabase.yml logs -f metabase

# Test your analytics APIs are working
curl http://localhost:3000/api/analytics/runs
curl http://localhost:3000/api/analytics/connections  
curl http://localhost:3000/api/analytics/schedules
```

## Dashboard Templates

### 1. ETL Performance Dashboard

**Visualizations**:
- **ETL Runs Timeline**: Line chart showing daily successful/failed runs
- **Connection Health**: Gauge charts for each API connection status
- **Data Volume**: Bar chart of records extracted/loaded per connection
- **Processing Time**: Scatter plot of run duration vs. record count
- **Error Analysis**: Table of recent failures with error messages

**Key Metrics** (using Analytics APIs):
```javascript
// Daily ETL Summary (from /api/analytics/runs)
GET /api/analytics/runs?timeframe=30days&groupBy=day

// Returns aggregated data:
{
  "summary": {
    "totalRuns": 150,
    "successfulRuns": 142,  
    "failedRuns": 8,
    "successRate": 94.7,
    "avgDurationMs": 2340
  },
  "dailyStats": [...]
}
```

### 2. Data Quality Dashboard

**Visualizations**:
- **Field Coverage**: Heatmap of null values across connections
- **Schema Evolution**: Timeline showing field additions/changes
- **Data Freshness**: Last update time per connection
- **Volume Trends**: Moving averages of daily record counts

**MongoDB Query Example**:
```javascript
// Data Quality Analysis
db.api_data_transformed.aggregate([
  {
    $group: {
      _id: "$_connectionId",
      totalRecords: { $sum: 1 },
      fieldStats: {
        $push: { $size: { $objectToArray: "$$ROOT" } }
      },
      lastUpdate: { $max: "$_insertedAt" }
    }
  }
])
```

### 3. Scheduling Performance Dashboard

**Visualizations**:
- **Airflow DAG Status**: Pie chart of active/paused/failed DAGs
- **Schedule Adherence**: Success rate by connection over time  
- **Execution Times**: Distribution of workflow durations
- **Queue Performance**: Pending vs. running tasks

**API Endpoint**: `/api/analytics/schedules?days=7`

### 4. System Overview Dashboard

**Key Performance Indicators**:
- Total Active Connections
- Data Processing Rate (records/hour)
- System Uptime
- Error Rate (last 24h)
- Storage Usage Growth

## Custom Queries and Analysis

### API-Based Analytics Examples

#### Connection Performance Analysis
```javascript
// GET /api/analytics/connections?metric=performance
{
  "connections": [
    {
      "connectionId": "conn_123",
      "name": "Places API",
      "successRate": 94.5,
      "avgResponseTimeMs": 1200,
      "totalRuns": 45,
      "daysSinceLastRun": 0.5,
      "healthStatus": "Healthy"
    }
  ]
}
```

#### Error Trend Analysis
```javascript  
// GET /api/analytics/runs?status=failed&groupBy=hour&hours=24
{
  "hourlyErrors": [
    {
      "hour": "2025-10-04T14:00:00Z",
      "errorCount": 3,
      "affectedConnections": 2,
      "errorTypes": ["Timeout", "Rate limit"]
    }
  ]
}
```

#### Data Volume Growth
```javascript
// GET /api/analytics/runs?metric=volume&days=30
{
  "dailyVolume": [
    {
      "date": "2025-10-04",
      "recordsLoaded": 1250,
      "movingAvg7Day": 1180
    }
  ]
}
```

### MongoDB Aggregation Examples

```javascript
// Connection Utilization Analysis
db.api_data_transformed.aggregate([
  {
    $match: {
      _insertedAt: { 
        $gte: new Date(Date.now() - 30*24*60*60*1000) 
      }
    }
  },
  {
    $group: {
      _id: {
        connectionId: "$_connectionId",
        hour: { $hour: "$_insertedAt" }
      },
      recordCount: { $sum: 1 }
    }
  },
  {
    $group: {
      _id: "$_id.connectionId", 
      hourlyDistribution: {
        $push: {
          hour: "$_id.hour",
          count: "$recordCount"
        }
      },
      totalRecords: { $sum: "$recordCount" }
    }
  }
])

// Field Usage Analysis
db.api_data_transformed.aggregate([
  {
    $project: {
      _connectionId: 1,
      fieldCount: { $size: { $objectToArray: "$$ROOT" } },
      fields: { $objectToArray: "$$ROOT" }
    }
  },
  {
    $unwind: "$fields"
  },
  {
    $group: {
      _id: {
        connection: "$_connectionId",
        field: "$fields.k"
      },
      usage: { $sum: 1 },
      sampleValues: { $addToSet: "$fields.v" }
    }
  }
])
```

## Alerts and Monitoring

### 1. Set Up Email Alerts

**Admin → Settings → Email**:
- SMTP Host: `smtp.gmail.com` (or your provider)
- Port: `587`
- Security: `STARTTLS`
- Username/Password: Your email credentials

### 2. Create Alert Rules

**ETL Failure Alert**:
```sql
SELECT COUNT(*) as failed_runs
FROM analytics.api_runs_fact 
WHERE status = 'failed' 
  AND started_at >= NOW() - INTERVAL '1 hour';
```
- **Alert when**: `failed_runs > 0`
- **Send to**: Operations team email
- **Check every**: 15 minutes

**Data Freshness Alert**:
```sql
SELECT 
  connection_id,
  MAX(started_at) as last_run,
  EXTRACT(hours FROM NOW() - MAX(started_at)) as hours_since_last_run
FROM analytics.api_runs_fact 
WHERE status = 'success'
GROUP BY connection_id
HAVING hours_since_last_run > 25; -- Alert if no data for >25 hours
```

### 3. Slack Integration

1. **Create Slack App**: https://api.slack.com/apps
2. **Get Webhook URL**: Add incoming webhooks
3. **Metabase → Admin → Settings → Slack**: 
   - Enter webhook URL
   - Test connection

## Performance Optimization

### 1. MongoDB Indexes

```javascript
// Create indexes for better analytics performance
db.api_data_transformed.createIndex(
  { "_connectionId": 1, "_insertedAt": -1 }
)

db.api_data_transformed.createIndex(
  { "_insertedAt": -1 }
)

db.api_data_transformed.createIndex(
  { "_connectionId": 1, "status": 1, "_insertedAt": -1 }
)
```

### 2. Metabase Caching

**Admin → Settings → Caching**:
- **Question Cache TTL**: 1 hour (for real-time dashboards)
- **Dashboard Cache TTL**: 30 minutes  
- **Model Cache TTL**: 6 hours

### 3. API Response Caching

```javascript
// Add caching to analytics endpoints (lib/analytics-cache.js)
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6380');

export async function getCachedAnalytics(key, dataFetcher, ttl = 300) {
  const cached = await redis.get(key);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  const data = await dataFetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  
  return data;
}

// Usage in API routes:
// const data = await getCachedAnalytics('runs-summary', fetchRunsSummary, 600);
```

## Troubleshooting

### Common Issues

1. **"Database connection failed"**
   ```bash
   # Check if containers are running
   docker-compose -f docker-compose.metabase.yml ps
   
   # Check network connectivity to your APIs
   docker exec metabase ping host.docker.internal
   curl http://localhost:3000/api/analytics/runs
   ```

2. **"Out of memory" errors**
   ```bash
   # Increase Metabase memory limits
   docker-compose -f docker-compose.metabase.yml down
   # Edit docker-compose file: JAVA_OPTS: -Xmx4g -Xms2g
   docker-compose -f docker-compose.metabase.yml up -d
   ```

3. **Slow dashboard loading**
   - Add MongoDB indexes on commonly queried fields
   - Enable Redis caching in analytics APIs
   - Implement response caching with TTL
   - Limit date ranges in API queries
   - Use MongoDB aggregation pipelines for complex queries

### Log Analysis

```bash
# Metabase application logs
docker-compose -f docker-compose.metabase.yml logs -f metabase

# Next.js application logs
npm run dev 

# MongoDB slow query logs (if using local MongoDB)
# mongosh --eval "db.setProfilingLevel(2, {slowms: 100})"

# Redis logs for caching
docker-compose -f docker-compose.metabase.yml logs -f redis
```

## Production Deployment

### Security Checklist

- [ ] Change default passwords for all services
- [ ] Enable HTTPS for Metabase (reverse proxy)
- [ ] Set up proper database user permissions
- [ ] Configure firewall rules (only allow necessary ports)
- [ ] Enable database connection encryption
- [ ] Set up regular security updates

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)

# Backup Metabase H2 database  
docker cp metabase:/metabase-data/metabase.db "metabase_backup_${DATE}.db"

# MongoDB data is already backed up on Atlas (cloud)
# Just backup the analytics configurations
curl http://localhost:3000/api/analytics/export > "analytics_config_${DATE}.json"

# Upload to cloud storage (S3, Azure, etc.)
aws s3 cp "metabase_backup_${DATE}.db" s3://your-backup-bucket/metabase/
```

### Monitoring and Scaling

1. **Resource Monitoring**:
   - CPU/Memory usage of Docker containers
   - Database connection pool utilization  
   - Query execution times
   - Dashboard loading performance

2. **Horizontal Scaling**:
   - Use multiple Metabase instances behind load balancer
   - Read replicas for PostgreSQL analytics database
   - MongoDB sharding for large datasets

3. **Performance Tuning**:
   - Implement query result caching in Redis
   - Pre-aggregate heavy calculations
   - Use time-based partitioning for large tables

## Next Steps

1. **Explore Sample Dashboards**: Import and customize the provided dashboard templates
2. **Set Up Alerts**: Configure email/Slack notifications for critical metrics  
3. **Create Custom Views**: Build dashboards specific to your business requirements
4. **Performance Testing**: Monitor query performance and optimize as needed
5. **User Training**: Train team members on creating questions and dashboards
6. **Integration**: Connect additional data sources (APIs, databases, files)

## Support and Resources

- **Metabase Documentation**: https://www.metabase.com/docs
- **MongoDB Connector**: https://github.com/metabase/metabase/wiki/MongoDB
- **PostgreSQL Optimization**: https://wiki.postgresql.org/wiki/Performance_Optimization
- **Sample Queries Repository**: `metabase/sample-queries/`

For questions or issues, check the project documentation or create an issue in the repository.