from pymongo import MongoClient
import os

client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
db = client[os.getenv('MONGODB_DATABASE', 'api_connector')]

print("Active schedules:")
schedules = list(db.api_schedules.find({'isActive': True}))
for s in schedules:
    print(f"  Schedule: {s.get('name')}, connectionId: {s.get('connectionId')}")

print("\nAll connections:")
connections = list(db.api_connections.find({}))
for c in connections:
    print(f"  Connection: {c.get('name')}, _id: {c.get('_id')}")