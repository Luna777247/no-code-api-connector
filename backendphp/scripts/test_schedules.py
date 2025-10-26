#!/usr/bin/env python3
"""
Test script for Schedule Management API endpoints
Tests all CRUD operations for schedules
"""

import requests
import json
import sys
from datetime import datetime

BASE_URL = "http://localhost:8000"

def make_request(method, endpoint, data=None, params=None):
    """Make HTTP request to API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}

    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers, params=params)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=headers, json=data)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        print(f"\n{method.upper()} {endpoint}")
        print(f"Status Code: {response.status_code}")

        if response.status_code >= 200 and response.status_code < 300:
            print("✅ Success")
            try:
                return response.json()
            except:
                return response.text
        else:
            print("❌ Failed")
            print(f"Response: {response.text}")
            return None

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_get_schedules():
    """Test GET /api/schedules - List all schedules"""
    print("\n" + "="*50)
    print("Testing GET /api/schedules")
    print("="*50)

    result = make_request('GET', '/api/schedules')
    if result:
        print(f"Found {len(result)} schedules")
        if len(result) > 0:
            print("Sample schedule:")
            print(json.dumps(result[0], indent=2, default=str))
    return result

def test_create_schedule():
    """Test POST /api/schedules - Create new schedule"""
    print("\n" + "="*50)
    print("Testing POST /api/schedules")
    print("="*50)

    # First, get existing connections to use one
    connections = make_request('GET', '/api/connections')
    if not connections or len(connections) == 0:
        print("❌ No connections available. Please create a connection first.")
        return None

    connection = connections[0]  # Use first connection
    print(f"Using connection: {connection['name']} (ID: {connection['id']})")

    schedule_data = {
        "connectionId": connection['id'],
        "connectionName": connection['name'],
        "scheduleType": "cron",
        "cronExpression": "0 */4 * * *",  # Every 4 hours
        "description": "Test schedule created by API test script"
    }

    print(f"Creating schedule with data: {json.dumps(schedule_data, indent=2)}")
    result = make_request('POST', '/api/schedules', schedule_data)

    if result and 'id' in result:
        print(f"✅ Created schedule with ID: {result['id']}")
        return result
    else:
        print("❌ Failed to create schedule")
        return None

def test_get_schedule_by_id(schedule_id):
    """Test GET /api/schedules/{id} - Get schedule by ID"""
    print("\n" + "="*50)
    print(f"Testing GET /api/schedules/{schedule_id}")
    print("="*50)

    result = make_request('GET', f'/api/schedules/{schedule_id}')
    if result:
        print("Schedule details:")
        print(json.dumps(result, indent=2, default=str))
    return result

def test_update_schedule(schedule_id):
    """Test PUT /api/schedules/{id} - Update schedule"""
    print("\n" + "="*50)
    print(f"Testing PUT /api/schedules/{schedule_id}")
    print("="*50)

    update_data = {
        "cronExpression": "0 */6 * * *",  # Change to every 6 hours
        "description": "Updated test schedule - every 6 hours"
    }

    print(f"Updating schedule with data: {json.dumps(update_data, indent=2)}")
    result = make_request('PUT', f'/api/schedules/{schedule_id}', update_data)

    if result:
        print("✅ Schedule updated successfully")
        # Verify the update by getting the schedule again
        updated = make_request('GET', f'/api/schedules/{schedule_id}')
        if updated and updated.get('cronExpression') == "0 */6 * * *":
            print("✅ Update verified - cron expression changed correctly")
        else:
            print("⚠️ Update may not have been applied correctly")

    return result

def test_get_schedule_history(schedule_id):
    """Test GET /api/schedules/{id}/history - Get schedule history"""
    print("\n" + "="*50)
    print(f"Testing GET /api/schedules/{schedule_id}/history")
    print("="*50)

    result = make_request('GET', f'/api/schedules/{schedule_id}/history')
    if result is not None:
        if isinstance(result, list):
            print(f"Found {len(result)} history entries")
            if len(result) > 0:
                print("Sample history entry:")
                print(json.dumps(result[0], indent=2, default=str))
        else:
            print("History response:")
            print(json.dumps(result, indent=2, default=str))
    return result

def test_delete_schedule(schedule_id):
    """Test DELETE /api/schedules/{id} - Delete schedule"""
    print("\n" + "="*50)
    print(f"Testing DELETE /api/schedules/{schedule_id}")
    print("="*50)

    result = make_request('DELETE', f'/api/schedules/{schedule_id}')
    if result:
        print("✅ Schedule deleted successfully")
        # Verify deletion by trying to get the schedule
        verify = make_request('GET', f'/api/schedules/{schedule_id}')
        if verify is None:
            print("✅ Deletion verified - schedule no longer exists")
        else:
            print("⚠️ Deletion may not have been completed correctly")
    return result

def main():
    """Main test function"""
    print("🧪 Testing Schedule Management API Endpoints")
    print(f"Base URL: {BASE_URL}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Test counters
    tests_run = 0
    tests_passed = 0

    # 1. Test GET all schedules
    tests_run += 1
    schedules = test_get_schedules()
    if schedules is not None:
        tests_passed += 1

    # 2. Test POST create schedule
    tests_run += 1
    new_schedule = test_create_schedule()
    if new_schedule and 'id' in new_schedule:
        tests_passed += 1
        created_schedule_id = new_schedule['id']
    else:
        print("❌ Cannot continue testing - schedule creation failed")
        return

    # 3. Test GET schedule by ID
    tests_run += 1
    if test_get_schedule_by_id(created_schedule_id):
        tests_passed += 1

    # 4. Test PUT update schedule
    tests_run += 1
    if test_update_schedule(created_schedule_id):
        tests_passed += 1

    # 5. Test GET schedule history
    tests_run += 1
    if test_get_schedule_history(created_schedule_id) is not None:
        tests_passed += 1

    # 6. Test DELETE schedule
    tests_run += 1
    if test_delete_schedule(created_schedule_id):
        tests_passed += 1

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Tests Run: {tests_run}")
    print(f"Tests Passed: {tests_passed}")
    print(f"Tests Failed: {tests_run - tests_passed}")
    print(".1f")

    if tests_passed == tests_run:
        print("🎉 All Schedule Management API tests PASSED!")
        return True
    else:
        print("❌ Some tests FAILED. Check output above for details.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)