<?php

namespace App\Cache;

use App\Config\AppConfig;
use App\Exceptions\ConfigurationException;
use Redis;
use RedisException;

/**
 * Redis cache implementation
 */
class RedisCache implements CacheInterface
{
    private ?Redis $redis = null;
    private bool $connected = false;
    private string $prefix;

    public function __construct()
    {
        $this->prefix = AppConfig::getCachePrefix() . ':';
        $this->connect();
    }

    /**
     * Connect to Redis
     */
    private function connect(): void
    {
        if (!AppConfig::isCacheEnabled()) {
            return;
        }

        try {
            $this->redis = new Redis();
            $this->connected = $this->redis->connect(
                AppConfig::getRedisHost(),
                AppConfig::getRedisPort(),
                2.0 // timeout
            );

            if (!$this->connected) {
                throw new ConfigurationException('Failed to connect to Redis server');
            }

            // Authenticate if password is set
            $password = AppConfig::getRedisPassword();
            if ($password) {
                $this->redis->auth($password);
            }

            // Select database
            $this->redis->select(AppConfig::getRedisDatabase());

            // Test connection
            $this->redis->ping();

        } catch (RedisException $e) {
            $this->connected = false;
            // Log error but don't throw - cache should fail gracefully
            error_log("Redis connection failed: " . $e->getMessage());
        }
    }

    /**
     * Check if Redis is connected
     */
    private function isConnected(): bool
    {
        return $this->connected && $this->redis !== null;
    }

    /**
     * Generate prefixed key
     */
    private function getKey(string $key): string
    {
        return $this->prefix . $key;
    }

    /**
     * {@inheritdoc}
     */
    public function get(string $key): mixed
    {
        if (!$this->isConnected()) {
            return null;
        }

        try {
            $value = $this->redis->get($this->getKey($key));
            return $value === false ? null : unserialize($value);
        } catch (RedisException $e) {
            error_log("Redis get error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * {@inheritdoc}
     */
    public function set(string $key, mixed $value, ?int $ttl = null): bool
    {
        if (!$this->isConnected()) {
            return false;
        }

        try {
            $ttl = $ttl ?? AppConfig::getCacheTtl();
            $serialized = serialize($value);

            if ($ttl > 0) {
                return $this->redis->setex($this->getKey($key), $ttl, $serialized);
            } else {
                return $this->redis->set($this->getKey($key), $serialized);
            }
        } catch (RedisException $e) {
            error_log("Redis set error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * {@inheritdoc}
     */
    public function has(string $key): bool
    {
        if (!$this->isConnected()) {
            return false;
        }

        try {
            return $this->redis->exists($this->getKey($key));
        } catch (RedisException $e) {
            error_log("Redis exists error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * {@inheritdoc}
     */
    public function delete(string $key): bool
    {
        if (!$this->isConnected()) {
            return false;
        }

        try {
            return $this->redis->del($this->getKey($key)) > 0;
        } catch (RedisException $e) {
            error_log("Redis delete error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * {@inheritdoc}
     */
    public function clear(): bool
    {
        if (!$this->isConnected()) {
            return false;
        }

        try {
            // Clear all keys with our prefix
            $keys = $this->redis->keys($this->prefix . '*');
            if (!empty($keys)) {
                return $this->redis->del($keys) > 0;
            }
            return true;
        } catch (RedisException $e) {
            error_log("Redis clear error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * {@inheritdoc}
     */
    public function getMultiple(array $keys): array
    {
        if (!$this->isConnected()) {
            return array_fill_keys($keys, null);
        }

        try {
            $prefixedKeys = array_map([$this, 'getKey'], $keys);
            $values = $this->redis->mget($prefixedKeys);

            $result = [];
            foreach ($keys as $index => $key) {
                $value = $values[$index] ?? false;
                $result[$key] = $value === false ? null : unserialize($value);
            }

            return $result;
        } catch (RedisException $e) {
            error_log("Redis mget error: " . $e->getMessage());
            return array_fill_keys($keys, null);
        }
    }

    /**
     * {@inheritdoc}
     */
    public function setMultiple(array $values, ?int $ttl = null): bool
    {
        if (!$this->isConnected()) {
            return false;
        }

        try {
            $ttl = $ttl ?? AppConfig::getCacheTtl();
            $serializedValues = [];

            foreach ($values as $key => $value) {
                $serializedValues[$this->getKey($key)] = serialize($value);
            }

            if ($ttl > 0) {
                // For TTL, we need to set each key individually
                $success = true;
                foreach ($serializedValues as $key => $value) {
                    if (!$this->redis->setex($key, $ttl, $value)) {
                        $success = false;
                    }
                }
                return $success;
            } else {
                return $this->redis->mset($serializedValues);
            }
        } catch (RedisException $e) {
            error_log("Redis mset error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * {@inheritdoc}
     */
    public function deleteMultiple(array $keys): bool
    {
        if (!$this->isConnected()) {
            return false;
        }

        try {
            $prefixedKeys = array_map([$this, 'getKey'], $keys);
            return $this->redis->del($prefixedKeys) > 0;
        } catch (RedisException $e) {
            error_log("Redis del error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    public function getStats(): array
    {
        if (!$this->isConnected()) {
            return ['connected' => false];
        }

        try {
            $info = $this->redis->info();
            return [
                'connected' => true,
                'used_memory' => $info['used_memory_human'] ?? 'unknown',
                'connected_clients' => $info['connected_clients'] ?? 'unknown',
                'uptime_days' => $info['uptime_in_days'] ?? 'unknown',
            ];
        } catch (RedisException $e) {
            return ['connected' => false, 'error' => $e->getMessage()];
        }
    }
}