#!/usr/bin/env python3
"""
Comprehensive test script for Airflow Integration API endpoints
Tests all 5 endpoints in the Airflow Integration category
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
HEADERS = {'Content-Type': 'application/json'}

def make_request(method, endpoint, data=None, params=None):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=HEADERS, params=params)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=HEADERS, json=data)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=HEADERS, json=data)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=HEADERS)
        else:
            print(f"❌ Unsupported method: {method}")
            return None

        print(f"📡 {method} {endpoint} -> {response.status_code}")
        return response

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_airflow_trigger_run():
    """Test POST /api/schedules/{id}/trigger - trigger DAG run"""
    print("\n🧪 Testing Airflow Trigger Run (/api/schedules/{id}/trigger)")

    # Use a mock schedule ID
    schedule_id = 'test_schedule_123'

    response = make_request('POST', f'/api/schedules/{schedule_id}/trigger')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            if data.get('success') == True:
                print("✅ Airflow trigger run endpoint returned expected structure")
                print(f"   DAG Run ID: {data.get('dagRunId', 'N/A')}")
                print(f"   State: {data.get('state', 'N/A')}")
                print(f"   Message: {data.get('message', 'N/A')}")
                return True
            else:
                print(f"❌ Expected 'success: true' in response, got: {data}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_airflow_get_status():
    """Test GET /api/schedules/{id}/airflow-status - get DAG status"""
    print("\n🧪 Testing Airflow Get Status (/api/schedules/{id}/airflow-status)")

    # Use a mock schedule ID
    schedule_id = 'test_schedule_123'

    response = make_request('GET', f'/api/schedules/{schedule_id}/airflow-status')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            # Status response structure may vary, just check it's valid JSON
            print("✅ Airflow get status endpoint returned valid response")
            print(f"   Response type: {type(data)}")
            if isinstance(data, dict):
                print(f"   Keys: {list(data.keys())[:5]}...")  # Show first 5 keys
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_airflow_get_history():
    """Test GET /api/schedules/{id}/airflow-history - get DAG run history"""
    print("\n🧪 Testing Airflow Get History (/api/schedules/{id}/airflow-history)")

    # Use a mock schedule ID
    schedule_id = 'test_schedule_123'

    response = make_request('GET', f'/api/schedules/{schedule_id}/airflow-history')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            # History response structure may vary, just check it's valid JSON
            print("✅ Airflow get history endpoint returned valid response")
            print(f"   Response type: {type(data)}")
            if isinstance(data, list):
                print(f"   Number of history items: {len(data)}")
            elif isinstance(data, dict):
                print(f"   Keys: {list(data.keys())[:5]}...")  # Show first 5 keys
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_airflow_pause():
    """Test POST /api/schedules/{id}/pause - pause schedule"""
    print("\n🧪 Testing Airflow Pause (/api/schedules/{id}/pause)")

    # Use a mock schedule ID
    schedule_id = 'test_schedule_123'

    response = make_request('POST', f'/api/schedules/{schedule_id}/pause')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            if data.get('success') == True:
                print("✅ Airflow pause endpoint returned expected structure")
                print(f"   Message: {data.get('message', 'N/A')}")
                return True
            else:
                print(f"❌ Expected 'success: true' in response, got: {data}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_airflow_resume():
    """Test POST /api/schedules/{id}/resume - resume schedule"""
    print("\n🧪 Testing Airflow Resume (/api/schedules/{id}/resume)")

    # Use a mock schedule ID
    schedule_id = 'test_schedule_123'

    response = make_request('POST', f'/api/schedules/{schedule_id}/resume')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            if data.get('success') == True:
                print("✅ Airflow resume endpoint returned expected structure")
                print(f"   Message: {data.get('message', 'N/A')}")
                return True
            else:
                print(f"❌ Expected 'success: true' in response, got: {data}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def main():
    """Run all Airflow Integration API tests"""
    print("🚀 Starting Airflow Integration API Tests")
    print("=" * 50)

    # Run all tests
    results = []
    results.append(test_airflow_trigger_run())
    results.append(test_airflow_get_status())
    results.append(test_airflow_get_history())
    results.append(test_airflow_pause())
    results.append(test_airflow_resume())

    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY - Airflow Integration Endpoints")
    print("=" * 50)

    passed = sum(results)
    total = len(results)

    print(f"✅ PASS Trigger Run: {'PASS' if results[0] else 'FAIL'}")
    print(f"✅ PASS Get Status: {'PASS' if results[1] else 'FAIL'}")
    print(f"✅ PASS Get History: {'PASS' if results[2] else 'FAIL'}")
    print(f"✅ PASS Pause: {'PASS' if results[3] else 'FAIL'}")
    print(f"✅ PASS Resume: {'PASS' if results[4] else 'FAIL'}")

    print(f"\n📈 Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All Airflow Integration endpoints are working correctly!")
        return 0
    else:
        print("⚠️  Some endpoints failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())