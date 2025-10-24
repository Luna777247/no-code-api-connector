<?php
namespace App\Config;

use App\Support\Env;
use MongoDB\Driver\Manager;

class Database
{
    public static function mongoManager(): ?Manager
    {
        $uri = Env::get('MONGODB_URI');
        if (!$uri) {
            return null;
        }
        try {
            // Requires MongoDB PHP extension (mongodb)
            return new Manager($uri);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public static function mongoDbName(): ?string
    {
        return Env::get('MONGODB_DATABASE');
    }
}
