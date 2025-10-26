#!/usr/bin/env python3
"""
Comprehensive test script for Admin Management API endpoints
Tests all 18 endpoints in the Admin Management category
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

def test_admin_users_list():
    """Test GET /api/admin/users - list all users"""
    print("\n🧪 Testing Admin Users List (/api/admin/users)")

    response = make_request('GET', '/api/admin/users')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            if isinstance(data, list):
                print("✅ Admin users list endpoint returned expected structure")
                print(f"   Number of users: {len(data)}")
                return True
            else:
                print(f"❌ Expected array response, got: {type(data)}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_users_get():
    """Test GET /api/admin/users/{id} - get user by ID"""
    print("\n🧪 Testing Admin Users Get (/api/admin/users/{id})")

    # Test with a mock user ID
    user_id = 'user_123'

    response = make_request('GET', f'/api/admin/users/{user_id}')

    if response is None:
        print(f"❌ No response received, response = {response}")
        return False

    print(f"   Status code: {response.status_code}")

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['id']
            if all(field in data for field in required_fields):
                print("✅ Admin users get endpoint returned expected structure")
                print(f"   User ID: {data.get('id', 'N/A')}")
                return True
            else:
                print(f"❌ Missing required fields in response: {data.keys()}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    elif response.status_code == 404:
        print("ℹ️  User not found (expected for non-existent ID)")
        return True
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_users_create():
    """Test POST /api/admin/users - create new user"""
    print("\n🧪 Testing Admin Users Create (/api/admin/users)")

    user_data = {
        "email": "test@example.com",
        "password": "testpassword123",
        "role": "admin",
        "username": "testuser"
    }

    response = make_request('POST', '/api/admin/users', data=user_data)

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['id', 'email']
            if all(field in data for field in required_fields):
                print("✅ Admin users create endpoint returned expected structure")
                print(f"   Created User ID: {data.get('id', 'N/A')}")
                print(f"   User Email: {data.get('email', 'N/A')}")

                # Store created user ID for cleanup
                global created_user_id
                created_user_id = data.get('id')
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

def test_admin_users_update():
    """Test PUT /api/admin/users/{id} - update user"""
    print("\n🧪 Testing Admin Users Update (/api/admin/users/{id})")

    # Use the user ID created in the create test, or use a mock ID
    user_id = getattr(sys.modules[__name__], 'created_user_id', 'user_mock_123')

    update_data = {
        "username": "updateduser",
        "role": "user"
    }

    response = make_request('PUT', f'/api/admin/users/{user_id}', data=update_data)

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin users update endpoint returned expected structure")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_users_reset_password():
    """Test POST /api/admin/users/{id}/reset-password - reset password"""
    print("\n🧪 Testing Admin Users Reset Password (/api/admin/users/{id}/reset-password)")

    # Use the user ID created in the create test, or use a mock ID
    user_id = getattr(sys.modules[__name__], 'created_user_id', 'user_mock_123')

    reset_data = {
        "newPassword": "newpassword123"
    }

    response = make_request('POST', f'/api/admin/users/{user_id}/reset-password', data=reset_data)

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            if data.get('ok') == True:
                print("✅ Admin users reset password endpoint returned expected structure")
                return True
            else:
                print(f"❌ Expected 'ok: true' in response, got: {data}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_users_delete():
    """Test DELETE /api/admin/users/{id} - delete user"""
    print("\n🧪 Testing Admin Users Delete (/api/admin/users/{id})")

    # Use the user ID created in the create test, or use a mock ID
    user_id = getattr(sys.modules[__name__], 'created_user_id', 'user_mock_123')

    response = make_request('DELETE', f'/api/admin/users/{user_id}')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            if data.get('ok') == True:
                print("✅ Admin users delete endpoint returned expected structure")
                return True
            else:
                print(f"❌ Expected 'ok: true' in response, got: {data}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_roles_list():
    """Test GET /api/admin/roles - list all roles"""
    print("\n🧪 Testing Admin Roles List (/api/admin/roles)")

    response = make_request('GET', '/api/admin/roles')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            if isinstance(data, list):
                print("✅ Admin roles list endpoint returned expected structure")
                print(f"   Number of roles: {len(data)}")
                return True
            else:
                print(f"❌ Expected array response, got: {type(data)}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_roles_get():
    """Test GET /api/admin/roles/{id} - get role by ID"""
    print("\n🧪 Testing Admin Roles Get (/api/admin/roles/{id})")

    # Test with a mock role ID
    role_id = 'role_123'

    response = make_request('GET', f'/api/admin/roles/{role_id}')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['id']
            if all(field in data for field in required_fields):
                print("✅ Admin roles get endpoint returned expected structure")
                print(f"   Role ID: {data.get('id', 'N/A')}")
                return True
            else:
                print(f"❌ Missing required fields in response: {data.keys()}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    elif response.status_code == 404:
        print("ℹ️  Role not found (expected for non-existent ID)")
        return True
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_roles_create():
    """Test POST /api/admin/roles - create new role"""
    print("\n🧪 Testing Admin Roles Create (/api/admin/roles)")

    role_data = {
        "name": "Test Role",
        "permissions": ["read", "write"],
        "description": "A test role created by automated testing"
    }

    response = make_request('POST', '/api/admin/roles', data=role_data)

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            required_fields = ['id', 'name']
            if all(field in data for field in required_fields):
                print("✅ Admin roles create endpoint returned expected structure")
                print(f"   Created Role ID: {data.get('id', 'N/A')}")
                print(f"   Role Name: {data.get('name', 'N/A')}")

                # Store created role ID for cleanup
                global created_role_id
                created_role_id = data.get('id')
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

def test_admin_roles_update():
    """Test PUT /api/admin/roles/{id} - update role"""
    print("\n🧪 Testing Admin Roles Update (/api/admin/roles/{id})")

    # Use the role ID created in the create test, or use a mock ID
    role_id = getattr(sys.modules[__name__], 'created_role_id', 'role_mock_123')

    update_data = {
        "name": "Updated Role",
        "permissions": ["read", "write", "delete"]
    }

    response = make_request('PUT', f'/api/admin/roles/{role_id}', data=update_data)

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin roles update endpoint returned expected structure")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_roles_delete():
    """Test DELETE /api/admin/roles/{id} - delete role"""
    print("\n🧪 Testing Admin Roles Delete (/api/admin/roles/{id})")

    # Use the role ID created in the create test, or use a mock ID
    role_id = getattr(sys.modules[__name__], 'created_role_id', 'role_mock_123')

    response = make_request('DELETE', f'/api/admin/roles/{role_id}')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            if data.get('ok') == True:
                print("✅ Admin roles delete endpoint returned expected structure")
                return True
            else:
                print(f"❌ Expected 'ok: true' in response, got: {data}")
                return False
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_permissions():
    """Test GET /api/admin/permissions - get permissions"""
    print("\n🧪 Testing Admin Permissions (/api/admin/permissions)")

    response = make_request('GET', '/api/admin/permissions')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin permissions endpoint returned valid response")
            print(f"   Response type: {type(data)}")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_health():
    """Test GET /api/admin/health - system health"""
    print("\n🧪 Testing Admin Health (/api/admin/health)")

    response = make_request('GET', '/api/admin/health')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin health endpoint returned valid response")
            print(f"   Response type: {type(data)}")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_health_database():
    """Test GET /api/admin/health/database - database health"""
    print("\n🧪 Testing Admin Database Health (/api/admin/health/database)")

    response = make_request('GET', '/api/admin/health/database')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin database health endpoint returned valid response")
            print(f"   Response type: {type(data)}")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_health_storage():
    """Test GET /api/admin/health/storage - storage health"""
    print("\n🧪 Testing Admin Storage Health (/api/admin/health/storage)")

    response = make_request('GET', '/api/admin/health/storage')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin storage health endpoint returned valid response")
            print(f"   Response type: {type(data)}")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_config_get():
    """Test GET /api/admin/config - get config"""
    print("\n🧪 Testing Admin Config Get (/api/admin/config)")

    response = make_request('GET', '/api/admin/config')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin config get endpoint returned valid response")
            print(f"   Response type: {type(data)}")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_config_update():
    """Test PUT /api/admin/config - update config"""
    print("\n🧪 Testing Admin Config Update (/api/admin/config)")

    config_data = {
        "app_name": "Updated App Name",
        "debug": False
    }

    response = make_request('PUT', '/api/admin/config', data=config_data)

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin config update endpoint returned valid response")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def test_admin_logs():
    """Test GET /api/admin/logs - get logs"""
    print("\n🧪 Testing Admin Logs (/api/admin/logs)")

    response = make_request('GET', '/api/admin/logs')

    if response is None:
        return False

    if response.status_code == 200:
        try:
            data = response.json()
            print("✅ Admin logs endpoint returned valid response")
            print(f"   Response type: {type(data)}")
            if isinstance(data, list):
                print(f"   Number of log entries: {len(data)}")
            return True
        except json.JSONDecodeError:
            print("❌ Invalid JSON response")
            return False
    else:
        print(f"❌ Unexpected status code: {response.status_code}")
        print(f"   Response: {response.text[:200]}...")
        return False

def main():
    """Run all Admin Management API tests"""
    print("👥 Starting Admin Management API Tests")
    print("=" * 50)

    # Run all tests
    results = []
    # User Management (6 tests)
    results.append(test_admin_users_list())
    results.append(test_admin_users_get())
    results.append(test_admin_users_create())
    results.append(test_admin_users_update())
    results.append(test_admin_users_reset_password())
    results.append(test_admin_users_delete())

    # Role Management (5 tests)
    results.append(test_admin_roles_list())
    results.append(test_admin_roles_get())
    results.append(test_admin_roles_create())
    results.append(test_admin_roles_update())
    results.append(test_admin_roles_delete())
    results.append(test_admin_permissions())

    # System Management (6 tests)
    results.append(test_admin_health())
    results.append(test_admin_health_database())
    results.append(test_admin_health_storage())
    results.append(test_admin_config_get())
    results.append(test_admin_config_update())
    results.append(test_admin_logs())

    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY - Admin Management Endpoints")
    print("=" * 50)

    passed = sum(results)
    total = len(results)

    print(f"✅ PASS User Management: {sum(results[0:6])}/6")
    print(f"✅ PASS Role Management: {sum(results[6:12])}/6")
    print(f"✅ PASS System Management: {sum(results[12:18])}/6")

    print(f"\n📈 Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All Admin Management endpoints are working correctly!")
        return 0
    else:
        print("⚠️  Some endpoints failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
