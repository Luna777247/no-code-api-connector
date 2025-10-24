<?php
namespace App\Support;

class Env
{
    private static array $cache = [];

    public static function get(string $key, ?string $default = null): ?string
    {
        if (isset(self::$cache[$key])) {
            return self::$cache[$key];
        }

        // Try server env first
        $value = getenv($key);
        if ($value !== false) {
            self::$cache[$key] = $value;
            return $value;
        }

        // Fallback: parse .env in backend_php/ and then try repo root
        $candidates = [
            dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . '.env',                 // backend_php/.env
            dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . '.env',                 // repo root .env
        ];

        foreach ($candidates as $envPath) {
            if (!is_readable($envPath)) {
                continue;
            }
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || str_starts_with($line, '#')) {
                    continue;
                }
                // Simple KEY="VALUE" or KEY=VALUE parser
                if (preg_match('/^([A-Z0-9_]+)\s*=\s*(.*)$/i', $line, $m)) {
                    $k = $m[1];
                    $v = trim($m[2]);
                    $v = trim($v, "\"' ");
                    self::$cache[$k] = $v;
                }
            }
        }

        return self::$cache[$key] ?? $default;
    }
}
