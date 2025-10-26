#!/usr/bin/env python3
"""
Comprehensive test script for Search & Filtering API endpoints
Tests all 3 endpoints in the Advanced Search & Filtering category
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

def test_data_search():
    """Test POST /api/data/search - advanced search in data"""
    print("\n🧪 Testing Data Search (/api/data/search)")

    # Test with basic search query
    search_data = {
        "query": "test",
        "filters": [],
        "page": 1,
        "limit": 10,
        "sort": "createdAt",
        "order": "desc"
    }

    response = make_request('POST', '/api/data/search', data=search_data)

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['results', 'total', 'pagination', 'query', 'filters']
            if all(field in data for field in required_fields):
                print("✅ Data search endpoint returned expected structure")
                pagination = data.get('pagination', {})
                print(f"   Total results: {data.get('total', 'N/A')}")
                print(f"   Current page: {pagination.get('page', 'N/A')}")
                print(f"   Results per page: {pagination.get('limit', 'N/A')}")
                print(f"   Query: {data.get('query', 'N/A')}")
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

def test_data_columns():
    """Test GET /api/data/columns - get list of searchable columns"""
    print("\n🧪 Testing Data Columns (/api/data/columns)")
    response = make_request('GET', '/api/data/columns')

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            # Should return array of column objects
            if isinstance(data, list) and len(data) > 0:
                print(f"✅ Data columns endpoint returned {len(data)} columns")
                sample = data[0]
                expected_fields = ['name', 'type', 'searchable', 'filterable']
                if all(field in sample for field in expected_fields):
                    print("✅ Column structure is correct")
                    # Check that columns include expected ones
                    column_names = [col.get('name') for col in data]
                    expected_columns = ['id', 'name', 'description', 'createdAt', 'updatedAt']
                    if any(col in column_names for col in expected_columns):
                        print("✅ Contains expected column types")
                        return True
                    else:
                        print(f"❌ Missing expected columns. Found: {column_names}")
                        return False
                else:
                    print(f"❌ Missing fields in column object: {sample.keys()}")
                    return False
            else:
                print(f"❌ Expected non-empty array, got: {type(data)} with length {len(data) if isinstance(data, list) else 'N/A'}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_data_filter():
    """Test POST /api/data/filter - filter data by conditions"""
    print("\n🧪 Testing Data Filter (/api/data/filter)")

    # Test with filter conditions
    filter_data = {
        "filters": [
            {
                "field": "status",
                "operator": "equals",
                "value": "active"
            },
            {
                "field": "createdAt",
                "operator": "greaterThan",
                "value": "2025-01-01"
            }
        ],
        "sort": "createdAt",
        "limit": 20
    }

    response = make_request('POST', '/api/data/filter', data=filter_data)

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['results', 'total', 'filters']
            if all(field in data for field in required_fields):
                print("✅ Data filter endpoint returned expected structure")
                print(f"   Total filtered results: {data.get('total', 'N/A')}")
                print(f"   Number of filters applied: {len(data.get('filters', []))}")
                print(f"   Sort field: {data.get('sort', 'N/A')}")
                print(f"   Limit: {data.get('limit', 'N/A')}")
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
    """Run all Search & Filtering endpoint tests"""
    print("🔍 Starting Search & Filtering API Tests")
    print("=" * 50)

    # Track test results
    results = []
    endpoints = [
        ("Advanced Data Search", test_data_search),
        ("Searchable Columns", test_data_columns),
        ("Data Filtering", test_data_filter)
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
    print("📊 TEST SUMMARY - Search & Filtering Endpoints")
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
        print("🎉 All Search & Filtering endpoints are working correctly!")
        return 0
    else:
        print("⚠️  Some endpoints failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())