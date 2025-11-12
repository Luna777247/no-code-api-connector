<?php
namespace App\Support;

class Router
{
    private array $routes = [];

    public function get(string $path, $handler): void
    {
        $this->map('GET', $path, $handler);
    }

    public function post(string $path, $handler): void
    {
        $this->map('POST', $path, $handler);
    }

    public function put(string $path, $handler): void
    {
        $this->map('PUT', $path, $handler);
    }

    public function delete(string $path, $handler): void
    {
        $this->map('DELETE', $path, $handler);
    }

    public function map(string $method, string $path, $handler): void
    {
        $this->routes[$method][$this->normalize($path)] = $handler;
    }

    public function dispatch(string $method, string $uri)
    {
        $path = parse_url($uri, PHP_URL_PATH) ?? '/';
        $normalized = $this->normalize($path);

        file_put_contents('/tmp/router.log', '[Router.dispatch] method=' . $method . ', path=' . $path . ', normalized=' . $normalized . "\n", FILE_APPEND);

        // Exact match first
        if (isset($this->routes[$method][$normalized])) {
            file_put_contents('/tmp/router.log', '[Router.dispatch] Found exact match for ' . $method . ' ' . $normalized . "\n", FILE_APPEND);
            // Do not pass $_REQUEST here; controller methods like index()/create() expect no args
            $result = call_user_func($this->routes[$method][$normalized]);
            file_put_contents('/tmp/router.log', '[Router.dispatch] Result has keys: ' . (is_array($result) ? implode(', ', array_keys($result)) : 'not array') . "\n", FILE_APPEND);
            return $result;
        }

        // Simple param match e.g. /api/runs/{id}
        foreach ($this->routes[$method] ?? [] as $route => $handler) {
            $pattern = preg_replace('#\{[^/]+\}#', '([^/]+)', $route);
            $pattern = '#^' . $pattern . '$#';
            if (preg_match($pattern, $normalized, $matches)) {
                file_put_contents('/tmp/router.log', '[Router.dispatch] Found param match for route: ' . $route . "\n", FILE_APPEND);
                array_shift($matches);
                return call_user_func_array($handler, $matches);
            }
        }

        file_put_contents('/tmp/router.log', '[Router.dispatch] No match found for ' . $method . ' ' . $normalized . "\n", FILE_APPEND);
        http_response_code(404);
        return ['error' => 'Not Found'];
    }

    private function normalize(string $path): string
    {
        return rtrim($path, '/') ?: '/';
    }
}
