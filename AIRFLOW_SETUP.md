# Apache Airflow Setup for No-Code API Connector

This document provides instructions for setting up Apache Airflow to handle ETL workflow scheduling for the No-Code API Connector.

## Overview

The project now integrates with Apache Airflow for robust, scalable workflow scheduling. Each API connection can be scheduled as an Airflow DAG with the following features:

- **Dynamic DAG Creation**: DAGs are automatically created for each API connection
- **CRON Scheduling**: Full support for CRON expressions
- **Error Handling**: Retry logic and failure notifications
- **Monitoring**: Full visibility through Airflow Web UI
- **Scalability**: Can handle hundreds of concurrent workflows

## Prerequisites

- Python 3.8+ installed on your system
- pip (Python package manager)
- The No-Code API Connector Next.js application running

## Installation Steps

### 1. Install Apache Airflow

```bash
# Create a virtual environment for Airflow
python -m venv airflow-env

# Activate the virtual environment
# On Windows:
airflow-env\Scripts\activate
# On macOS/Linux:
source airflow-env/bin/activate

# Set Airflow home directory
export AIRFLOW_HOME=$(pwd)/airflow
# On Windows PowerShell:
$env:AIRFLOW_HOME = "$PWD\airflow"

# Install Airflow with constraints for stable dependencies
pip install "apache-airflow==2.7.0" --constraint "https://raw.githubusercontent.com/apache/airflow/constraints-2.7.0/constraints-3.8.txt"

# Install additional packages for our ETL workflows
pip install requests python-dotenv
```

### 2. Initialize Airflow Database

```bash
# Initialize the Airflow database
airflow db init

# Create an admin user
airflow users create \
    --username airflow \
    --firstname Admin \
    --lastname User \
    --role Admin \
    --email admin@example.com \
    --password airflow
```

### 3. Configure Airflow

Copy the provided `airflow.cfg` configuration file to your Airflow home directory:

```bash
# Copy configuration (adjust path as needed)
cp airflow.cfg $AIRFLOW_HOME/airflow.cfg
```

Key configuration changes made:
- **DAGs folder**: Points to `./dags` directory in the project
- **Load examples**: Disabled to keep UI clean
- **Executor**: Uses LocalExecutor for better performance
- **Parallelism**: Set to handle multiple workflows

### 4. Set Up DAGs Directory

Create a symbolic link or copy the DAGs directory:

```bash
# Create symbolic link to project DAGs directory
ln -s $(pwd)/dags $AIRFLOW_HOME/dags

# On Windows (run as Administrator):
mklink /D "$env:AIRFLOW_HOME\dags" "$PWD\dags"

# Or simply copy the directory:
cp -r dags $AIRFLOW_HOME/dags
```

### 5. Environment Variables

Ensure your `.env.local` file contains the Airflow configuration:

```env
# Airflow Configuration
AIRFLOW_API_URL="http://localhost:8080/api/v1"
AIRFLOW_USERNAME="airflow"
AIRFLOW_PASSWORD="airflow"
NEXTJS_API_URL="http://localhost:3000"
```

## Running Airflow

### Start Airflow Services

You need to run two services: the web server and the scheduler.

**Terminal 1 - Web Server:**
```bash
# Activate virtual environment
airflow-env\Scripts\activate  # Windows
# source airflow-env/bin/activate  # macOS/Linux

# Start web server
airflow webserver --port 8080
```

**Terminal 2 - Scheduler:**
```bash
# Activate virtual environment
airflow-env\Scripts\activate  # Windows
# source airflow-env/bin/activate  # macOS/Linux

# Start scheduler
airflow scheduler
```

### Access Airflow UI

1. Open your browser to [http://localhost:8080](http://localhost:8080)
2. Login with:
   - Username: `airflow`
   - Password: `airflow`

## How It Works

### 1. Creating Scheduled Workflows

When you create a schedule in the No-Code API Connector:

1. **POST to `/api/scheduler`** creates a new Airflow DAG
2. **DAG file** is generated in the `dags/` directory
3. **Airflow automatically** picks up the new DAG within 5 seconds
4. **Workflow runs** according to the CRON schedule

### 2. DAG Structure

Each API connection gets its own DAG with these tasks:

- **execute_workflow**: Calls the Next.js `/api/execute-run` endpoint
- **health_check**: Performs a basic health check
- **send_notification**: Logs completion and can send alerts

### 3. Monitoring

- **Airflow UI**: View all DAGs, runs, logs, and performance metrics
- **Next.js App**: View schedules and basic status
- **Logs**: Detailed execution logs available in both systems

## Testing the Integration

### 1. Test Airflow Connection

```bash
# Test if Airflow API is accessible
curl -X GET "http://localhost:8080/api/v1/dags" \
     -H "Content-Type: application/json" \
     --user "airflow:airflow"
```

### 2. Create a Test Schedule

Use the Next.js app to create a new connection and schedule, or test via API:

```bash
curl -X POST "http://localhost:3000/api/scheduler" \
     -H "Content-Type: application/json" \
     -d '{
       "connectionId": "test-connection",
       "scheduleType": "daily",
       "cronExpression": "0 9 * * *",
       "workflowConfig": {
         "connectionId": "test-connection",
         "apiConfig": {
           "baseUrl": "https://jsonplaceholder.typicode.com/users",
           "method": "GET"
         },
         "parameters": [],
         "fieldMappings": []
       }
     }'
```

### 3. Manual Trigger

Test a workflow manually through Airflow UI:

1. Go to Airflow UI → DAGs
2. Find your DAG (e.g., `etl_workflow_test-connection`)
3. Click the "Play" button to trigger manually
4. Monitor execution in the Graph View

## Troubleshooting

### Common Issues

1. **"DAG not found"**
   - Check if the `dags/` directory is properly linked
   - Ensure Airflow scheduler is running
   - Wait up to 5 seconds for DAG discovery

2. **"Connection refused"**
   - Verify Airflow webserver is running on port 8080
   - Check firewall settings
   - Ensure correct credentials in `.env.local`

3. **"Task failed"**
   - Check if Next.js app is running on port 3000
   - Verify MongoDB connection
   - Review Airflow task logs for detailed errors

### Logs Location

- **Airflow Logs**: `$AIRFLOW_HOME/logs/`
- **Next.js Logs**: Console output and browser network tab
- **MongoDB Logs**: Check your MongoDB Atlas cluster logs

## Production Considerations

### Security
- Change default Airflow credentials
- Use proper authentication (LDAP, OAuth)
- Enable HTTPS for Airflow webserver
- Secure MongoDB connection string

### Scaling
- Use CeleryExecutor for distributed processing
- Set up Redis/RabbitMQ for message queuing
- Configure multiple Airflow workers
- Use managed MongoDB (Atlas) for better performance

### Monitoring
- Set up email/Slack notifications for failures
- Configure Airflow alerts and SLAs
- Monitor resource usage (CPU, memory, disk)
- Set up log aggregation (ELK stack, CloudWatch)

### Backup
- Backup Airflow metadata database regularly
- Version control your DAG files
- Backup MongoDB data and indexes
- Document your workflow configurations

## API Integration Details

### Scheduler Route (`/api/scheduler`)

The updated scheduler route now:
- Creates Airflow DAGs via the Airflow API
- Handles both Airflow success and fallback scenarios
- Returns schedule information including Airflow DAG ID
- Supports pausing/unpausing schedules

### Airflow Client (`lib/airflow-client.ts`)

Provides methods for:
- Creating and managing DAGs
- Triggering workflow runs
- Fetching DAG status and run history
- Health checking Airflow service

### DAG Template (`dags/etl_workflow_template.py`)

Template for creating dynamic DAGs that:
- Execute ETL workflows via Next.js API
- Handle errors and retries
- Send notifications on completion
- Support custom workflow configurations

## Next Steps

1. **Test the integration** with a simple API connection
2. **Monitor performance** and adjust Airflow configuration as needed
3. **Set up production deployment** with proper security and scaling
4. **Configure notifications** for workflow failures
5. **Implement advanced features** like workflow dependencies and data quality checks