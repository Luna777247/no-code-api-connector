// Test script to check Looker Studio embedding
const https = require('https');

async function testLookerStudioEmbed() {
  const reportUrl = 'https://lookerstudio.google.com/embed/reporting/cb87db24-90b3-47f2-a510-812cd9673172/page/TlJ0C';

  console.log('[TEST] Testing Looker Studio embed URL...');
  console.log('[TEST] URL:', reportUrl);

  return new Promise((resolve, reject) => {
    const url = new URL(reportUrl);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      console.log('[TEST] Response status:', res.statusCode);
      console.log('[TEST] Response headers:');

      // Check important headers
      const importantHeaders = ['x-frame-options', 'content-security-policy', 'x-content-type-options'];
      importantHeaders.forEach(header => {
        if (res.headers[header]) {
          console.log(`  ${header}: ${res.headers[header]}`);
        }
      });

      // Check for X-Frame-Options
      const xFrameOptions = res.headers['x-frame-options'];
      if (xFrameOptions) {
        console.log('[TEST] ❌ X-Frame-Options detected:', xFrameOptions);
        console.log('[TEST] This prevents iframe embedding!');
      } else {
        console.log('[TEST] ✅ No X-Frame-Options header found');
      }

      // Check CSP
      const csp = res.headers['content-security-policy'];
      if (csp) {
        console.log('[TEST] Content-Security-Policy found');
        if (csp.includes('frame-ancestors')) {
          const frameAncestors = csp.split(';').find(part => part.trim().startsWith('frame-ancestors'));
          if (frameAncestors) {
            console.log('[TEST] CSP frame-ancestors:', frameAncestors.trim());
          }
        }
      }

      res.on('data', () => {}); // Consume data
      res.on('end', () => {
        console.log('[TEST] Response ended');

        // Test embed URL (already an embed URL)
        const embedUrl = reportUrl;
        console.log('[TEST] Testing embed URL:', embedUrl);

        const embedUrlObj = new URL(embedUrl);
        const embedOptions = {
          hostname: embedUrlObj.hostname,
          path: embedUrlObj.pathname + embedUrlObj.search,
          method: 'GET',
          headers: options.headers,
          timeout: 10000
        };

        const embedReq = https.request(embedOptions, (embedRes) => {
          console.log('[TEST] Embed URL response status:', embedRes.statusCode);

          const embedXFrameOptions = embedRes.headers['x-frame-options'];
          if (embedXFrameOptions) {
            console.log('[TEST] ❌ Embed URL also has X-Frame-Options:', embedXFrameOptions);
            console.log('[TEST] ❌ Google Looker Studio does not allow iframe embedding');
            console.log('[TEST] 💡 Solution: Use external link fallback');
          } else {
            console.log('[TEST] ✅ Embed URL has no X-Frame-Options!');
            console.log('[TEST] ✅ Should work with iframe embedding');
          }

          embedRes.on('data', () => {});
          embedRes.on('end', resolve);
        });

        embedReq.on('error', (err) => {
          console.error('[TEST] Embed URL error:', err.message);
          resolve();
        });

        embedReq.end();
      });
    });

    req.on('error', (err) => {
      console.error('[TEST] Error:', err.message);
      reject(err);
    });

    req.end();
  });
}

testLookerStudioEmbed().catch(console.error);