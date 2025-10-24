<?php
namespace App\Services;

class AdminRoleService
{
    public function listRoles(): array
    {
        return [
            [
                'id' => 'role_1',
                'name' => 'admin',
                'description' => 'Administrator role',
                'permissions' => ['read', 'write', 'delete']
            ]
        ];
    }

    public function getRole(string $id): ?array
    {
        if ($id === 'role_1') {
            return [
                'id' => $id,
                'name' => 'admin',
                'description' => 'Administrator role',
                'permissions' => ['read', 'write', 'delete']
            ];
        }
        return null;
    }

    public function createRole(array $data): ?array
    {
        return array_merge($data, [
            'id' => 'role_' . uniqid()
        ]);
    }

    public function updateRole(string $id, array $data): bool
    {
        return true;
    }

    public function deleteRole(string $id): bool
    {
        return true;
    }

    public function getPermissions(): array
    {
        return ['read', 'write', 'delete', 'admin'];
    }
}