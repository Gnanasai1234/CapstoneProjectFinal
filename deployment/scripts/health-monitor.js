const fetch = require('node-fetch');

const checkHealth = async (env) => {
  const port = env === 'blue' ? 5000 : 5001;
  try {
    const response = await fetch(`http://localhost:${port}/health`, { timeout: 3000 });
    if (response.ok) {
      const json = await response.json();
      return {
        environment: env,
        status: 'healthy',
        httpStatus: response.status,
        port: port,
        details: json
      };
    } else {
      return {
        environment: env,
        status: 'unhealthy',
        httpStatus: response.status,
        port: port
      };
    }
  } catch (error) {
    return {
      environment: env,
      status: 'unreachable',
      port: port,
      error: error.message
    };
  }
};

const healthMonitor = async () => {
  console.log('\n🏥 Health Check Report');
  console.log('='.repeat(60));
  
  const [blue, green] = await Promise.all([
    checkHealth('blue'),
    checkHealth('green')
  ]);
  
  // Blue status
  console.log(`\n🔵 Blue Environment (Port ${blue.port}):`);
  if (blue.status === 'healthy') {
    console.log('   ✅ Status: HEALTHY');
    if (blue.details) {
      console.log(`   Service: ${blue.details.service || 'N/A'}`);
      console.log(`   Database: ${blue.details.database || 'N/A'}`);
      console.log(`   Environment: ${blue.details.environment || 'N/A'}`);
      console.log(`   Timestamp: ${blue.details.timestamp || 'N/A'}`);
    }
  } else if (blue.status === 'unhealthy') {
    console.log(`   ⚠️  Status: UNHEALTHY (HTTP ${blue.httpStatus})`);
  } else {
    console.log(`   ❌ Status: UNREACHABLE`);
    console.log(`   Error: ${blue.error || 'Connection failed'}`);
  }
  
  // Green status
  console.log(`\n🟢 Green Environment (Port ${green.port}):`);
  if (green.status === 'healthy') {
    console.log('   ✅ Status: HEALTHY');
    if (green.details) {
      console.log(`   Service: ${green.details.service || 'N/A'}`);
      console.log(`   Database: ${green.details.database || 'N/A'}`);
      console.log(`   Environment: ${green.details.environment || 'N/A'}`);
      console.log(`   Timestamp: ${green.details.timestamp || 'N/A'}`);
    }
  } else if (green.status === 'unhealthy') {
    console.log(`   ⚠️  Status: UNHEALTHY (HTTP ${green.httpStatus})`);
  } else {
    console.log(`   ❌ Status: UNREACHABLE`);
    console.log(`   Error: ${green.error || 'Connection failed'}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  const bothHealthy = blue.status === 'healthy' && green.status === 'healthy';
  const oneHealthy = blue.status === 'healthy' || green.status === 'healthy';
  
  if (bothHealthy) {
    console.log('✅ Both environments are healthy');
  } else if (oneHealthy) {
    console.log('⚠️  One environment is healthy, one is not');
  } else {
    console.log('❌ Both environments are unhealthy or unreachable');
  }
  console.log();
};

if (require.main === module) {
  healthMonitor().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { checkHealth, healthMonitor };

