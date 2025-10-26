#!/usr/bin/env python3
"""
Comprehensive test script for Data & Analytics API endpoints
Tests all 6 endpoints in the Data & Analytics category
"""

import requests
import json
import sys
from datetime import datetime, timedelta

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

def test_data_endpoint():
    """Test GET /api/data - aggregated statistics"""
    print("\n🧪 Testing Data Endpoint (/api/data)")
    response = make_request('GET', '/api/data')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['summary', 'connectionBreakdown']
            if all(field in data for field in required_fields):
                print("✅ Data endpoint returned expected structure")
                summary = data.get('summary', {})
                print(f"   Total runs: {summary.get('totalRuns', 'N/A')}")
                print(f"   Total records: {summary.get('totalRecords', 'N/A')}")
                print(f"   Connection breakdown: {len(data.get('connectionBreakdown', []))} connections")
                return True
            else:
                print(f"❌ Missing required fields in response: {data.keys()}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_mappings_endpoint():
    """Test GET /api/mappings - connection-to-table mappings"""
    print("\n🧪 Testing Mappings Endpoint (/api/mappings)")
    response = make_request('GET', '/api/mappings')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            # Mappings should be an object with a "mappings" array
            if isinstance(data, dict) and 'mappings' in data:
                mappings = data['mappings']
                print(f"✅ Mappings endpoint returned {len(mappings)} mapping(s)")
                if mappings:
                    sample = mappings[0]
                    expected_fields = ['id', 'connectionName', 'tableName', 'fieldCount', 'lastUpdated']
                    if all(field in sample for field in expected_fields):
                        print("✅ Mapping structure is correct")
                        return True
                    else:
                        print(f"❌ Missing fields in mapping: {sample.keys()}")
                        return False
                else:
                    print("ℹ️  No mappings found (empty array)")
                    return True
            else:
                print(f"❌ Expected object with 'mappings' field, got: {type(data)}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_status_endpoint():
    """Test GET /api/status - system health metrics"""
    print("\n🧪 Testing Status Endpoint (/api/status)")
    response = make_request('GET', '/api/status')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['uptime', 'connections', 'schedules', 'runs', 'activity', 'performance']
            if all(field in data for field in required_fields):
                print("✅ Status endpoint returned expected structure")
                print(f"   Uptime: {data.get('uptime', 'N/A')}")
                print(f"   Active connections: {data.get('connections', {}).get('active', 'N/A')}")
                print(f"   Total runs: {data.get('runs', {}).get('total', 'N/A')}")
                print(f"   Success rate: {data.get('activity', {}).get('successRate', 'N/A')}%")
                return True
            else:
                print(f"❌ Missing required fields in response: {data.keys()}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_analytics_success_rate_history():
    """Test GET /api/analytics/success-rate-history - success rate over time"""
    print("\n🧪 Testing Analytics Success Rate History (/api/analytics/success-rate-history)")

    # Test with default parameters
    response = make_request('GET', '/api/analytics/success-rate-history')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            # Should return object with "data" array of data points
            if isinstance(data, dict) and 'data' in data:
                history_data = data['data']
                print(f"✅ Success rate history returned {len(history_data)} data point(s)")
                if history_data:
                    sample = history_data[0]
                    expected_fields = ['date', 'successRate']
                    if all(field in sample for field in expected_fields):
                        print("✅ Data point structure is correct")
                        # Check if success rates are reasonable (0-100)
                        rates = [point.get('successRate', -1) for point in history_data]
                        valid_rates = all(0 <= rate <= 100 for rate in rates if rate >= 0)
                        if valid_rates:
                            print("✅ Success rates are within valid range (0-100%)")
                            return True
                        else:
                            print("❌ Invalid success rates found")
                            return False
                    else:
                        print(f"❌ Missing fields in data point: {sample.keys()}")
                        return False
                else:
                    print("ℹ️  No historical data found (empty array)")
                    return True
            else:
                print(f"❌ Expected object with 'data' field, got: {type(data)}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_analytics_charts():
    """Test GET /api/analytics/charts - chart metadata"""
    print("\n🧪 Testing Analytics Charts (/api/analytics/charts)")
    response = make_request('GET', '/api/analytics/charts')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['available_charts', 'chart_types', 'timestamp']
            if all(field in data for field in required_fields):
                print("✅ Charts endpoint returned expected structure")
                print(f"   Available charts: {len(data.get('available_charts', []))}")
                print(f"   Chart types: {len(data.get('chart_types', []))}")
                return True
            else:
                print(f"❌ Missing required fields in response: {data.keys()}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_analytics_metrics():
    """Test GET /api/analytics/metrics - system metrics"""
    print("\n🧪 Testing Analytics Metrics (/api/analytics/metrics)")
    response = make_request('GET', '/api/analytics/metrics')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['total_connections', 'active_connections', 'total_runs_today', 'success_rate_today', 'last_updated']
            if all(field in data for field in required_fields):
                print("✅ Metrics endpoint returned expected structure")
                print(f"   Total connections: {data.get('total_connections', 'N/A')}")
                print(f"   Active connections: {data.get('active_connections', 'N/A')}")
                print(f"   Today's success rate: {data.get('success_rate_today', 'N/A')}%")
                return True
            else:
                print(f"❌ Missing required fields in response: {data.keys()}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def main():
    """Run all Data & Analytics endpoint tests"""
    print("🚀 Starting Data & Analytics API Tests")
    print("=" * 50)

    # Track test results
    results = []
    endpoints = [
        ("Data Statistics", test_data_endpoint),
        ("Connection Mappings", test_mappings_endpoint),
        ("System Status", test_status_endpoint),
        ("Success Rate History", test_analytics_success_rate_history),
        ("Chart Metadata", test_analytics_charts),
        ("System Metrics", test_analytics_metrics)
    ]

    for name, test_func in endpoints:
        try:
            success = test_func()
            results.append((name, success))
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            results.append((name, False))

    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY - Data & Analytics Endpoints")
    print("=" * 50)

    passed = 0
    total = len(results)

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {name}")
        if success:
            passed += 1

    print(f"\n📈 Results: {passed}/{total} endpoints passed")

    if passed == total:
        print("🎉 All Data & Analytics endpoints are working correctly!")
        return 0
    else:
        print("⚠️  Some endpoints failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())