<?php
// POST /api/test-connection - Test API connection configuration (PHP equivalent)

declare(strict_types=1);

define('ROOT_PATH', realpath(__DIR__ . '/../../..'));

$__backend_base = realpath(__DIR__ . '/../..');
$__autoload_paths = [];
if ($__backend_base) {
    $__autoload_paths[] = $__backend_base . '/vendor/autoload.php';
}
$__autoload_paths[] = ROOT_PATH . '/vendor/autoload.php';

$__autoload_loaded = false;
foreach ($__autoload_paths as $__p) {
    if (is_string($__p) && file_exists($__p)) {
        require_once $__p;
        $__autoload_loaded = true;
        break;
    }
}
if (!$__autoload_loaded) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'error' => 'Composer autoload not found',
        'details' => 'Expected at backend_php/vendor/autoload.php or vendor/autoload.php at project root',
        'pathsTried' => $__autoload_paths,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $dotenv = Dotenv\Dotenv::createImmutable(ROOT_PATH);
    $dotenv->load();
} catch (Throwable $e) {
    error_log('[ERROR] Failed to load .env file: ' . $e->getMessage());
}

if (!function_exists('env')) {
    function env(string $key, $default = null): mixed
    {
        return $_ENV[$key]
            ?? $_SERVER[$key]
            ?? getenv($key)
            ?: $default;
    }
}

header('Content-Type: application/json; charset=utf-8');

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (strtoupper($method) === 'GET') {
        header('Content-Type: text/html; charset=utf-8');
        http_response_code(200);
        echo '<!DOCTYPE html>'
            . '<html lang="en">'
            . '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'
            . '<title>Test Connection</title>'
            . '<style>'
            . '  :root{--bg:#f7fafc;--card:#ffffff;--muted:#64748b;--text:#0f172a;--accent:#2563eb;--border:#e2e8f0}'
            . '  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:var(--bg);color:var(--text);margin:0;padding:32px}'
            . '  .container{max-width:960px;margin:0 auto}'
            . '  .card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px 24px;box-shadow:0 10px 30px rgba(2,6,23,.06)}'
            . '  h1{margin:0 0 8px 0;font-size:22px}'
            . '  p.sub{margin:0 0 24px 0;color:var(--muted)}'
            . '  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}'
            . '  .field{display:flex;flex-direction:column;margin-bottom:12px}'
            . '  label{font-size:13px;color:var(--muted);margin-bottom:6px}'
            . '  input,select,textarea{color:var(--text);background:#ffffff;border:1px solid var(--border);border-radius:8px;padding:10px 12px;outline:none}'
            . '  textarea{min-height:120px;resize:vertical}'
            . '  .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:12px}'
            . '  .btn{background:var(--accent);border:none;color:#ffffff;font-weight:700;padding:10px 16px;border-radius:8px;cursor:pointer}'
            . '  .btn[disabled]{opacity:.7;cursor:not-allowed}'
            . '  .ghost{background:transparent;border:1px solid var(--border);color:var(--text)}'
            . '  .section{margin-top:18px}'
            . '  pre{background:#ffffff;border:1px solid var(--border);border-radius:8px;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-word}'
            . '  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}'
            . '</style>'
            . '</head><body>'
            . '<div class="container">'
            . '  <div class="card">'
            . '    <h1>Test Connection</h1>'
            . '    <p class="sub">Send a POST request with a JSON body to validate an API endpoint quickly.</p>'
            . '    <form id="f" onsubmit="submitTest(event)">' 
            . '      <div class="grid">'
            . '        <div class="field">'
            . '          <label for="baseUrl">Base URL</label>'
            . '          <input id="baseUrl" placeholder="https://api.example.com/users" value="https://jsonplaceholder.typicode.com/users" />'
            . '        </div>'
            . '        <div class="field">'
            . '          <label for="method">Method</label>'
            . '          <select id="method"><option>GET</option><option>HEAD</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select>'
            . '        </div>'
            . '      </div>'
            . '      <div class="grid">'
            . '        <div class="field">'
            . '          <label for="headers">Headers (JSON)</label>'
            . '          <textarea id="headers" placeholder="{\"Accept\": \"application/json\"}">{'
            . "\n"
            . '  "Accept": "application/json"'
            . "\n"
            . '}</textarea>'
            . '        </div>'
            . '        <div class="field">'
            . '          <label for="connectionId">Connection ID (optional)</label>'
            . '          <input id="connectionId" placeholder="conn_123" />'
            . '          <label for="timeout" style="margin-top:8px">Timeout (ms)</label>'
            . '          <input id="timeout" type="number" value="30000" />'
            . '        </div>'
            . '      </div>'
            . '      <div class="row">'
            . '        <button id="sendBtn" type="submit" class="btn">Send POST</button>'
            . '        <button type="button" class="btn ghost" onclick="resetForm()">Reset</button>'
            . '      </div>'
            . '    </form>'
            . '    <div class="section two-col">'
            . '      <div>'
            . '        <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:13px">Request Payload</label>'
            . '        <pre id="payloadOut">{}</pre>'
            . '      </div>'
            . '      <div>'
            . '        <label style="display:block;margin-bottom:6px;color:var(--muted);font-size:13px">Response</label>'
            . '        <pre id="out">—</pre>'
            . '      </div>'
            . '    </div>'
            . '  </div>'
            . '</div>'
            . '<script>'
            . 'function buildPayload(){'
            . '  let hdr={};try{hdr=JSON.parse(document.getElementById("headers").value||"{}")}catch(e){hdr={}}'
            . '  const payload={ apiConfig:{ baseUrl:document.getElementById("baseUrl").value.trim(), method:document.getElementById("method").value, headers:hdr }, connectionId:(document.getElementById("connectionId").value||undefined), timeout:parseInt(document.getElementById("timeout").value||"30000") }'
            . '  return payload;'
            . '}'
            . 'function renderPayload(){ const p=buildPayload(); document.getElementById("payloadOut").textContent = JSON.stringify(p, null, 2); }'
            . 'function setBusy(b){ const btn=document.getElementById("sendBtn"); btn.disabled=b; btn.textContent=b?"Testing...":"Send POST"; }'
            . 'async function submitTest(e){ e.preventDefault(); setBusy(true); renderPayload(); const payload=buildPayload(); try{ const r=await fetch(window.location.href,{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload)}); const t=await r.text(); try{ document.getElementById("out").textContent = JSON.stringify(JSON.parse(t), null, 2);}catch(_){ document.getElementById("out").textContent=t;} }catch(err){ document.getElementById("out").textContent=String(err);} finally{ setBusy(false);} }'
            . 'function resetForm(){ document.getElementById("f").reset(); renderPayload(); document.getElementById("out").textContent="—"; }'
            . '["baseUrl","method","headers","connectionId","timeout"].forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener("input", renderPayload); }});'
            . 'renderPayload();'
            . '</script>'
            . '</body></html>';
        exit;
    }
    if (strtoupper($method) !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed', 'allowed' => ['GET','POST']], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Parse JSON body with fallbacks
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    $raw = file_get_contents('php://input');
    $rawTrim = is_string($raw) ? trim($raw) : '';
    $isJson = stripos($contentType, 'application/json') !== false;
    $body = null;

    if ($isJson && $rawTrim !== '') {
        $body = json_decode($rawTrim, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON body', 'valid' => false, 'message' => json_last_error_msg()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }
    } elseif (isset($_POST['payload'])) {
        $payload = (string)$_POST['payload'];
        $body = json_decode($payload, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON body (payload)', 'valid' => false, 'message' => json_last_error_msg()], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        $body = [];
    }

    if (!is_array($body)) { $body = []; }

    error_log('[v0] Testing API connection');

    $connectionId = $body['connectionId'] ?? null;
    $apiConfig = $body['apiConfig'] ?? null;
    $timeoutMs = isset($body['timeout']) ? (int)$body['timeout'] : 30000;

    if (!$apiConfig) {
        http_response_code(400);
        echo json_encode(['error' => 'API configuration is required', 'valid' => false], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $baseUrl = $apiConfig['baseUrl'] ?? null;
    $methodHttp = strtoupper((string)($apiConfig['method'] ?? 'GET'));
    $headersIn = is_array($apiConfig['headers'] ?? null) ? $apiConfig['headers'] : [];

    if (!$baseUrl || trim((string)$baseUrl) === '') {
        http_response_code(400);
        echo json_encode(['error' => 'Base URL is required', 'valid' => false], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Validate URL
    $testUrl = filter_var($baseUrl, FILTER_VALIDATE_URL);
    if ($testUrl === false) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid URL format', 'valid' => false, 'details' => 'Base URL must be a valid HTTP/HTTPS URL'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $parsed = parse_url($baseUrl);
    $scheme = strtolower((string)($parsed['scheme'] ?? ''));
    if (!in_array($scheme, ['http', 'https'], true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Unsupported protocol', 'valid' => false, 'details' => 'Only HTTP and HTTPS protocols are supported'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    $start = microtime(true);
    $testResult = null;

    try {
        // Build headers
        $headers = array_merge([
            'User-Agent' => 'No-Code-API-Connector/1.0',
            'Accept' => 'application/json, text/plain, */*',
        ], $headersIn);

        // Prefer cURL if available
        if (function_exists('curl_init')) {
            $ch = curl_init();
            // remove trailing slash
            $url = rtrim($baseUrl, '/');
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $methodHttp);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HEADER, true);
            curl_setopt($ch, CURLOPT_NOBODY, false);
            curl_setopt($ch, CURLOPT_TIMEOUT_MS, max(1, $timeoutMs));
            if ($scheme === 'https') {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            }
            // headers
            $hdrs = [];
            foreach ($headers as $k => $v) { $hdrs[] = $k . ': ' . $v; }
            if (!empty($hdrs)) { curl_setopt($ch, CURLOPT_HTTPHEADER, $hdrs); }

            $resp = curl_exec($ch);
            if ($resp === false) {
                $err = curl_error($ch);
                $code = curl_errno($ch);
                $responseTime = (int)round((microtime(true) - $start) * 1000);
                $testResult = [
                    'valid' => false,
                    'success' => false,
                    'responseTime' => $responseTime,
                    'error' => 'Connection test failed',
                    'errorType' => 'CONNECTION_ERROR',
                    'errorCode' => $code,
                    'status' => null,
                    'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                    'details' => $err,
                ];
                curl_close($ch);
            } else {
                $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
                $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $bodyStr = substr($resp, $headerSize);
                $responseTime = (int)round((microtime(true) - $start) * 1000);
                $success = ($statusCode >= 200 && $statusCode < 400);
                $data = null; $dataDecoded = json_decode($bodyStr, true);
                $data = (json_last_error() === JSON_ERROR_NONE) ? $dataDecoded : $bodyStr;
                $testResult = [
                    'valid' => true,
                    'success' => $success,
                    'responseTime' => $responseTime,
                    'status' => $statusCode ?: ($success ? 200 : 500),
                    'statusText' => $success ? 'OK' : 'Error',
                    'data' => $data,
                    'error' => $success ? null : 'HTTP error',
                    'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
                ];
                curl_close($ch);
            }
        } else {
            // Fallback: stream context (no header/status easily)
            $url = rtrim($baseUrl, '/');
            $opts = [
                'http' => [
                    'method' => $methodHttp,
                    'header' => implode("\r\n", array_map(fn($k,$v)=>$k.': '.$v, array_keys($headers), array_values($headers))),
                    'timeout' => max(1, (int)ceil($timeoutMs/1000)),
                    'ignore_errors' => true,
                ]
            ];
            $ctx = stream_context_create($opts);
            $bodyStr = @file_get_contents($url, false, $ctx);
            $responseTime = (int)round((microtime(true) - $start) * 1000);
            $statusLine = $http_response_header[0] ?? 'HTTP/1.1 200 OK';
            preg_match('#\s(\d{3})\s#', $statusLine, $m);
            $statusCode = isset($m[1]) ? (int)$m[1] : 200;
            $success = ($statusCode >= 200 && $statusCode < 400);
            $dataDecoded = json_decode((string)$bodyStr, true);
            $data = (json_last_error() === JSON_ERROR_NONE) ? $dataDecoded : $bodyStr;
            $testResult = [
                'valid' => true,
                'success' => $success,
                'responseTime' => $responseTime,
                'status' => $statusCode,
                'statusText' => $success ? 'OK' : 'Error',
                'data' => $data,
                'error' => $success ? null : 'HTTP error',
                'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            ];
        }

        // Optional DB update
        if ($connectionId) {
            try {
                if (class_exists('MongoDB\\Client')) {
                    $mongoUri = env('MONGODB_URI', env('DATABASE_URL', null));
                    $mongoDbName = env('MONGODB_DB', 'smart_travel_v2');
                    if ($mongoUri) {
                        $client = new MongoDB\Client($mongoUri);
                        $db = $client->selectDatabase($mongoDbName);
                        $db->selectCollection('api_connections')->updateOne(
                            ['_id' => $connectionId],
                            ['$set' => [
                                'lastTested' => new MongoDB\BSON\UTCDateTime((new DateTimeImmutable('now', new DateTimeZone('UTC')))->getTimestamp() * 1000),
                                'lastTestResult' => $testResult,
                                'isActive' => (bool)($testResult['success'] ?? false),
                            ]]
                        );
                        error_log('[v0] Updated connection test result in database');
                    }
                }
            } catch (Throwable $dbError) {
                error_log('[v0] Failed to update connection test result: ' . $dbError->getMessage());
            }
        }

    } catch (Throwable $connectionError) {
        $responseTime = (int)round((microtime(true) - $start) * 1000);
        $errorType = 'CONNECTION_ERROR';
        $errorMessage = 'Connection test failed';
        $code = method_exists($connectionError, 'getCode') ? (int)$connectionError->getCode() : 0;
        $message = $connectionError->getMessage();

        $testResult = [
            'valid' => false,
            'success' => false,
            'responseTime' => $responseTime,
            'error' => $errorMessage,
            'errorType' => $errorType,
            'errorCode' => $code,
            'status' => null,
            'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'details' => $message,
        ];
        error_log('[v0] Connection test failed: ' . json_encode($testResult));
    }

    http_response_code(200);
    echo json_encode($testResult, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $error) {
    error_log('[v0] Error in test-connection API: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error during connection test',
        'valid' => false,
        'success' => false,
        'timestamp' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
        'details' => $error->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
