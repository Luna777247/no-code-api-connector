// Initialize MongoDB collections and indexes for analytics
// This script sets up the collections optimized for Metabase queries

// Switch to the analytics database
use('metabase_analytics');

// Create collections with validation schema
db.createCollection("etl_runs_summary", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["runId", "connectionId", "status", "startedAt"],
         properties: {
            runId: {
               bsonType: "string",
               description: "must be a string and is required"
            },
            connectionId: {
               bsonType: "string", 
               description: "must be a string and is required"
            },
            status: {
               bsonType: "string",
               enum: ["success", "failed", "partial", "running"],
               description: "must be a valid status"
            },
            startedAt: {
               bsonType: "date",
               description: "must be a date and is required"
            }
         }
      }
   }
});

db.createCollection("connection_metrics", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["connectionId", "date"],
         properties: {
            connectionId: {
               bsonType: "string",
               description: "must be a string and is required"
            },
            date: {
               bsonType: "date", 
               description: "must be a date and is required"
            }
         }
      }
   }
});

// Create indexes for better query performance
db.etl_runs_summary.createIndex({ "connectionId": 1, "startedAt": -1 });
db.etl_runs_summary.createIndex({ "status": 1, "startedAt": -1 });
db.etl_runs_summary.createIndex({ "startedAt": -1 });
db.etl_runs_summary.createIndex({ "runId": 1 }, { unique: true });

db.connection_metrics.createIndex({ "connectionId": 1, "date": -1 });
db.connection_metrics.createIndex({ "date": -1 });

// Insert sample data for testing
db.etl_runs_summary.insertMany([
   {
      runId: "sample_run_1",
      connectionId: "jsonplaceholder_users", 
      connectionName: "JSONPlaceholder Users API",
      status: "success",
      startedAt: new Date(Date.now() - 86400000), // 1 day ago
      completedAt: new Date(Date.now() - 86340000),
      duration: 60000,
      totalRequests: 1,
      successfulRequests: 1,
      failedRequests: 0,
      recordsExtracted: 10,
      recordsLoaded: 10,
      airflowDagId: "etl_workflow_jsonplaceholder_users"
   },
   {
      runId: "sample_run_2", 
      connectionId: "rapidapi_places",
      connectionName: "RapidAPI Places",
      status: "success",
      startedAt: new Date(Date.now() - 43200000), // 12 hours ago
      completedAt: new Date(Date.now() - 43140000),
      duration: 45000,
      totalRequests: 1,
      successfulRequests: 1, 
      failedRequests: 0,
      recordsExtracted: 5,
      recordsLoaded: 5,
      airflowDagId: "etl_workflow_rapidapi_places"
   },
   {
      runId: "sample_run_3",
      connectionId: "jsonplaceholder_users",
      connectionName: "JSONPlaceholder Users API", 
      status: "failed",
      startedAt: new Date(Date.now() - 21600000), // 6 hours ago
      completedAt: new Date(Date.now() - 21540000),
      duration: 30000,
      totalRequests: 1,
      successfulRequests: 0,
      failedRequests: 1,
      recordsExtracted: 0,
      recordsLoaded: 0,
      errorMessage: "Connection timeout",
      airflowDagId: "etl_workflow_jsonplaceholder_users"
   }
]);

db.connection_metrics.insertMany([
   {
      connectionId: "jsonplaceholder_users",
      date: new Date(Date.now() - 86400000),
      totalRuns: 2,
      successfulRuns: 1,
      failedRuns: 1,
      avgDuration: 45000,
      totalRecordsExtracted: 10,
      totalRecordsLoaded: 10
   },
   {
      connectionId: "rapidapi_places", 
      date: new Date(Date.now() - 86400000),
      totalRuns: 1,
      successfulRuns: 1,
      failedRuns: 0,
      avgDuration: 45000,
      totalRecordsExtracted: 5,
      totalRecordsLoaded: 5
   }
]);

// Create a user for Metabase with read-only access
db.createUser({
   user: "metabase_reader",
   pwd: "metabase_read_password", 
   roles: [
      { role: "read", db: "metabase_analytics" }
   ]
});

print("MongoDB analytics collections initialized successfully!");