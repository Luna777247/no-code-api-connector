#!/usr/bin/env node

/**
 * Status Check Script for No-Code API Connector
 * Checks if frontend and backend services are running
 */

const http = require('http');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8000';

function checkService(name, url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      resolve({ name, status: 'running', code: res.statusCode });
    });

    req.on('error', () => {
      resolve({ name, status: 'stopped', code: null });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ name, status: 'timeout', code: null });
    });
  });
}

async function checkAllServices() {
  console.log('🔍 Checking No-Code API Connector services...\n');

  const [frontend, backend] = await Promise.all([
    checkService('Frontend (React)', FRONTEND_URL),
    checkService('Backend (PHP)', BACKEND_URL)
  ]);

  const results = [frontend, backend];

  results.forEach(service => {
    const statusIcon = service.status === 'running' ? '✅' : '❌';
    const statusText = service.status === 'running'
      ? `Running (HTTP ${service.code})`
      : service.status === 'timeout'
        ? 'Timeout (service may be starting)'
        : 'Not running';

    console.log(`${statusIcon} ${service.name}: ${statusText}`);
  });

  const allRunning = results.every(service => service.status === 'running');

  console.log('\n' + '='.repeat(50));

  if (allRunning) {
    console.log('🎉 All services are running!');
    console.log(`🌐 Frontend: ${FRONTEND_URL}`);
    console.log(`🔧 Backend: ${BACKEND_URL}`);
  } else {
    console.log('⚠️  Some services are not running.');
    console.log('\nTo start services:');
    console.log('1. Backend: cd backend_php && php artisan serve');
    console.log('2. Frontend: cd frontend && npm run dev');
    console.log('3. Or both: cd frontend && npm run dev:full');
  }

  console.log('='.repeat(50));
}

checkAllServices().catch(console.error);