// Quick test script to switch nginx traffic
const BlueGreenDeployer = require('./deploy-controller');

const targetEnv = process.argv[2] || 'green';

async function testSwitch() {
  const deployer = new BlueGreenDeployer();
  console.log(`Testing traffic switch to ${targetEnv}...`);
  console.log(`Current environment: ${deployer.currentEnvironment}`);
  
  await deployer.switchTraffic(targetEnv);
  
  console.log(`\n✅ Switch complete!`);
  console.log(`New current environment: ${deployer.currentEnvironment}`);
  console.log(`\nTest the switch:`);
  console.log(`  curl http://localhost:80/health`);
  console.log(`  curl http://localhost:8080/health/blue`);
  console.log(`  curl http://localhost:8080/health/green`);
}

testSwitch().catch(console.error);

