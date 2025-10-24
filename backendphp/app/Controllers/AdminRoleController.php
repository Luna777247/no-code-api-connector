<?php
namespace App\Controllers;

use App\Services\AdminRoleService;

class AdminRoleController
{
    private AdminRoleService $service;

    public function __construct()
    {
        $this->service = new AdminRoleService();
    }

    public function index(): array
    {
        return $this->service->listRoles();
    }

    public function show(string $id): array
    {
        $role = $this->service->getRole($id);
        if (!$role) {
            http_response_code(404);
            return ['error' => 'Role not found'];
        }
        return $role;
    }

    public function create(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($input['name']) || empty($input['permissions'])) {
            http_response_code(400);
            return ['error' => 'name and permissions are required'];
        }

        $result = $this->service->createRole($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to create role'];
        }
        return $result;
    }

    public function update(string $id): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $result = $this->service->updateRole($id, $input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to update role'];
        }
        return $result;
    }

    public function delete(string $id): array
    {
        $result = $this->service->deleteRole($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to delete role'];
        }
        return ['ok' => true];
    }

    public function permissions(): array
    {
        return $this->service->listPermissions();
    }
}
