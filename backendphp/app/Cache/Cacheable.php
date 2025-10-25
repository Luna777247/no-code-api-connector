<?php

namespace App\Cache;

use App\Config\AppConfig;

/**
 * Cache helper trait for repositories and services
 */
trait Cacheable
{
    protected ?CacheInterface $cache = null;

    /**
     * Initialize cache if available
     */
    protected function initCache(): void
    {
        $this->cache = CacheManager::getInstance();
    }

    /**
     * Get cache key with entity prefix
     */
    protected function getCacheKey(string $key): string
    {
        $entity = $this->getEntityName();
        return "{$entity}:{$key}";
    }

    /**
     * Get entity name for cache keys (should be overridden by implementing class)
     */
    protected function getEntityName(): string
    {
        // Default implementation - can be overridden
        $className = get_class($this);
        $parts = explode('\\', $className);
        $class = end($parts);

        // Remove "Repository" or "Service" suffix
        return strtolower(str_replace(['Repository', 'Service'], '', $class));
    }

    /**
     * Get cached value or compute and cache it
     */
    protected function getCached(string $key, callable $callback, ?int $ttl = null): mixed
    {
        if (!$this->cache) {
            return $callback();
        }

        $cacheKey = $this->getCacheKey($key);
        $cached = $this->cache->get($cacheKey);

        if ($cached !== null) {
            return $cached;
        }

        $value = $callback();
        $this->cache->set($cacheKey, $value, $ttl);

        return $value;
    }

    /**
     * Invalidate cache for a specific key
     */
    protected function invalidateCache(string $key): void
    {
        if ($this->cache) {
            $cacheKey = $this->getCacheKey($key);
            $this->cache->delete($cacheKey);
        }
    }

    /**
     * Invalidate all cache for this entity
     */
    protected function invalidateEntityCache(): void
    {
        if ($this->cache) {
            // This is a simple implementation - in production you might want
            // to use Redis SCAN or maintain a list of keys
            $this->cache->clear();
        }
    }

    /**
     * Set cache value
     */
    protected function setCache(string $key, mixed $value, ?int $ttl = null): void
    {
        if ($this->cache) {
            $cacheKey = $this->getCacheKey($key);
            $this->cache->set($cacheKey, $value, $ttl);
        }
    }

    /**
     * Check if key exists in cache
     */
    protected function hasCache(string $key): bool
    {
        return $this->cache ? $this->cache->has($this->getCacheKey($key)) : false;
    }

    /**
     * Get multiple cached values
     */
    protected function getMultipleCache(array $keys): array
    {
        if (!$this->cache) {
            return array_fill_keys($keys, null);
        }

        $cacheKeys = array_map([$this, 'getCacheKey'], $keys);
        $cached = $this->cache->getMultiple($cacheKeys);

        // Re-map keys back to original format
        $result = [];
        foreach ($keys as $key) {
            $cacheKey = $this->getCacheKey($key);
            $result[$key] = $cached[$cacheKey] ?? null;
        }

        return $result;
    }

    /**
     * Set multiple cache values
     */
    protected function setMultipleCache(array $values, ?int $ttl = null): void
    {
        if ($this->cache) {
            $cacheValues = [];
            foreach ($values as $key => $value) {
                $cacheValues[$this->getCacheKey($key)] = $value;
            }
            $this->cache->setMultiple($cacheValues, $ttl);
        }
    }
}