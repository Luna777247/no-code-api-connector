#!/usr/bin/env python3
"""
Comprehensive test script for Connection Management API endpoints
Tests all CRUD operations and connection testing
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

def test_get_connections():
    """Test GET /api/connections - List all connections"""
    print("\n" + "="*50)
    print("Testing GET /api/connections")
    print("="*50)

    result = make_request('GET', '/api/connections')
    if result:
        print(f"Found {len(result)} connections")
        if len(result) > 0:
            print("Sample connection:")
            print(json.dumps(result[0], indent=2, default=str))
    return result

def test_create_connection():
    """Test POST /api/connections - Create new connection"""
    print("\n" + "="*50)
    print("Testing POST /api/connections")
    print("="*50)

    connection_data = {
        "name": "Test API Connection",
        "baseUrl": "https://jsonplaceholder.typicode.com/posts",
        "method": "GET",
        "headers": {
            "Content-Type": "application/json",
            "User-Agent": "Test Script"
        },
        "auth": {
            "type": "none"
        }
    }

    print(f"Creating connection with data: {json.dumps(connection_data, indent=2)}")
    result = make_request('POST', '/api/connections', connection_data)

    if result and ('id' in result or '_id' in result):
        connection_id = result.get('id') or result.get('_id')
        print(f"✅ Created connection with ID: {connection_id}")
        return result
    else:
        print("❌ Failed to create connection")
        return None

def test_get_connection_by_id(connection_id):
    """Test GET /api/connections/{id} - Get connection by ID"""
    print("\n" + "="*50)
    print(f"Testing GET /api/connections/{connection_id}")
    print("="*50)

    result = make_request('GET', f'/api/connections/{connection_id}')
    if result:
        print("Connection details:")
        print(json.dumps(result, indent=2, default=str))
    return result

def test_update_connection_put(connection_id):
    """Test PUT /api/connections/{id} - Update connection"""
    print("\n" + "="*50)
    print(f"Testing PUT /api/connections/{connection_id}")
    print("="*50)

    update_data = {
        "name": "Updated Test API Connection",
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer test-token"
        }
    }

    print(f"Updating connection with data: {json.dumps(update_data, indent=2)}")
    result = make_request('PUT', f'/api/connections/{connection_id}', update_data)

    if result:
        print("✅ Connection updated successfully via PUT")
        # Verify the update by getting the connection again
        updated = make_request('GET', f'/api/connections/{connection_id}')
        if updated and updated.get('name') == "Updated Test API Connection":
            print("✅ Update verified - name changed correctly")
        else:
            print("⚠️ Update may not have been applied correctly")

    return result

def test_update_connection_post(connection_id):
    """Test POST /api/connections/{id} - Update connection (alternative method)"""
    print("\n" + "="*50)
    print(f"Testing POST /api/connections/{connection_id}")
    print("="*50)

    update_data = {
        "name": "Updated Test API Connection (POST method)",
        "baseUrl": "https://httpbin.org/post",
        "method": "POST"
    }

    print(f"Updating connection with data: {json.dumps(update_data, indent=2)}")
    result = make_request('POST', f'/api/connections/{connection_id}', update_data)

    if result:
        print("✅ Connection updated successfully via POST")
        # Verify the update by getting the connection again
        updated = make_request('GET', f'/api/connections/{connection_id}')
        if updated and updated.get('name') == "Updated Test API Connection (POST method)":
            print("✅ Update verified - name changed correctly")
        else:
            print("⚠️ Update may not have been applied correctly")

    return result

def test_test_connection():
    """Test POST /api/test-connection - Test connection before saving"""
    print("\n" + "="*50)
    print("Testing POST /api/test-connection")
    print("="*50)

    test_data = {
        "apiConfig": {
            "baseUrl": "https://jsonplaceholder.typicode.com/posts/1",
            "method": "GET",
            "headers": {
                "Accept": "application/json"
            }
        }
    }

    print(f"Testing connection with data: {json.dumps(test_data, indent=2)}")
    result = make_request('POST', '/api/test-connection', test_data)

    if result:
        print("Connection test response:")
        print(json.dumps(result, indent=2, default=str))
        if result.get('success') == True:
            print("✅ Connection test successful")
        else:
            print("⚠️ Connection test completed but may have failed")

    return result

def test_delete_connection(connection_id):
    """Test DELETE /api/connections/{id} - Delete connection"""
    print("\n" + "="*50)
    print(f"Testing DELETE /api/connections/{connection_id}")
    print("="*50)

    result = make_request('DELETE', f'/api/connections/{connection_id}')
    if result:
        print("✅ Connection deleted successfully")
        # Verify deletion by trying to get the connection
        verify = make_request('GET', f'/api/connections/{connection_id}')
        if verify is None or verify.get('error') == 'Not Found':
            print("✅ Deletion verified - connection no longer exists")
        else:
            print("⚠️ Deletion may not have been completed correctly")
    return result

def extract_connection_id(response):
    """Extract connection ID from various response formats"""
    if not response:
        return None

    # Try different possible ID fields
    for field in ['id', '_id', 'insertedId']:
        if field in response:
            value = response[field]
            if isinstance(value, str):
                return value
            elif isinstance(value, dict) and '$oid' in value:
                return value['$oid']

    return None

def main():
    """Main test function"""
    print("🧪 Testing Connection Management API Endpoints")
    print(f"Base URL: {BASE_URL}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Test counters
    tests_run = 0
    tests_passed = 0

    # 1. Test GET all connections
    tests_run += 1
    connections = test_get_connections()
    if connections is not None:
        tests_passed += 1

    # 2. Test POST create connection
    tests_run += 1
    new_connection = test_create_connection()
    if new_connection:
        connection_id = extract_connection_id(new_connection)
        if connection_id:
            tests_passed += 1
        else:
            print("❌ Cannot continue testing - connection creation failed (no ID extracted)")
            return
    else:
        print("❌ Cannot continue testing - connection creation failed")
        return

    # 3. Test GET connection by ID
    tests_run += 1
    if test_get_connection_by_id(connection_id):
        tests_passed += 1

    # 4. Test PUT update connection
    tests_run += 1
    if test_update_connection_put(connection_id):
        tests_passed += 1

    # 5. Test POST update connection (alternative)
    tests_run += 1
    if test_update_connection_post(connection_id):
        tests_passed += 1

    # 6. Test POST test-connection
    tests_run += 1
    if test_test_connection() is not None:
        tests_passed += 1

    # 7. Test DELETE connection
    tests_run += 1
    if test_delete_connection(connection_id):
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
        print("🎉 All Connection Management API tests PASSED!")
        return True
    else:
        print("❌ Some tests FAILED. Check output above for details.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)