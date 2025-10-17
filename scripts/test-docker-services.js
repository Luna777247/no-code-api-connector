// Test Docker Services Connection
// Run: node scripts/test-docker-services.js

const Redis = require('ioredis');

console.log('[v0] Testing Docker Services...\n');

// Test Redis Connection
async function testRedis() {
  try {
    console.log('🔴 Testing Redis connection at localhost:6380...');
    const redis = new Redis({
      host: 'localhost',
      port: 6380,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 50, 2000);
      }
    });

    await redis.ping();
    console.log('✅ Redis: Connected successfully');
    
    // Test set/get
    await redis.set('test_key', 'test_value');
    const value = await redis.get('test_key');
    console.log(`✅ Redis: Test write/read successful (value: ${value})`);
    
    await redis.del('test_key');
    await redis.quit();
    
    return true;
  } catch (error) {
    console.error('❌ Redis Error:', error.message);
    return false;
  }
}

// Test Metabase Connection
async function testMetabase() {
  try {
    console.log('\n📊 Testing Metabase connection at localhost:3001...');
    
    const response = await fetch('http://localhost:3001/api/health');
    const data = await response.json();
    
    if (data.status === 'ok') {
      console.log('✅ Metabase: Health check passed');
      console.log('✅ Metabase: Web UI available at http://localhost:3001');
      return true;
    } else {
      console.error('❌ Metabase: Unexpected health status:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Metabase Error:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=' .repeat(60));
  console.log('  Docker Services Health Check');
  console.log('=' .repeat(60) + '\n');
  
  const redisOk = await testRedis();
  const metabaseOk = await testMetabase();
  
  console.log('\n' + '=' .repeat(60));
  console.log('  Summary');
  console.log('=' .repeat(60));
  console.log(`Redis:    ${redisOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Metabase: ${metabaseOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log('=' .repeat(60));
  
  if (redisOk && metabaseOk) {
    console.log('\n🎉 All Docker services are running correctly!');
    console.log('\n📌 Next steps:');
    console.log('   1. Open Metabase UI: http://localhost:3001');
    console.log('   2. Start Next.js dev server: npm run dev');
    console.log('   3. Your app will use Redis cache automatically');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some services failed. Check Docker containers:');
    console.log('   docker-compose -f docker-compose.metabase.yml ps');
    console.log('   docker logs metabase');
    console.log('   docker logs metabase-redis');
    process.exit(1);
  }
}

runTests();
