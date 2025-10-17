/**
 * Quick API Test Script
 * Fast smoke test for critical endpoints
 * 
 * Usage: node scripts/test-api-quick.js
 */

const BASE_URL = 'http://localhost:3000';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

async function quickTest() {
  console.log(`${colors.cyan}
╔════════════════════════════════════════════╗
║      QUICK API SMOKE TEST                 ║
║      Testing Critical Endpoints           ║
╚════════════════════════════════════════════╝
${colors.reset}`);

  const tests = [
    { name: 'Health Check', url: '/api/health' },
    { name: 'System Status', url: '/api/status' },
    { name: 'Get Connections', url: '/api/connections' },
    { name: 'Get Runs', url: '/api/runs' },
    { name: 'Get Mappings', url: '/api/mappings' },
    { name: 'Get Schedules', url: '/api/scheduler' },
    { name: 'Connection Analytics', url: '/api/analytics/connections' },
    { name: 'Run Analytics', url: '/api/analytics/runs' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const start = Date.now();
    try {
      const response = await fetch(`${BASE_URL}${test.url}`);
      const duration = Date.now() - start;
      
      if (response.ok) {
        console.log(`${colors.green}✅ ${test.name} ${colors.reset}(${duration}ms)`);
        passed++;
      } else {
        console.log(`${colors.red}❌ ${test.name} - Status: ${response.status}${colors.reset}`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}❌ ${test.name} - Error: ${error.message}${colors.reset}`);
      failed++;
    }
  }

  console.log(`\n${colors.cyan}═══════════════════════════════════════════${colors.reset}`);
  console.log(`Total: ${tests.length} | ${colors.green}Passed: ${passed}${colors.reset} | ${colors.red}Failed: ${failed}${colors.reset}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log(`${colors.cyan}═══════════════════════════════════════════${colors.reset}\n`);

  return failed === 0;
}

quickTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(`${colors.red}❌ Test failed: ${error.message}${colors.reset}`);
    process.exit(1);
  });
