<?php
namespace App\Controllers;

use App\Services\VisualizationService;

class VisualizationController
{
    private VisualizationService $service;

    public function __construct()
    {
        $this->service = new VisualizationService();
    }

    public function charts(): array
    {
        return $this->service->getChartMetadata();
    }

    public function metrics(): array
    {
        return $this->service->getMetrics();
    }
}
