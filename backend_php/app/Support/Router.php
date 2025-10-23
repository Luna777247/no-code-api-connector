<?php
namespace App\Support;

class Router
{
    private array $routes = [];

    public function get(string $path, callable $handler): void
    {
        $this->map('GET', $path, $handler);
    }

    public function post(string $path, callable $handler): void
    {
        $this->map('POST', $path, $handler);
    }

    public function put(string $path, callable $handler): void
    {
        $this->map('PUT', $path, $handler);
    }

    public function delete(string $path, callable $handler): void
    {
        $this->map('DELETE', $path, $handler);
    }

    public function map(string $method, string $path, callable $handler): void
    {
        $this->routes[$method][$this->normalize($path)] = $handler;
    }

    public function dispatch(string $method, string $uri)
    {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';
        $normalized = $this->normalize($path);

        // Exact match first
        if (isset($this->routes[$method][$normalized])) {
            // Do not pass $_REQUEST here; controller methods like index()/create() expect no args
            return call_user_func($this->routes[$method][$normalized]);
        }

        // Simple param match e.g. /api/runs/{id}
        foreach ($this->routes[$method] ?? [] as $route => $handler) {
            $pattern = preg_replace('#\{[^/]+\}#', '([^/]+)', $route);
            $pattern = '#^' . $pattern . '$#';
            if (preg_match($pattern, $normalized, $matches)) {
                array_shift($matches);
                return call_user_func_array($handler, $matches);
            }
        }

        http_response_code(404);
        return ['error' => 'Not Found'];
    }

    private function normalize(string $path): string
    {
        return rtrim($path, '/') ?: '/';
    }
}

