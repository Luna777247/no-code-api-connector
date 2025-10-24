<?php
namespace App\Controllers;

use App\Support\HttpClient;

class DiagnosticController
{
    private HttpClient $http;

    public function __construct()
    {
        $this->http = new HttpClient();
    }

    // POST /api/test-connection
    // Body: { apiConfig: { baseUrl, method, headers } }
    public function testConnection(): array
    {
        // Allow tests to inject raw input via global override for php://input
        $rawInput = $GLOBALS['__php_input_override'] ?? null;
        if ($rawInput === null) {
            $rawInput = file_get_contents('php://input');
        }
        $input = json_decode($rawInput, true) ?? [];
        $cfg = $input['apiConfig'] ?? [];
        $url = (string)($cfg['baseUrl'] ?? '');
        $method = strtoupper((string)($cfg['method'] ?? 'GET'));
        $headers = (array)($cfg['headers'] ?? []);
        $params = (array)($cfg['params'] ?? []);

        if ($url === '') {
            http_response_code(400);
            return ['success' => false, 'error' => 'baseUrl is required'];
        }
        // Support alternate schema: apiConfig.parameters (array with name/key and values)
        $parameterDefs = (array)($cfg['parameters'] ?? []);
        foreach ($parameterDefs as $def) {
            if (!is_array($def)) { continue; }
            $pname = $def['name'] ?? $def['key'] ?? null;
            if (!is_string($pname) || $pname === '') { continue; }
            $rawValues = $def['values'] ?? $def['value'] ?? null;
            $picked = null;
            if (is_array($rawValues)) {
                foreach ($rawValues as $rv) {
                    if ($rv === null) { continue; }
                    $s = is_string($rv) ? trim($rv) : (is_scalar($rv) ? (string)$rv : null);
                    if ($s !== null && $s !== '') { $picked = $s; break; }
                }
            } elseif (is_scalar($rawValues)) {
                $picked = (string)$rawValues;
            }
            if ($picked !== null) { $params[$pname] = $picked; }
        }

        // Normalize params: accept map or list of {name,value}
        $normalizedParams = [];
        foreach ($params as $k => $v) {
            if (is_int($k) && is_array($v)) {
                $name = $v['name'] ?? $v['key'] ?? null;
                $value = $v['value'] ?? $v['val'] ?? null;
                if (is_string($name) && $name !== '' && $value !== null) {
                    $normalizedParams[$name] = $value;
                }
            } elseif (is_string($k)) {
                if (is_array($v)) {
                    $selected = null;
                    foreach ($v as $rv) {
                        if ($rv === null) { continue; }
                        $s = is_string($rv) ? trim($rv) : (is_scalar($rv) ? (string)$rv : null);
                        if ($s !== null && $s !== '') { $selected = $s; break; }
                    }
                    if ($selected !== null) { $normalizedParams[$k] = $selected; }
                } else {
                    $normalizedParams[$k] = $v;
                }
            }
        }

        // Helper to get header by key (case-insensitive)
        $getHeader = function(array $headers, string $key): ?string {
            foreach ($headers as $hk => $hv) {
                if (is_string($hk) && strcasecmp($hk, $key) === 0) { return (string)$hv; }
                if (is_int($hk) && is_string($hv)) {
                    $parts = explode(':', $hv, 2);
                    if (count($parts) === 2 && strcasecmp(trim($parts[0]), $key) === 0) { return trim($parts[1]); }
                }
                if (is_int($hk) && is_array($hv)) {
                    $name = $hv['name'] ?? $hv['key'] ?? null;
                    $value = $hv['value'] ?? $hv['val'] ?? null;
                    if (is_string($name) && strcasecmp($name, $key) === 0) { return is_string($value) ? $value : (is_null($value) ? null : (string)$value); }
                }
            }
            return null;
        };

        $requestBody = null;
        $finalUrl = $url;
        if (in_array($method, ['GET','DELETE'], true)) {
            if (!empty($normalizedParams)) {
                $parsed = parse_url($finalUrl) ?: [];
                $existingQuery = $parsed['query'] ?? '';
                parse_str($existingQuery, $existingArr);
                $merged = array_merge($existingArr, $normalizedParams);
                $query = http_build_query($merged);
                $base = strtok($finalUrl, '?');
                $finalUrl = $base . ($query !== '' ? ('?' . $query) : '');
            }
        } else { // POST/PUT/PATCH
            $contentType = $getHeader($headers, 'Content-Type');
            if ($contentType && stripos($contentType, 'application/json') !== false) {
                $requestBody = json_encode($normalizedParams, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            } else {
                $requestBody = http_build_query($normalizedParams);
                if (!$contentType) { $headers['Content-Type'] = 'application/x-www-form-urlencoded'; }
            }
        }

        $res = $this->http->request($method, $finalUrl, $headers, $requestBody, 20);
        $ok = $res['ok'] ?? false;
        $status = $res['status'] ?? 0;
        $statusText = $res['statusText'] ?? '';
        $body = $res['body'] ?? null;

        return [
            'success' => $ok,
            'status' => $status,
            'statusText' => $statusText,
            'message' => $ok ? 'Connection successful' : 'Request failed',
            'body' => $body,
            'finalUrl' => $finalUrl,
        ];
    }
}
