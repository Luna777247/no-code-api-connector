#!/usr/bin/env python3
"""
Test script for Parameter Mode Management API endpoints.
Tests CRUD operations for parameter modes.

Usage:
    python test_parameter_modes.py

The script will:
- Test GET /api/parameter-modes (list all)
- Test POST /api/parameter-modes (create new)
- Test GET /api/parameter-modes/{id} (get by ID)
- Test PUT /api/parameter-modes/{id} (update)
- Test DELETE /api/parameter-modes/{id} (delete)

Environment variables:
- BACKEND_URL: Backend API URL (default: http://localhost:8000)
"""

import os
import sys
import json
import requests
from typing import Dict, Any, Optional

# Configuration
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:8000').rstrip('/')

def make_request(method: str, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Make HTTP request to backend API"""
    url = f"{BACKEND_URL}{endpoint}"
    headers = {'Content-Type': 'application/json'}

    try:
        if method.upper() == 'GET':
            response = requests.get(url, headers=headers)
        elif method.upper() == 'POST':
            response = requests.post(url, headers=headers, json=data)
        elif method.upper() == 'PUT':
            response = requests.put(url, headers=headers, json=data)
        elif method.upper() == 'DELETE':
            response = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Unsupported method: {method}")

        result = {
            'status': response.status_code,
            'ok': response.status_code < 400,
            'data': None,
            'error': None
        }

        try:
            result['data'] = response.json()
        except:
            result['data'] = response.text

        if not result['ok']:
            result['error'] = result['data']

        return result

    except requests.RequestException as e:
        return {
            'status': None,
            'ok': False,
            'data': None,
            'error': str(e)
        }

def test_list_parameter_modes():
    """Test GET /api/parameter-modes"""
    print("Testing GET /api/parameter-modes")
    result = make_request('GET', '/api/parameter-modes')

    if result['ok']:
        print(f"✅ SUCCESS: {result['status']} - Found {len(result['data'])} parameter modes")
        return result['data']
    else:
        print(f"❌ FAILED: {result['status']} - {result['error']}")
        return []

def test_create_parameter_mode():
    """Test POST /api/parameter-modes"""
    print("\nTesting POST /api/parameter-modes")

    test_data = {
        "name": "Test Static Parameter",
        "type": "static",
        "description": "A test parameter mode for static values",
        "config": {
            "defaultValue": "test_value",
            "dataType": "string"
        }
    }

    result = make_request('POST', '/api/parameter-modes', test_data)

    if result['ok']:
        print(f"✅ SUCCESS: {result['status']} - Created parameter mode")
        print(f"   ID: {result['data'].get('id')}")
        print(f"   Name: {result['data'].get('name')}")
        return result['data']
    else:
        print(f"❌ FAILED: {result['status']} - {result['error']}")
        return None

def test_get_parameter_mode(mode_id: str):
    """Test GET /api/parameter-modes/{id}"""
    print(f"\nTesting GET /api/parameter-modes/{mode_id}")
    result = make_request('GET', f'/api/parameter-modes/{mode_id}')

    if result['ok']:
        print(f"✅ SUCCESS: {result['status']} - Retrieved parameter mode")
        print(f"   Name: {result['data'].get('name')}")
        return result['data']
    else:
        print(f"❌ FAILED: {result['status']} - {result['error']}")
        return None

def test_update_parameter_mode(mode_id: str):
    """Test PUT /api/parameter-modes/{id}"""
    print(f"\nTesting PUT /api/parameter-modes/{mode_id}")

    update_data = {
        "name": "Updated Test Static Parameter",
        "description": "Updated description for test parameter mode",
        "config": {
            "defaultValue": "updated_test_value",
            "dataType": "string",
            "required": True
        }
    }

    result = make_request('PUT', f'/api/parameter-modes/{mode_id}', update_data)

    if result['ok']:
        print(f"✅ SUCCESS: {result['status']} - Updated parameter mode")
        print(f"   Name: {result['data'].get('name')}")
        return result['data']
    else:
        print(f"❌ FAILED: {result['status']} - {result['error']}")
        return None

def test_delete_parameter_mode(mode_id: str):
    """Test DELETE /api/parameter-modes/{id}"""
    print(f"\nTesting DELETE /api/parameter-modes/{mode_id}")
    result = make_request('DELETE', f'/api/parameter-modes/{mode_id}')

    if result['ok']:
        print(f"✅ SUCCESS: {result['status']} - Deleted parameter mode")
        return True
    else:
        print(f"❌ FAILED: {result['status']} - {result['error']}")
        return False

def main():
    """Run all parameter mode tests"""
    print("🧪 Testing Parameter Mode Management API")
    print(f"📍 Backend URL: {BACKEND_URL}")
    print("=" * 50)

    # Test listing
    existing_modes = test_list_parameter_modes()

    # Test creation
    created_mode = test_create_parameter_mode()
    if not created_mode:
        print("\n❌ Cannot continue tests without successful creation")
        return

    mode_id = created_mode.get('id')
    if not mode_id:
        print("\n❌ Cannot continue tests without valid ID")
        return

    # Test retrieval
    test_get_parameter_mode(mode_id)

    # Test update
    test_update_parameter_mode(mode_id)

    # Test deletion
    test_delete_parameter_mode(mode_id)

    print("\n" + "=" * 50)
    print("🏁 Parameter Mode API tests completed!")

if __name__ == '__main__':
    main()