const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const fetchStatus = async (env) => {
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

const getDeploymentState = () => {
  const stateFile = path.resolve(__dirname, '..', '.deployment-state.json');
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    }
  } catch (error) {
    // Ignore
  }
  return null;
};

const run = async () => {
  console.log('\n📊 Blue-Green Deployment Status\n');
  console.log('='.repeat(60));

  // Get deployment state
  const state = getDeploymentState();
  if (state) {
    console.log('\n🔹 Current Configuration:');
    console.log(`   Live Environment: ${state.currentEnvironment.toUpperCase()}`);
    console.log(`   Next Environment: ${state.nextEnvironment.toUpperCase()}`);
    if (state.lastDeployment) {
      console.log(`   Last Deployment: ${state.lastDeployment.timestamp}`);
      console.log(`   Version: ${state.lastDeployment.version}`);
      console.log(`   Status: ${state.lastDeployment.status}`);
    }
  }

  // Get health status
  console.log('\n🏥 Environment Health:');
  const [blue, green] = await Promise.all([fetchStatus('blue'), fetchStatus('green')]);
  
  console.log(`\n   Blue Environment (Port ${blue.port}):`);
  console.log(`   Status: ${blue.status === 'healthy' ? '✅ Healthy' : blue.status === 'unhealthy' ? '⚠️ Unhealthy' : '❌ Unreachable'}`);
  if (blue.details) {
    console.log(`   Service: ${blue.details.service || 'N/A'}`);
    console.log(`   Database: ${blue.details.database || 'N/A'}`);
    console.log(`   Timestamp: ${blue.details.timestamp || 'N/A'}`);
  }
  if (blue.error) {
    console.log(`   Error: ${blue.error}`);
  }

  console.log(`\n   Green Environment (Port ${green.port}):`);
  console.log(`   Status: ${green.status === 'healthy' ? '✅ Healthy' : green.status === 'unhealthy' ? '⚠️ Unhealthy' : '❌ Unreachable'}`);
  if (green.details) {
    console.log(`   Service: ${green.details.service || 'N/A'}`);
    console.log(`   Database: ${green.details.database || 'N/A'}`);
    console.log(`   Timestamp: ${green.details.timestamp || 'N/A'}`);
  }
  if (green.error) {
    console.log(`   Error: ${green.error}`);
  }

  // Deployment history
  if (state && state.deploymentHistory && state.deploymentHistory.length > 0) {
    console.log('\n📜 Recent Deployment History:');
    state.deploymentHistory.slice(-5).forEach((record, index) => {
      const statusIcon = record.status === 'success' ? '✅' : '❌';
      console.log(`   ${index + 1}. ${statusIcon} ${record.environment} - ${record.version} - ${record.status} - ${new Date(record.timestamp).toLocaleString()}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Commands:');
  console.log('   npm run deploy:blue      - Deploy to blue');
  console.log('   npm run deploy:green    - Deploy to green');
  console.log('   npm run deploy:switch   - Switch traffic');
  console.log('   npm run health:check    - Check health\n');
};

if (require.main === module) {
  run().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { fetchStatus, getDeploymentState };

