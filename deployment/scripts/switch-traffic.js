const BlueGreenDeployer = require('./deploy-controller');

const run = async () => {
  const deployer = new BlueGreenDeployer();
  const targetEnv = process.argv[2] || deployer.nextEnvironment;
  
  console.log(`\n🔄 Switching traffic...`);
  console.log(`Current environment: ${deployer.currentEnvironment}`);
  console.log(`Target environment: ${targetEnv}`);
  
  // Validate target environment
  if (targetEnv !== 'blue' && targetEnv !== 'green') {
    console.error(`❌ Invalid environment: ${targetEnv}. Must be 'blue' or 'green'`);
    process.exit(1);
  }
  
  // Check target environment health before switching
  console.log(`\n🏥 Checking target environment health...`);
  const health = await deployer.checkEnvironmentHealth(targetEnv);
  
  if (health.status !== 'healthy') {
    console.error(`❌ Target environment ${targetEnv} is not healthy:`);
    console.error(JSON.stringify(health, null, 2));
    console.error(`⚠️ Aborting traffic switch for safety.`);
    process.exit(1);
  }
  
  console.log(`✅ Target environment is healthy, proceeding with switch...`);
  
  // Switch traffic
  await deployer.switchTraffic(targetEnv);
  deployer.swapEnvironments();
  
  console.log(`\n✅ Traffic successfully switched to ${deployer.currentEnvironment}`);
  console.log(`\n📊 New Status:`);
  const status = await deployer.getStatus();
  console.log(`   Live Environment: ${status.currentEnvironment.toUpperCase()}`);
  console.log(`   Next Environment: ${status.nextEnvironment.toUpperCase()}`);
};

if (require.main === module) {
  run().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

