#!/usr/bin/env python3
"""
Comprehensive test script for Data Export API endpoints
Tests all 2 endpoints in the Data Export category
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

def test_data_export_create():
    """Test POST /api/data/export - create export job"""
    print("\n🧪 Testing Data Export Create (/api/data/export)")

    # Test with JSON format
    export_data = {
        "format": "json",
        "filters": [
            {
                "field": "status",
                "operator": "equals",
                "value": "active"
            }
        ],
        "dateRange": {
            "start": "2025-01-01",
            "end": "2025-12-31"
        },
        "includeMetadata": True
    }

    response = make_request('POST', '/api/data/export', data=export_data)

    if not response:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['exportId', 'status', 'estimatedTime']
            if all(field in data for field in required_fields):
                print("✅ Data export create endpoint returned expected structure")
                print(f"   Export ID: {data.get('exportId', 'N/A')}")
                print(f"   Status: {data.get('status', 'N/A')}")
                print(f"   Estimated time: {data.get('estimatedTime', 'N/A')}")
                print(f"   Record count: {data.get('recordCount', 'N/A')}")
                print(f"   Format: {data.get('format', 'N/A')}")

                # Store export ID for download test
                global last_export_id
                last_export_id = data.get('exportId')
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

def test_data_export_download():
    """Test GET /api/data/export/{id} - download exported file"""
    print("\n🧪 Testing Data Export Download (/api/data/export/{id})")

    # Use the export ID from the create test, or use a mock ID
    export_id = getattr(sys.modules[__name__], 'last_export_id', 'mock_export_123')

    response = make_request('GET', f'/api/data/export/{export_id}')

    if not response:
        return False

    if response.status_code == 200:
        # Check content type and disposition
        content_type = response.headers.get('Content-Type', '')
        content_disposition = response.headers.get('Content-Disposition', '')

        print("✅ Data export download endpoint returned file")
        print(f"   Content-Type: {content_type}")
        print(f"   Content-Disposition: {content_disposition}")

        # Try to parse as JSON to validate structure
        try:
            if 'application/json' in content_type:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    print("✅ Downloaded file contains valid JSON data")
                    print(f"   Records in file: {len(data)}")
                    return True
                elif isinstance(data, dict) and 'data' in data:
                    print("✅ Downloaded file contains valid JSON data with metadata")
                    print(f"   Records in file: {len(data.get('data', []))}")
                    return True
                else:
                    print(f"❌ Unexpected JSON structure: {type(data)}")
                    return False
            else:
                print(f"ℹ️  File downloaded with content type: {content_type}")
                print(f"   File size: {len(response.content)} bytes")
                return True
        except json.JSONDecodeError:
            print("ℹ️  File downloaded but not valid JSON (may be CSV or other format)")
            print(f"   File size: {len(response.content)} bytes")
            return True
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_data_export_formats():
    """Test different export formats"""
    print("\n🧪 Testing Different Export Formats")

    formats = ['json', 'csv']
    results = []

    for fmt in formats:
        print(f"\n   Testing format: {fmt}")
        export_data = {
            "format": fmt,
            "includeMetadata": False
        }

        response = make_request('POST', '/api/data/export', data=export_data)

        if response and response.status_code == 200:
            try:
                data = response.json()
                if data.get('format') == fmt:
                    print(f"   ✅ {fmt} format export successful")
                    results.append(True)
                else:
                    print(f"   ❌ {fmt} format mismatch")
                    results.append(False)
            except:
                print(f"   ❌ {fmt} format response error")
                results.append(False)
        else:
            print(f"   ❌ {fmt} format request failed")
            results.append(False)

    return all(results)

def main():
    """Run all Data Export endpoint tests"""
    print("📤 Starting Data Export API Tests")
    print("=" * 50)

    # Track test results
    results = []
    endpoints = [
        ("Create Export Job", test_data_export_create),
        ("Download Exported File", test_data_export_download),
        ("Multiple Export Formats", test_data_export_formats)
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
    print("📊 TEST SUMMARY - Data Export Endpoints")
    print("=" * 50)

    passed = 0
    total = len(results)

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {name}")
        if success:
            passed += 1

    print(f"\n📈 Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All Data Export endpoints are working correctly!")
        return 0
    else:
        print("⚠️  Some endpoints failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())