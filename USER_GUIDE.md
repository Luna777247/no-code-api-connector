# No-Code API Connector User Guide

## Overview

**No-Code API Connector** is a comprehensive data platform that allows you to connect, manage, and automate data collection from external APIs without writing code. The system provides an intuitive interface to create API connections, schedule automatic data collection, and analyze collected data.

### Key Features

- API Connection Management: Create and manage connections to external APIs
- Automatic Scheduling: Collect data periodically with Airflow
- Data Analysis: Detailed dashboards and reports with Google Looker Studio
- Advanced Search: Efficient data search and filtering
- Data Export: Export data to multiple formats
- Field Mappings: Map data from API to database schema
- Monitoring: Real-time system monitoring
- Reports: Create custom and automated reports
- Airflow Integration: Automatic workflow orchestration

---

## Installation and Setup

### System Requirements

- **Docker Desktop**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **RAM**: Minimum 4GB
- **Storage**: Minimum 10GB free space

### Quick Installation

1. **Download source code:**
   ```bash
   git clone https://github.com/Luna777247/no-code-api-connector.git
   cd no-code-api-connector
   ```

2. **Start Docker Desktop** and ensure it's running

3. **Run automatic setup script:**
   ```powershell
   .\setup.ps1
   ```

4. **Access the application:**
   - **Frontend**: http://localhost:3000
   - **Backend API**: http://localhost:8000
   - **Airflow UI**: http://localhost:8080 (user: airflow, password: airflow)

### Manual Installation (Alternative)

If the automatic script doesn't work:

```bash
# Start all services
docker-compose up -d

# Initialize Airflow database (only needed first time)
docker-compose exec airflow-webserver airflow db migrate
docker-compose exec airflow-webserver airflow users create --username airflow --password airflow --firstname Airflow --lastname Admin --role Admin --email admin@example.com
```

---

## User Interface

### Home Page (Dashboard)

After logging in, you will see the main dashboard with:

- **System Stats**: Displays system uptime and total number of runs performed
- **Quick Actions**: "New Connection" button to create new API connections
- **Main Navigation Cards**: Main navigation cards to features:

  | Feature | Description |
  |---------|-------------|
  | **API Connections** | Manage API connections, configure endpoints, parameters, authentication |
  | **Schedules** | Set up automatic run schedules (daily, weekly, monthly, CRON) |
  | **Run History** | View execution history, logs, and status of API runs |
  | **Data Explorer** | Browse extracted data, view transformations, export to data warehouse |
  | **Field Mappings** | Configure mapping from API response fields to database schema |
  | **Analytics Dashboards** | Interactive dashboard with Google Looker Studio for ETL performance and data quality |
  | **Monitoring** | Monitor system health, metrics, logs, and real-time alerts |

- **Platform Features**: List of prominent features like Multi-Parameter Support, Dynamic Parameters, Automatic Schema Detection, Full ETL Pipeline, Flexible Scheduling, and Comprehensive Logging

### Main Menu

- **Dashboard**: Home page with system overview and quick navigation
- **API Connections**: Manage API connections and configure endpoints
- **Schedules**: Set up and manage automatic data collection schedules
- **Run History**: View execution history and logs of API runs
- **Data Explorer**: Browse and export extracted data
- **Field Mappings**: Configure mapping from API response to database schema
- **Analytics Dashboards**: Interactive dashboard with Google Looker Studio
- **Monitoring**: Monitor system health and real-time metrics
- **Reports**: Create and manage custom reports

---

## API Connection Management

### Creating New Connection

1. **Access "Connections" menu**
2. **Click "Create New Connection" button**
3. **Fill in connection information:**

   | Field | Description | Example |
   |-------|-------------|---------|
   | **Name** | Connection name (unique) | "Weather API" |
   | **Base URL** | API base URL | `https://api.weatherapi.com/v1` |
   | **Method** | HTTP method | GET, POST, PUT, DELETE |
   | **Headers** | HTTP headers (JSON) | `{"Authorization": "Bearer token"}` |
   | **Auth Type** | Authentication type | none, basic, bearer, api-key |
   | **Parameters** | Default query parameters | `{"key": "your-api-key"}` |
   | **Field Mappings** | Data field mapping | See section below |
   | **Table Name** | Data storage table name | "weather_data" |

4. **Test connection** using "Test Connection" button
5. **Save connection** using "Save" button

### Field Mappings Configuration

Field mappings allow you to map data from API response to database structure:

```json
{
  "temperature": "main.temp",
  "humidity": "main.humidity",
  "city": "name",
  "timestamp": "dt"
}
```

### Managing Existing Connections

- **Edit**: Edit connection information
- **Delete**: Delete connection (with confirmation)
- **Test**: Check if connection is working
- **View Data**: View collected data

---

## Schedule Management

### Creating New Schedule

1. **Select connection** to schedule
2. **Click "Create Schedule"**
3. **Configure schedule:**

   | Field | Description | Example |
   |-------|-------------|---------|
   | **Schedule Type** | Schedule type | daily, weekly, monthly, custom |
   | **Cron Expression** | Cron expression | `0 9 * * *` (9 AM daily) |
   | **Timezone** | Time zone | Asia/Ho_Chi_Minh |
   | **Description** | Description | "Collect weather data daily" |

4. **Save schedule**

### Schedule Types

- **Daily**: Run daily at fixed time
- **Weekly**: Run on specific days of the week
- **Monthly**: Run on specific day of the month
- **Custom**: Use custom cron expression

### Managing Schedules

- **Run Now**: Run immediately
- **Pause/Resume**: Pause/resume schedule
- **View History**: View run history
- **Delete**: Delete schedule

---

## API Runs Monitoring

### View Run History

1. **Access "Runs" menu**
2. **View list of all runs** with information:
   - Status (Success/Failed/Pending)
   - Start/End time
   - Connection name
   - Response size
   - Error messages (if any)

### Run Details (developing)

Click on a run to view details:
- **Request**: Information of sent request
- **Response**: Received data
- **Error**: Error information (if any)
- **Logs**: Detailed logs of the run process

### Retry Failed Runs

For failed runs: (developing)
1. **Click "Retry" button**
2. **System will create new run** with same configuration
3. **Monitor progress** in runs list

---

## Data Analytics (developing)

### Analytics Dashboard

The Analytics Dashboards page (/dashboards) provides interactive dashboard embedded from Google Looker Studio:

- **ETL Performance Dashboard**: Monitor API runs, data quality, and real-time system health
- **Auto-refresh**: Automatically updates every 5 minutes
- **Interactive Visualizations**: Interactive charts and metrics
- **Responsive Design**: Compatible with different devices

**How to access:**
1. From home page, click "Analytics Dashboards" card
2. Or access directly `/dashboards`
3. Dashboard will automatically load and display real-time data

### Reports and Analysis

All reports and data analysis are provided through **Analytics Dashboards** with Google Looker Studio:

- **Connection Performance Report**: Monitor API connection performance
- **Data Volume Report**: Statistics on processed data volume
- **Error Analysis Report**: Analyze errors and success rates
- **Schedule Efficiency Report**: Evaluate schedule effectiveness

**How to view reports:**
1. Access "Analytics Dashboards" from home page
2. Use interactive filters and controls in the dashboard
3. Data automatically refreshes to display real-time information

---

## Search and Filter Data(developing)

### Basic Search

1. **Access "Data Explorer"**
2. **Enter keywords** in the search box
3. **Select connection/table** to search

### Advanced Search

```json
{
  "query": "temperature > 30",
  "filters": [
    {"field": "city", "operator": "equals", "value": "Hanoi"},
    {"field": "date", "operator": "between", "value": ["2024-01-01", "2024-12-31"]}
  ],
  "sort": "timestamp",
  "order": "desc",
  "limit": 100
}
```

### Filters(developing)

- **Text filters**: contains, equals, starts_with, ends_with
- **Number filters**: equals, greater_than, less_than, between
- **Date filters**: equals, before, after, between
- **Boolean filters**: is_true, is_false

---

## Field Mappings Configuration(developing)

### Field Mappings Overview

Field Mappings allow you to configure how data from API response is mapped to database structure. This ensures data is stored in the correct format and can be queried efficiently.

### View Existing Field Mappings

1. **Access "Field Mappings" menu**
2. **View list of all mappings** with information:
   - Connection name
   - Number of mapped fields
   - Target table name
   - Last update time

### Configure Field Mapping

Field mappings are configured during connection creation/editing:

```json
{
  "mappings": [
    {
      "sourcePath": "main.temp",
      "targetField": "temperature",
      "dataType": "decimal",
      "required": true
    },
    {
      "sourcePath": "name",
      "targetField": "city_name",
      "dataType": "string",
      "required": true
    },
    {
      "sourcePath": "dt",
      "targetField": "timestamp",
      "dataType": "timestamp",
      "required": true
    }
  ]
}
```

### Data Types

- **string**: Text
- **integer**: Integer
- **decimal**: Decimal
- **boolean**: True/False
- **timestamp**: Time
- **json**: Complex JSON data

### Edit Field Mappings

1. **From Field Mappings page**, click "Edit Mapping"
2. **Or access corresponding connection** and edit
3. **Add/remove/modify fields** as needed
4. **Test mapping** with sample data
5. **Save changes**

---

## System Monitoring(developing)

### Monitoring Overview

The Monitoring page provides comprehensive view of ETL system health and performance with real-time and historical metrics.

### Key Metrics

- **System Status**: Uptime, memory usage, CPU usage
- **API Performance**: Success rate, response time, error rates
- **Data Volume**: Number of records processed, throughput
- **Connection Health**: Status of API connections

### View Real-time Metrics

1. **Access "Monitoring" menu**
2. **Select time period**: 1h, 24h, 7d, 30d
3. **View charts**:
   - Success Rate History
   - Request Volume
   - Response Time Trends
   - Error Distribution

### System Health Dashboard

- **Healthy**: All services operating normally
- **Warning**: Some metrics at warning levels
- **Critical**: Critical errors requiring immediate attention

### Alerts and Notifications

System automatically detects and displays alerts:
- Connection failures
- High error rates
- Performance degradation
- Resource exhaustion

### Troubleshooting with Monitoring

1. **Check system status** in "Overview" tab
2. **View error logs** in "Logs" tab
3. **Analyze performance trends** in "Performance" tab
4. **Monitor resource usage** in "Resources" tab

---

## Reports Management(developing)

### Reports Overview

The Reports page allows creating, managing, and exporting custom reports about system ETL activities.

### Create New Report

1. **Access "Reports" menu**
2. **Click "Create New Report"**
3. **Configure report**:

   | Field | Description | Example |
   |-------|-------------|---------|
   | **Name** | Report name | "Monthly Performance Report" |
   | **Type** | Report type | performance, data_quality, errors |
   | **Date Range** | Time period | Last 30 days |
   | **Filters** | Data filters | connection_id, status |
   | **Format** | Export format | PDF, CSV, Excel |

### Report Types

- **Performance Report**: API call performance statistics
- **Data Quality Report**: Data quality analysis
- **Error Analysis Report**: Detailed error reports
- **Usage Report**: System usage statistics

### Managing Reports

- **Generate**: Generate report immediately
- **View**: View generated report
- **Export**: Export report to file
- **Delete**: Delete old report
- **Schedule**: Automatically generate report periodically

### Automated Reports

1. **Create report schedule** in "Scheduled Reports" section
2. **Configure frequency**: daily, weekly, monthly
3. **Select recipients** to receive reports via email
4. **System automatically sends** reports on schedule

---

## Data Export (developing)

### Manual Data Export

1. **Select connection/table** to export
2. **Configure export**:
   - **Format**: JSON, CSV, XML
   - **Filters**: Apply filters
   - **Date Range**: Time period
   - **Include Metadata**: Include metadata information

3. **Click "Export"** and wait for processing
4. **Download file** when ready

### Automated Export

1. **Create export schedule** in "Exports" menu
2. **Configure frequency** (daily, weekly, monthly)
3. **Select format and filters**
4. **System automatically creates file** on schedule

---

## Dynamic Parameter Management (developing)

### Create Parameter Mode

1. **Access "Parameter Modes"**
2. **Click "Create New"**
3. **Configure**:

   | Type | Description | Example |
   |------|-------------|---------|
   | **Static** | Fixed value | `"api_key": "fixed_value"` |
   | **Dynamic** | Value changing by time | `"date": "{{current_date}}"` |
   | **Environment** | Get from environment variable | `"token": "{{env.API_TOKEN}}"` |
   | **Database** | Query from database | `"user_id": "{{query.user_id}}"` |

### Using Parameter Modes

1. **Assign parameter mode** to connection
2. **In API calls**, system will replace placeholders
3. **Example**: `{{current_date}}` → `2024-10-30`

---

## Airflow Integration

### Access Airflow UI

1. **Open http://localhost:8080**
2. **Login**: username: `airflow`, password: `airflow`

### DAG Management

- **DAGs are created automatically** from schedules in the system
- **Each schedule** corresponds to a DAG
- **Monitor execution** in Airflow UI
- **View logs** and troubleshoot errors

### Manual DAG Management

1. **In Airflow UI**, view DAGs list
2. **Trigger manual run** with "Trigger DAG" button
3. **Monitor progress** in Graph View
4. **Check logs** in Log tab

---

## Advanced Configuration

### Environment Variables

Create `.env` file in root directory:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dataplatform_db

# Airflow
AIRFLOW_FERNET_KEY=your-fernet-key-here

# Custom Ports
BACKEND_PORT=8000
FRONTEND_PORT=3000
```

### Database Configuration

- **MongoDB Atlas**: Use cloud database
- **PostgreSQL**: For Airflow metadata
- **Redis**: For caching and message queue

### Backup and Restore

#### Backup MongoDB Atlas
```bash
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/dataplatform_db" --out=./backup
```

#### Restore MongoDB Atlas
```bash
mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/dataplatform_db" ./backup/dataplatform_db
```

---

## Troubleshooting

### API Connection Failures

**Common causes:**
- API endpoint does not exist
- Incorrect authentication credentials
- Rate limiting
- Network issues

**Solutions:**
1. **Test connection** before saving
2. **Check logs** in Run details
3. **Verify credentials** and API documentation
4. **Check network connectivity**

### Schedule Not Running

**Causes:**
- Airflow scheduler not running
- Incorrect DAG configuration
- Timezone issues

**Solutions:**
1. **Check Airflow UI** for scheduler status
2. **Verify DAG exists** in DAGs list
3. **Check logs** in Airflow
4. **Restart Airflow services**

### Slow Performance

**Causes:**
- Unoptimized database queries
- Memory issues
- Large data volumes

**Solutions:**
1. **Add indexes** for database queries
2. **Implement pagination** for large datasets
3. **Use caching** for frequently accessed data
4. **Monitor resource usage**

### Database Connection Error

**Causes:**
- Incorrect MongoDB Atlas connection string
- Network restrictions
- Authentication issues

**Solutions:**
1. **Verify connection string** in docker-compose.yml
2. **Check MongoDB Atlas whitelist** IPs
3. **Test connection** from MongoDB Compass
4. **Check firewall settings**

---

## API Reference

### Base URL
```
http://localhost:8000/api/
```

### Authentication
- **Type**: Bearer Token (optional)
- **Header**: `Authorization: Bearer {token}`

### Response Format
```json
{
  "success": true,
  "data": {...},
  "message": "Success message",
  "timestamp": "2024-10-30T10:00:00Z"
}
```

### Error Response
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### Rate Limiting
- **Limit**: 1000 requests/hour per IP
- **Headers**:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

---

## Best Practices

### 1. **Connection Design**
- Use descriptive names
- Test connections before creating schedules
- Implement proper error handling
- Use appropriate authentication methods

### 2. **Schedule Management**
- Avoid overlapping schedules
- Monitor resource usage
- Set reasonable timeouts
- Use appropriate cron expressions

### 3. **Data Processing**
- Implement data validation
- Use appropriate data types
- Clean up old data regularly
- Backup critical data

### 4. **Security**
- Use strong authentication
- Rotate API keys regularly
- Implement IP whitelisting
- Monitor access logs

### 5. **Performance**
- Use pagination for large datasets
- Implement caching strategies
- Monitor system resources
- Optimize database queries

---

## Support

### Reference Documentation
- [API Documentation](./BACKEND_API_ENDPOINTS.md)
- [Docker Setup Guide](./DOCKER_README.md)
- [Frontend Components](./frontendphp/README.md)

### Support Contact
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Regularly updated
- **Community**: Discussion and experience sharing

### System Updates
```bash
# Pull latest changes
git pull origin main

# Rebuild containers
docker-compose build

# Restart services
docker-compose up -d
```

---

## Changelog

### Version 1.0.0 (October 2025)
- Initial release with full features
- Complete Docker containerization
- Airflow integration for scheduling
- MongoDB Atlas cloud database
- Comprehensive API endpoints
- User-friendly web interface
- Advanced analytics with Google Looker Studio
- Real-time monitoring and system health
- Field mappings for data transformation
- Custom reports and automated reporting
- Data export capabilities
- Parameter modes for dynamic configurations