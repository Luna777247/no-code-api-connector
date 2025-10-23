<?php
namespace App\Controllers;

class AnalyticsController
{
    public function successRateHistory(): void
    {
        header('Content-Type: application/json');
        $days = isset($_GET['days']) ? (int)$_GET['days'] : 7;
        $days = max(1, min(60, $days));

        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = (new \DateTimeImmutable("-{$i} days"))->format('Y-m-d');
            $out[] = [
                'date' => $date,
                'successRate' => rand(9300, 9950) / 100.0, // 93% - 99.5%
            ];
        }

        echo json_encode(['data' => $out]);
    }
}
