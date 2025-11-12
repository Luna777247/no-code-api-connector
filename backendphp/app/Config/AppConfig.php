<?php
namespace App\Config;

/**
 * Centralized application configuration class
 * Manages all environment variables and provides default values
 */
class AppConfig
{
    // Database Collection Names
    public static function getApiConnectionsCollection(): string
    {
        return getenv('API_CONNECTIONS_COLLECTION') ?: 'api_connections';
    }

    public static function getParameterModesCollection(): string
    {
        return getenv('PARAMETER_MODES_COLLECTION') ?: 'parameter_modes';
    }

    public static function getApiRunsCollection(): string
    {
        return getenv('API_RUNS_COLLECTION') ?: 'api_runs';
    }

    public static function getApiSchedulesCollection(): string
    {
        return getenv('API_SCHEDULES_COLLECTION') ?: 'api_schedules';
    }

    // MongoDB Timeouts (in milliseconds)
    public static function getMongoQueryTimeout(): int
    {
        return (int)(getenv('MONGODB_QUERY_TIMEOUT_MS') ?: 15000);
    }

    public static function getMongoLimitedQueryTimeout(): int
    {
        return (int)(getenv('MONGODB_LIMITED_QUERY_TIMEOUT_MS') ?: 10000);
    }

    public static function getMongoFindTimeout(): int
    {
        return (int)(getenv('MONGODB_FIND_TIMEOUT_MS') ?: 5000);
    }

    // HTTP Timeouts (in seconds)
    public static function getHttpRequestTimeout(): int
    {
        return (int)(getenv('HTTP_REQUEST_TIMEOUT_SECONDS') ?: 60);
    }

    // Airflow Configuration
    public static function getAirflowWebserverUrl(): ?string
    {
        return getenv('AIRFLOW_WEBSERVER_URL') ?: null;
    }

    public static function getAirflowUsername(): string
    {
        return getenv('AIRFLOW_USERNAME') ?: 'admin';
    }

    public static function getAirflowPassword(): string
    {
        return getenv('AIRFLOW_PASSWORD') ?: 'admin';
    }

    // Application Environment
    public static function getAppEnv(): string
    {
        return getenv('APP_ENV') ?: 'development';
    }

    public static function isProduction(): bool
    {
        return self::getAppEnv() === 'production';
    }

    public static function isDevelopment(): bool
    {
        return self::getAppEnv() === 'development';
    }

    // MongoDB Configuration
    public static function getMongoUri(): ?string
    {
        return getenv('MONGODB_URI') ?: null;
    }

    public static function getMongoDatabase(): ?string
    {
        return getenv('MONGODB_DATABASE') ?: null;
    }

    // Logging Configuration
    public static function getLogFilePath(): ?string
    {
        return getenv('LOG_FILE_PATH') ?: (__DIR__ . '/../../logs/app.log');
    }

    public static function getLogLevel(): string
    {
        return getenv('LOG_LEVEL') ?: 'ERROR';
    }

    public static function isLoggingEnabled(): bool
    {
        return getenv('LOGGING_ENABLED') !== 'false';
    }

    // Caching Configuration
    public static function isCacheEnabled(): bool
    {
        return getenv('CACHE_ENABLED') !== 'false';
    }

    public static function getCacheDriver(): string
    {
        return getenv('CACHE_DRIVER') ?: 'redis';
    }

    public static function getRedisHost(): string
    {
        return getenv('REDIS_HOST') ?: 'localhost';
    }

    public static function getRedisPort(): int
    {
        return (int)(getenv('REDIS_PORT') ?: 6379);
    }

    public static function getRedisPassword(): ?string
    {
        return getenv('REDIS_PASSWORD') ?: null;
    }

    public static function getRedisDatabase(): int
    {
        return (int)(getenv('REDIS_DATABASE') ?: 0);
    }

    public static function getCacheTtl(): int
    {
        return (int)(getenv('CACHE_TTL_SECONDS') ?: 3600); // 1 hour default
    }

    public static function getCachePrefix(): string
    {
        return getenv('CACHE_PREFIX') ?: 'api_connector';
    }

    // Schedule and DAG Constants
    public static function getDagPrefix(): string
    {
        return getenv('DAG_PREFIX') ?: 'api_schedule';
    }

    public static function getDefaultTimezone(): string
    {
        return getenv('DEFAULT_TIMEZONE') ?: 'Asia/Ho_Chi_Minh';
    }

    public static function getDefaultCronExpression(): string
    {
        return getenv('DEFAULT_CRON_EXPRESSION') ?: '* * * * *';
    }

    // Schedule Types
    public static function getSupportedScheduleTypes(): array
    {
        return ['cron', 'interval', 'manual'];
    }

    // HTTP Methods
    public static function getSupportedHttpMethods(): array
    {
        return ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    }
}