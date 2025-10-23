<?php
namespace App\Support;

class HttpClient
{
    public function request(string $method, string $url, array $headers = [], ?string $body = null, int $timeout = 30): array
    {
        $ch = curl_init();
        $method = strtoupper($method ?: 'GET');

        $normalizedHeaders = [];
        foreach ($headers as $k => $v) {
            if (is_int($k)) { $normalizedHeaders[] = $v; continue; }
            $normalizedHeaders[] = $k . ': ' . $v;
        }

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $normalizedHeaders,
            CURLOPT_TIMEOUT => $timeout,
        ]);

        if ($body !== null && in_array($method, ['POST','PUT','PATCH','DELETE'], true)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $responseBody = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno) {
            return [
                'ok' => false,
                'status' => 0,
                'statusText' => $error ?: 'Network error',
                'headers' => [],
                'body' => null,
            ];
        }

        return [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status,
            'statusText' => (string)$status,
            'headers' => [],
            'body' => $responseBody,
        ];
    }
}
