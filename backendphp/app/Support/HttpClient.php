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
