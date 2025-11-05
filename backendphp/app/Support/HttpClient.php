<?php
namespace App\Support;

use App\Config\AppConfig;
use App\Exceptions\HttpException;

class HttpClient
{
    private function getDefaultTimeout(): int
    {
        return AppConfig::getHttpRequestTimeout();
    }

    public function request(string $method, string $url, array $headers = [], ?string $body = null, ?int $timeout = null): array
    {
        $ch = curl_init();
        $method = strtoupper($method ?: 'GET');

        $normalizedHeaders = [];
        foreach ($headers as $k => $v) {
            if (is_int($k)) {
                if (is_array($v)) {
                    $name = $v['name'] ?? $v['key'] ?? null;
                    $value = $v['value'] ?? $v['val'] ?? null;
                    if (is_string($name) && $name !== '' && $value !== null) {
                        $normalizedHeaders[] = trim($name) . ': ' . trim((string)$value);
                        continue;
                    }
                }
                if (is_string($v)) {
                    $trimmed = trim($v);
                    if ($trimmed !== '') { $normalizedHeaders[] = $trimmed; }
                }
                continue;
            }
            if (is_string($k)) {
                $normalizedHeaders[] = trim($k) . ': ' . trim((string)$v);
            }
        }

        // Use default timeout if not specified
        if ($timeout === null) {
            $timeout = $this->getDefaultTimeout();
        }

        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => $method,
            CURLOPT_HTTPHEADER => $normalizedHeaders,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_SSL_VERIFYPEER => false,  // Skip SSL certificate verification
            CURLOPT_SSL_VERIFYHOST => false,  // Skip SSL host verification
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
            throw new HttpException(
                "HTTP request failed: {$error}",
                0,
                [
                    'method' => $method,
                    'url' => $url,
                    'timeout' => $timeout,
                    'curl_errno' => $errno
                ]
            );
        }

        // For all requests, return the response without throwing HTTP errors
        // This allows the caller to decide how to handle different status codes
        return [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status,
            'statusText' => (string)$status,
            'headers' => [],
            'body' => $responseBody,
        ];
    }
}
