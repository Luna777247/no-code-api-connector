<?php
namespace App\Controllers;

use App\Services\AdminUserService;

class AdminUserController
{
    private AdminUserService $service;

    public function __construct()
    {
        $this->service = new AdminUserService();
    }

    public function index(): array
    {
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        return $this->service->listUsers($limit, $offset);
    }

    public function show(string $id): array
    {
        $user = $this->service->getUser($id);
        if (!$user) {
            http_response_code(404);
            return ['error' => 'User not found'];
        }
        return $user;
    }

    public function create(): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($input['email']) || empty($input['password']) || empty($input['role'])) {
            http_response_code(400);
            return ['error' => 'email, password, and role are required'];
        }

        $result = $this->service->createUser($input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to create user'];
        }
        return $result;
    }

    public function update(string $id): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $result = $this->service->updateUser($id, $input);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to update user'];
        }
        return $result;
    }

    public function delete(string $id): array
    {
        $result = $this->service->deleteUser($id);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to delete user'];
        }
        return ['ok' => true];
    }

    public function resetPassword(string $id): array
    {
        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($input['newPassword'])) {
            http_response_code(400);
            return ['error' => 'newPassword is required'];
        }

        $result = $this->service->resetPassword($id, $input['newPassword']);
        if (!$result) {
            http_response_code(400);
            return ['error' => 'Failed to reset password'];
        }
        return ['ok' => true];
    }
}
