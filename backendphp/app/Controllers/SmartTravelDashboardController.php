<?php
namespace App\Controllers;

use App\Services\SmartTravelDashboardService;
use App\Validation\ValidationHelper;

class SmartTravelDashboardController
{
    private SmartTravelDashboardService $service;

    public function __construct()
    {
        $this->service = new SmartTravelDashboardService();
    }

    /**
     * GET /api/smart-travel/dashboard/overview
     * Lấy tổng quan dữ liệu places
     */
    public function overview(): array
    {
        try {
            return $this->service->getOverview();
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/smart-travel/dashboard/places-by-category
     * Biểu đồ số lượng places theo category
     */
    public function placesByCategory(): array
    {
        try {
            return $this->service->getPlacesByCategory();
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/smart-travel/dashboard/places-by-rating
     * Biểu đồ phân bố places theo rating
     */
    public function placesByRating(): array
    {
        try {
            return $this->service->getPlacesByRating();
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/smart-travel/dashboard/top-places
     * Top 10 places theo rating
     */
    public function topPlaces(): array
    {
        try {
            return $this->service->getTopPlaces();
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/smart-travel/dashboard/places-by-province
     * Biểu đồ places theo tỉnh thành
     */
    public function placesByProvince(): array
    {
        try {
            return $this->service->getPlacesByProvince();
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/smart-travel/dashboard/average-rating-by-category
     * Điểm rating trung bình theo category
     */
    public function averageRatingByCategory(): array
    {
        try {
            return $this->service->getAverageRatingByCategory();
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/smart-travel/dashboard/map-data
     * Dữ liệu vị trí địa lý cho biểu đồ bản đồ scatter
     */
    public function mapData(): array
    {
        try {
            return $this->service->getMapData();
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/smart-travel/dashboard/city-ranking
     * Bảng xếp hạng thành phố theo rating trung bình
     */
    public function cityRanking(): array
    {
        try {
            return $this->service->getCityRanking();
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * GET /api/smart-travel/dashboard/city-category-matrix
     * Ma trận heatmap thành phố vs danh mục
     */
    public function cityCategoryMatrix(): array
    {
        try {
            // TEMPORARY: Return simple response to test
            return [
                'cities' => ['Test City'],
                'categories' => ['test'],
                'matrix' => [[1]],
                'test' => true
            ];
        } catch (\Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }
}
