<?php
// POST /api/execute-run - Execute a workflow run (mirrors TS behavior)

declare(strict_types=1);

// Resolve project root and composer autoload like the established pattern
define('ROOT_PATH', realpath(__DIR__ . '/../../..'));

// backend base should point to backend_php directory
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

// Load .env
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
    // Allow GET to serve a simple test form; keep POST for actual execution
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (strtoupper($method) === 'GET') {
        header('Content-Type: text/html; charset=utf-8');
        http_response_code(200);
        echo '<!DOCTYPE html>'
            . '<html lang="en">'
            . '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">'
            . '<title>Execute Run</title>'
            . '<style>'
            . '  :root{--bg:#f7fafc;--card:#ffffff;--muted:#64748b;--text:#0f172a;--accent:#2563eb;--border:#e2e8f0}'
            . '  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;background:var(--bg);color:var(--text);margin:0;padding:32px}'
            . '  .container{max-width:900px;margin:0 auto}'
            . '  .card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px 24px;box-shadow:0 10px 30px rgba(2,6,23,.06)}'
            . '  h1{margin:0 0 8px 0;font-size:22px}'
            . '  p.sub{margin:0 0 24px 0;color:var(--muted)}'
            . '  label{font-size:13px;color:var(--muted);margin-bottom:6px;display:block}'
            . '  textarea{width:100%;min-height:180px;color:var(--text);background:#ffffff;border:1px solid var(--border);border-radius:8px;padding:10px 12px;outline:none;resize:vertical}'
            . '  .row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:12px 0}'
            . '  .btn{background:var(--accent);border:none;color:#ffffff;font-weight:700;padding:10px 16px;border-radius:8px;cursor:pointer}'
            . '  .btn[disabled]{opacity:.7;cursor:not-allowed}'
            . '  .ghost{background:transparent;border:1px solid var(--border);color:var(--text)}'
            . '  pre{background:#ffffff;border:1px solid var(--border);border-radius:8px;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-word}'
            . '</style>'
            . '</head><body>'
            . '<div class="container">'
            . '  <div class="card">'
            . '    <h1>Execute Run</h1>'
            . '    <p class="sub">Send a POST request with a JSON body to execute a workflow.</p>'
            . '    <form onsubmit="submitExec(event)">'
            . '      <label for="payload">JSON Payload</label>'
            . '      <textarea id="payload">{'
            . "\n"
            . '  "workflowId": "test-1",'
            . "\n"
            . '  "params": { '
            . "\n"
            . '    "foo": "bar"'
            . "\n"
            . '  }'
            . "\n"
            . '}</textarea>'
            . '      <div class="row">'
            . '        <button id="sendBtn" type="submit" class="btn">Send POST</button>'
            . '        <button type="button" class="btn ghost" onclick="resetExec()">Reset</button>'
            . '      </div>'
            . '    </form>'
            . '    <label style="display:block;margin:8px 0 6px;color:var(--muted);font-size:13px">Response</label>'
            . '    <pre id="out">—</pre>'
            . '  </div>'
            . '</div>'
            . '<script>'
            . 'function setBusy(b){ const btn=document.getElementById("sendBtn"); btn.disabled=b; btn.textContent=b?"Executing...":"Send POST"; }'
            . 'function resetExec(){ document.getElementById("payload").value = `{'
            . "\n"
            . '  "workflowId": "test-1",'
            . "\n"
            . '  "params": { '
            . "\n"
            . '    "foo": "bar"'
            . "\n"
            . '  }'
            . "\n"
            . '}`; document.getElementById("out").textContent = "—"; }'
            . 'async function submitExec(e){ e.preventDefault(); setBusy(true); const raw=document.getElementById("payload").value; try{ new Function("return ("+raw+")")(); }catch(_){ /* ignore if not valid JSON object literal */ } try{ const r=await fetch(window.location.href,{ method:"POST", headers:{"Content-Type":"application/json"}, body: raw }); const t=await r.text(); try{ document.getElementById("out").textContent = JSON.stringify(JSON.parse(t), null, 2);}catch(_){ document.getElementById("out").textContent=t;} }catch(err){ document.getElementById("out").textContent=String(err);} finally{ setBusy(false);} }'
            . '</script>'
            . '</body></html>';
        exit;
    }
    if (strtoupper($method) !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'error' => 'Method Not Allowed',
            'allowed' => ['GET','POST']
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Read JSON body with fallbacks
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
    $raw = file_get_contents('php://input');
    $body = null;
    $rawTrim = is_string($raw) ? trim($raw) : '';
    $isJson = stripos($contentType, 'application/json') !== false;

    if ($isJson && $rawTrim !== '') {
        $body = json_decode($rawTrim, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('[execute-run] JSON decode error: ' . json_last_error_msg() . ' | raw=' . substr($rawTrim, 0, 500));
            http_response_code(400);
            echo json_encode([
                'error' => 'Invalid JSON body',
                'message' => json_last_error_msg(),
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        }
    } elseif (!$isJson) {
        // Support x-www-form-urlencoded or multipart: expect a field named 'payload' containing JSON
        if (isset($_POST['payload']) && is_string($_POST['payload'])) {
            $payload = trim((string)$_POST['payload']);
            $body = json_decode($payload, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log('[execute-run] Form payload JSON decode error: ' . json_last_error_msg() . ' | payload=' . substr($payload, 0, 500));
                http_response_code(400);
                echo json_encode([
                    'error' => 'Invalid JSON body (payload)',
                    'message' => json_last_error_msg(),
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }
        } elseif ($rawTrim !== '') {
            // Try to parse even if content-type is missing
            $body = json_decode($rawTrim, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log('[execute-run] Unknown content-type, JSON decode error: ' . json_last_error_msg() . ' | raw=' . substr($rawTrim, 0, 500));
                http_response_code(400);
                echo json_encode([
                    'error' => 'Invalid JSON body',
                    'message' => json_last_error_msg(),
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
    }

    if ($body === null) {
        // Accept empty body as empty object
        $body = new stdClass();
    }

    error_log('[v0] Received run execution request: ' . (is_string($raw) ? $raw : json_encode($body)));

    // Orchestrator: if a PHP orchestrator is available, call it; otherwise return a safe mock
    $orchestratorAvailable = false;
    $result = null;

    // If you implement a PHP orchestrator, set the class here and wire it up
    $possibleClasses = [
        '\\App\\WorkflowOrchestrator',
        'WorkflowOrchestrator',
    ];

    foreach ($possibleClasses as $cls) {
        if (class_exists($cls)) {
            $orchestratorAvailable = true;
            // $orchestrator = new $cls();
            // $result = $orchestrator->executeWorkflow($body);
            break;
        }
    }

    if (!$orchestratorAvailable) {
        // Mock successful workflow execution (dev fallback), mirrors structure similar to TS expectations
        $start = microtime(true);
        // ... simulate processing ...
        usleep(25 * 1000); // 25ms
        $end = microtime(true);
        $durationMs = (int)round(($end - $start) * 1000);

        $nowIso = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601);
        $result = [
            'status' => 'completed',
            'message' => 'Mock workflow executed (PHP orchestrator not available)',
            'request' => $body,
            'startedAt' => $nowIso,
            'completedAt' => (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format(DATE_ISO8601),
            'durationMs' => $durationMs,
            'steps' => [],
            'orchestratorAvailable' => false,
        ];
    }

    error_log('[v0] Workflow execution completed: ' . json_encode($result));

    http_response_code(200);
    echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (Throwable $error) {
    error_log('[v0] Error executing workflow: ' . $error->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to execute workflow',
        'message' => $error->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}
