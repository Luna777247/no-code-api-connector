<?php

namespace App\Cache;

use App\Config\AppConfig;
use App\Exceptions\ConfigurationException;

/**
 * Cache manager/factory for creating cache instances
 */
class CacheManager
{
    private static ?CacheInterface $instance = null;

    /**
     * Get cache instance based on configuration
     */
    public static function getInstance(): ?CacheInterface
    {
        if (!AppConfig::isCacheEnabled()) {
            return null;
        }

        if (self::$instance === null) {
            $driver = AppConfig::getCacheDriver();

            switch ($driver) {
                case 'redis':
                    if (class_exists('Redis')) {
                        self::$instance = new RedisCache();
                    } else {
                        // Redis not available, disable cache
                        self::$instance = null;
                    }
                    break;
                case 'file':
                    // Could implement file-based cache in the future
                    self::$instance = null;
                    break;
                case 'memory':
                    // Could implement in-memory cache in the future
                    self::$instance = null;
                    break;
                default:
                    throw new ConfigurationException("Unsupported cache driver: {$driver}");
            }
        }

        return self::$instance;
    }

    /**
     * Check if cache is available and working
     */
    public static function isAvailable(): bool
    {
        $cache = self::getInstance();
        return $cache !== null;
    }

    /**
     * Get cache statistics
     */
    public static function getStats(): array
    {
        $cache = self::getInstance();

        if ($cache === null) {
            return ['enabled' => false];
        }

        if (method_exists($cache, 'getStats')) {
            return array_merge(['enabled' => true], $cache->getStats());
        }

        return ['enabled' => true, 'driver' => AppConfig::getCacheDriver()];
    }

    /**
     * Clear all cache
     */
    public static function clear(): bool
    {
        $cache = self::getInstance();
        return $cache ? $cache->clear() : true;
    }
}