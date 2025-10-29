#!/bin/bash
set -e

# Wait for MongoDB to start
sleep 10

echo "Initializing MongoDB database..."

# Create collections and indexes
mongosh --host localhost -u admin -p password123 --authenticationDatabase admin dataplatform_db <<EOF
db.createCollection("api_connections");
db.createCollection("api_runs");
db.createCollection("api_schedules");
db.createCollection("parameter_modes");

// Create indexes
db.api_connections.createIndex({ "name": 1 });
db.api_runs.createIndex({ "connectionId": 1, "createdAt": -1 });
db.api_runs.createIndex({ "scheduleId": 1 });
db.api_schedules.createIndex({ "connectionId": 1 });
db.parameter_modes.createIndex({ "name": 1 });

// Insert sample data
db.api_connections.insertMany([
  {
    name: "JSONPlaceholder Users API",
    baseUrl: "https://jsonplaceholder.typicode.com/users",
    method: "GET",
    headers: { Accept: "application/json" },
    description: "Sample API for testing",
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("Database initialized successfully!");
EOF

echo "MongoDB initialization complete!"