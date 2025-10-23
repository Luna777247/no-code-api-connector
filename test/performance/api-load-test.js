import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '2m', target: 200 }, // Ramp up to 200 users over 2 minutes
    { duration: '5m', target: 200 }, // Stay at 200 users for 5 minutes
    { duration: '2m', target: 0 },   // Ramp down to 0 users over 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(99)<1500'], // 99% of requests must complete below 1.5s
    http_req_failed: ['rate<0.1'],     // Error rate must be below 10%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Test connections API
  const connectionsResponse = http.get(`${BASE_URL}/api/connections`)
  check(connectionsResponse, {
    'connections status is 200': (r) => r.status === 200,
    'connections response time < 500ms': (r) => r.timings.duration < 500,
  })

  // Test runs API with pagination
  const runsResponse = http.get(`${BASE_URL}/api/runs?page=1&limit=20`)
  check(runsResponse, {
    'runs status is 200': (r) => r.status === 200,
    'runs response time < 1000ms': (r) => r.timings.duration < 1000,
  })

  // Test analytics API
  const analyticsResponse = http.get(`${BASE_URL}/api/analytics/summary`)
  check(analyticsResponse, {
    'analytics status is 200': (r) => r.status === 200,
    'analytics response time < 2000ms': (r) => r.timings.duration < 2000,
  })

  sleep(1)
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'performance-report.json': JSON.stringify(data),
  }
}