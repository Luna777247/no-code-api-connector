<?php
namespace App\Services;

class AdminUserService
{
    public function listUsers(int $limit = 50, int $offset = 0): array
    {
        return [
            [
                'id' => 'user_1',
                'username' => 'admin',
                'email' => 'admin@example.com',
                'role' => 'admin',
                'createdAt' => date('c')
            ]
        ];
    }

    public function getUser(string $id): ?array
    {
        if ($id === 'user_1') {
            return [
                'id' => $id,
                'username' => 'admin',
                'email' => 'admin@example.com',
                'role' => 'admin',
                'createdAt' => date('c')
            ];
        }
        return null;
    }

    public function createUser(array $data): ?array
    {
        return array_merge($data, [
            'id' => 'user_' . uniqid(),
            'createdAt' => date('c')
        ]);
    }

    public function updateUser(string $id, array $data): array
    {
        // Basic implementation - return updated user data
        return array_merge($data, [
            'id' => $id,
            'updatedAt' => date('c')
        ]);
    }

    public function deleteUser(string $id): bool
    {
        return true;
    }

    public function resetPassword(string $id): bool
    {
        return true;
    }
}