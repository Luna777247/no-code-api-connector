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
        $this->connectToMongoDB();
        
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
        $this->connectToMongoDB();
        
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
        $this->connectToMongoDB();
        
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
        $this->connectToMongoDB();
        
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
        $this->connectToMongoDB();
        
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
        $this->connectToMongoDB();
        
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
        $this->connectToMongoDB();
        
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
        $this->connectToMongoDB();
        
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
     * Lấy ma trận heatmap thành phố vs danh mục
     * "Where to find what?" - Mối quan hệ giữa thành phố và danh mục địa điểm
     * Optimized: Single aggregation pipeline, limited to top cities/categories
     */
    public function getCityCategoryMatrix(): array
    {
        try {
            $this->connectToMongoDB();

            // Single optimized pipeline: Get city-category combinations with counts
            $pipeline = [
                // Unwind types array
                ['$unwind' => '$types'],
                // Group by city and category
                [
                    '$group' => [
                        '_id' => ['city' => '$city', 'category' => '$types'],
                        'count' => ['$sum' => 1]
                    ]
                ],
                // Sort by count descending to get top combinations first
                ['$sort' => ['count' => -1]]
            ];

            $result = $this->placesCollection->aggregate($pipeline)->toArray();

            // Extract unique cities and categories from results, limit to top
            $cities = [];
            $categories = [];
            $cityCategoryMap = [];
            $maxValue = 0;

            foreach ($result as $doc) {
                $city = $doc['_id']['city'];
                $category = $doc['_id']['category'];
                $count = (int)$doc['count'];

                // Only track cities and categories that are in the results
                if (!in_array($city, $cities) && count($cities) < 15) {
                    $cities[] = $city;
                }
                if (!in_array($category, $categories) && count($categories) < 15) {
                    $categories[] = $category;
                }

                // Store the count
                if (in_array($city, $cities) && in_array($category, $categories)) {
                    if (!isset($cityCategoryMap[$city])) {
                        $cityCategoryMap[$city] = [];
                    }
                    $cityCategoryMap[$city][$category] = $count;

                    if ($count > $maxValue) {
                        $maxValue = $count;
                    }
                }
            }

            // Sort cities and categories alphabetically
            sort($cities);
            sort($categories);

            // Build the final matrix
            $matrix = [];
            foreach ($cities as $city) {
                $row = [];
                foreach ($categories as $category) {
                    $count = $cityCategoryMap[$city][$category] ?? 0;
                    $row[] = $count;
                }
                $matrix[] = $row;
            }

            return [
                'cities' => $cities,
                'categories' => $categories,
                'matrix' => $matrix,
                'maxValue' => max($maxValue, 1)
            ];
        } catch (\Exception $e) {
            throw new \RuntimeException('Failed to get city-category matrix: ' . $e->getMessage());
        }
    }
}
