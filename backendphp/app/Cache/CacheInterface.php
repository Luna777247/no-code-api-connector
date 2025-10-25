<?php

namespace App\Cache;

/**
 * Cache interface for different cache implementations
 */
interface CacheInterface
{
    /**
     * Get an item from the cache
     */
    public function get(string $key): mixed;

    /**
     * Store an item in the cache
     */
    public function set(string $key, mixed $value, ?int $ttl = null): bool;

    /**
     * Check if an item exists in the cache
     */
    public function has(string $key): bool;

    /**
     * Remove an item from the cache
     */
    public function delete(string $key): bool;

    /**
     * Clear all items from the cache
     */
    public function clear(): bool;

    /**
     * Get multiple items from the cache
     */
    public function getMultiple(array $keys): array;

    /**
     * Store multiple items in the cache
     */
    public function setMultiple(array $values, ?int $ttl = null): bool;

    /**
     * Remove multiple items from the cache
     */
    public function deleteMultiple(array $keys): bool;
}