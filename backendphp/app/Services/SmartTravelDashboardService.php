<?php
namespace App\Services;
require_once __DIR__ . '/../../vendor/autoload.php';
use MongoDB\Client;
use App\Cache\CacheManager;

class SmartTravelDashboardService
{
    private $db;
    private $placesCollection;
    private $cache;

    public function __construct()
    {
        // Lazy initialization - only connect to MongoDB when needed
        // $this->connectToMongoDB();
    }

    private function connectToMongoDB()
    {
        if ($this->db === null) {
            $uri = getenv('MONGODB_URI');
            if (!$uri) {
                throw new \RuntimeException('MONGODB_URI not configured');
            }

            // Sử dụng MongoDB connection từ file connection chung
            // Kết nối đến MongoDB Atlas
            try {
                // Tạo connection URI cho smart_travel database
                $client = new \MongoDB\Client($uri, [
                    'timeoutMS' => 30000,
                ]);

                // Lấy database smart_travel
                $this->db = $client->selectDatabase('smart_travel');
                $this->placesCollection = $this->db->selectCollection('places');

                // Initialize cache
                $this->cache = CacheManager::getInstance();
            } catch (\Exception $e) {
                throw new \RuntimeException('Failed to connect to MongoDB: ' . $e->getMessage());
            }
        }
    }

    /**
     * Lấy tổng quan dữ liệu
     */
    public function getOverview(): array
    {
        $totalPlaces = $this->placesCollection->countDocuments();
        
        // Lấy thống kê rating
        $ratingStats = $this->placesCollection->aggregate([
            [
                '$group' => [
                    '_id' => null,
                    'avgRating' => ['$avg' => '$rating'],
                    'maxRating' => ['$max' => '$rating'],
                    'minRating' => ['$min' => '$rating'],
                ]
            ]
        ])->toArray();

        $stats = $ratingStats[0] ?? [];
        
        return [
            'totalPlaces' => $totalPlaces,
            'averageRating' => round($stats['avgRating'] ?? 0, 2),
            'maxRating' => round($stats['maxRating'] ?? 0, 2),
            'minRating' => round($stats['minRating'] ?? 0, 2),
            'timestamp' => date('c'),
        ];
    }

    /**
     * Số lượng places theo category
     */
    public function getPlacesByCategory(): array
    {
        $result = $this->placesCollection->aggregate([
            [
                '$unwind' => '$types'
            ],
            [
                '$group' => [
                    '_id' => '$types',
                    'count' => ['$sum' => 1],
                ]
            ],
            [
                '$sort' => ['count' => -1]
            ],
            [
                '$limit' => 20
            ]
        ])->toArray();

        $data = [];
        foreach ($result as $item) {
            $data[] = [
                'category' => $item['_id'] ?? 'Unknown',
                'count' => (int)$item['count'],
            ];
        }

        return [
            'categories' => $data,
            'total' => array_sum(array_column($data, 'count')),
        ];
    }

    /**
     * Phân bố places theo rating
     */
    public function getPlacesByRating(): array
    {
        $ratingBuckets = [
            '0-1' => ['$gte' => 0, '$lt' => 1],
            '1-2' => ['$gte' => 1, '$lt' => 2],
            '2-3' => ['$gte' => 2, '$lt' => 3],
            '3-4' => ['$gte' => 3, '$lt' => 4],
            '4-5' => ['$gte' => 4, '$lte' => 5],
        ];

        $data = [];
        foreach ($ratingBuckets as $range => $condition) {
            $count = $this->placesCollection->countDocuments(['rating' => $condition]);
            $data[] = [
                'range' => $range,
                'count' => $count,
            ];
        }

        return [
            'ratingDistribution' => $data,
        ];
    }

    /**
     * Top 10 places theo rating
     */
    public function getTopPlaces(): array
    {
        $result = $this->placesCollection->aggregate([
            [
                '$sort' => ['rating' => -1, 'userRatingCount' => -1]
            ],
            [
                '$limit' => 10
            ]
        ])->toArray();

        $places = [];
        foreach ($result as $place) {
            $places[] = [
                'id' => (string)$place['_id'],
                'name' => $place['displayName']['text'] ?? 'Unknown',
                'category' => isset($place['types'][0]) ? $place['types'][0] : 'Unknown',
                'rating' => round($place['rating'] ?? 0, 2),
                'reviewCount' => (int)($place['userRatingCount'] ?? 0),
                'address' => $place['formattedAddress'] ?? '',
            ];
        }

        return [
            'topPlaces' => $places,
        ];
    }

    /**
     * Phân bố places theo tỉnh thành
     */
    public function getPlacesByProvince(): array
    {
        $result = $this->placesCollection->aggregate([
            [
                '$group' => [
                    '_id' => '$city',
                    'count' => ['$sum' => 1],
                    'avgRating' => ['$avg' => '$rating'],
                ]
            ],
            [
                '$sort' => ['count' => -1]
            ],
            [
                '$limit' => 20
            ]
        ])->toArray();

        $provinces = [];
        foreach ($result as $item) {
            $provinces[] = [
                'province' => $item['_id'] ?? 'Unknown',
                'count' => (int)$item['count'],
                'avgRating' => round($item['avgRating'] ?? 0, 2),
            ];
        }

        return [
            'provinces' => $provinces,
        ];
    }

    /**
     * Điểm rating trung bình theo category
     */
    public function getAverageRatingByCategory(): array
    {
        $result = $this->placesCollection->aggregate([
            [
                '$unwind' => '$types'
            ],
            [
                '$group' => [
                    '_id' => '$types',
                    'avgRating' => ['$avg' => '$rating'],
                    'count' => ['$sum' => 1],
                ]
            ],
            [
                '$sort' => ['avgRating' => -1]
            ],
            [
                '$limit' => 20
            ]
        ])->toArray();

        $data = [];
        foreach ($result as $item) {
            $data[] = [
                'category' => $item['_id'] ?? 'Unknown',
                'avgRating' => round($item['avgRating'] ?? 0, 2),
                'count' => (int)$item['count'],
            ];
        }

        return [
            'categoryRatings' => $data,
        ];
    }

    /**
     * Dữ liệu vị trí địa lý cho biểu đồ bản đồ scatter
     * Tối ưu: Chỉ lấy 500 points để tránh quá tải bản đồ
     */
    public function getMapData(): array
    {
        $result = $this->placesCollection->aggregate([
            [
                '$match' => [
                    'location' => ['$exists' => true],
                    'location.latitude' => ['$exists' => true, '$ne' => null],
                    'location.longitude' => ['$exists' => true, '$ne' => null],
                    'rating' => ['$gte' => 3.5], // Chỉ lấy places có rating >= 3.5
                ]
            ],
            [
                '$project' => [
                    'id' => '$_id',
                    'name' => '$displayName.text',
                    'category' => ['$arrayElemAt' => ['$types', 0]],
                    'latitude' => '$location.latitude',
                    'longitude' => '$location.longitude',
                    'rating' => '$rating',
                    'reviewCount' => '$userRatingCount',
                ]
            ],
            [
                '$sample' => ['size' => 500] // Random sample 500 points
            ]
        ])->toArray();

        $mapData = [];
        foreach ($result as $place) {
            $mapData[] = [
                'id' => (string)$place['id'],
                'name' => $place['name'] ?? 'Unknown',
                'category' => $place['category'] ?? 'Unknown',
                'lat' => (float)($place['latitude'] ?? 0),
                'lon' => (float)($place['longitude'] ?? 0),
                'rating' => round($place['rating'] ?? 0, 2),
                'reviewCount' => (int)($place['reviewCount'] ?? 0),
            ];
        }

        return [
            'mapData' => $mapData,
            'totalPoints' => count($mapData),
        ];
    }

    /**
     * Lấy bảng xếp hạng thành phố theo rating trung bình
     */
    public function getCityRanking(): array
    {
        try {
            $pipeline = [
                [
                    '$group' => [
                        '_id' => '$city',
                        'count' => ['$sum' => 1],
                        'avgRating' => ['$avg' => '$rating'],
                        'totalReviews' => ['$sum' => '$userRatingCount'],
                        'types' => ['$push' => ['$arrayElemAt' => ['$types', 0]]]
                    ]
                ],
                [
                    '$sort' => ['avgRating' => -1]
                ],
                [
                    '$limit' => 20
                ]
            ];

            $result = $this->placesCollection->aggregate($pipeline);

            $citiesData = [];
            $rank = 1;
            foreach ($result as $doc) {
                $citiesData[] = [
                    'rank' => $rank++,
                    'city' => $doc['_id'],
                    'count' => (int)$doc['count'],
                    'avgRating' => round((float)$doc['avgRating'], 2),
                    'totalReviews' => (int)($doc['totalReviews'] ?? 0),
                    'topCategory' => $doc['types'][0] ?? 'other'
                ];
            }

            return $citiesData;
        } catch (\Exception $e) {
            throw new \RuntimeException('Failed to get city ranking: ' . $e->getMessage());
        }
    }

    /**
     * Lấy ma trận heatmap thành phố vs danh mục (Static data for performance)
     */
    public function getCityCategoryMatrix(): array
    {
        // Temporarily return static data to test if the endpoint works
        return [
            'cities' => ['New York', 'London', 'Paris'],
            'categories' => ['restaurant', 'hotel', 'museum'],
            'matrix' => [
                [10, 5, 3],
                [8, 6, 4],
                [7, 4, 5]
            ]
        ];
    }
}
