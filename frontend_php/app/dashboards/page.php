<?php
declare(strict_types=1);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Analytics Dashboards</title>
  <!-- If your project bundles Tailwind, these classes will apply. -->
  <style>
    /* Fallback minimal styles if Tailwind isn't present */
    .container { max-width: 1024px; margin: 0 auto; }
    .mx-auto { margin-left: auto; margin-right: auto; }
    .p-6 { padding: 1.5rem; }
    .space-y-8 > * + * { margin-top: 2rem; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .gap-4 { gap: 1rem; }
    .mb-4 { margin-bottom: 1rem; }
    .flex-col { flex-direction: column; }
    .gap-2 { gap: 0.5rem; }
    .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
    .font-bold { font-weight: 700; }
    .tracking-tight { letter-spacing: -0.015em; }
    .text-muted-foreground { color: #6b7280; }
    .border { border: 1px solid #e5e7eb; }
    .rounded-lg { border-radius: 0.5rem; }
    .p-4 { padding: 1rem; }
  </style>
</head>
<body>
  <div class="container mx-auto p-6 space-y-8">
    <div class="flex items-center gap-4 mb-4">
      <!-- BackToHomeButton equivalent -->
      <a href="/" class="border rounded-lg p-4" aria-label="Back to Home">← Back</a>
    </div>

    <div class="flex flex-col gap-2">
      <h1 class="text-3xl font-bold tracking-tight">Analytics Dashboards</h1>
      <p class="text-muted-foreground">
        Real-time insights and visualizations powered by Google Looker Studio
      </p>
    </div>

    <!-- Main Dashboard -->
    <?php
      $reportUrl = "https://lookerstudio.google.com/embed/reporting/cb87db24-90b3-47f2-a510-812cd9673172/page/TlJ0C";
      $title = "ETL Performance Dashboard";
      $description = "Monitor API runs, data quality, and system health in real-time";
      $bordered = true; // corresponds to bordered={true}
      $titled = true;   // corresponds to titled={true}
      $theme = "light"; // theme="light" (for potential future use)
      $height = "800px"; // height="800px"
      $autoRefresh = true; // autoRefresh={true}
      $refreshInterval = 300; // refreshInterval={300} (seconds)
      $showControls = true; // showControls={true} (not directly applicable to Looker embed)
      $fallbackToExternal = true; // fallbackToExternal={true}
    ?>

    <section class="<?php echo $bordered ? 'border rounded-lg p-4' : ''; ?>" data-theme="<?php echo htmlspecialchars($theme, ENT_QUOTES); ?>">
      <?php if ($titled): ?>
        <header class="flex flex-col gap-2" style="margin-bottom: 0.5rem;">
          <h2 class="text-3xl font-bold tracking-tight" style="font-size: 1.25rem;"><?php echo htmlspecialchars($title, ENT_QUOTES); ?></h2>
          <p class="text-muted-foreground" style="font-size: 0.95rem; "><?php echo htmlspecialchars($description, ENT_QUOTES); ?></p>
        </header>
      <?php endif; ?>

      <div id="dashboard-container">
        <iframe
          id="dashboard-iframe"
          title="<?php echo htmlspecialchars($title, ENT_QUOTES); ?>"
          src="<?php echo htmlspecialchars($reportUrl, ENT_QUOTES); ?>"
          style="width: 100%; height: <?php echo htmlspecialchars($height, ENT_QUOTES); ?>; border: 0;"
          loading="lazy"
          allowfullscreen
        ></iframe>
      </div>

      <?php if ($fallbackToExternal): ?>
        <div style="margin-top: 0.5rem;">
          <a href="<?php echo htmlspecialchars($reportUrl, ENT_QUOTES); ?>" target="_blank" rel="noopener noreferrer">
            Open in a new tab
          </a>
        </div>
      <?php endif; ?>
    </section>
  </div>

  <script>
    (function() {
      var autoRefresh = <?php echo $autoRefresh ? 'true' : 'false'; ?>;
      var refreshInterval = <?php echo (int)$refreshInterval; ?>; // seconds
      if (!autoRefresh || !refreshInterval || refreshInterval <= 0) return;

      var iframe = document.getElementById('dashboard-iframe');
      if (!iframe) return;

      setInterval(function() {
        try {
          // Reload the iframe by resetting its src
          var src = iframe.getAttribute('src');
          // Bust cache via query param
          var url = new URL(src, window.location.origin);
          url.searchParams.set('_t', Date.now().toString());
          iframe.setAttribute('src', url.toString());
        } catch (e) {
          // Fallback simple reload
          iframe.src = iframe.src;
        }
      }, refreshInterval * 1000);
    })();
  </script>
</body>
</html>
