const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

class BlueGreenDeployer {
  constructor() {
    this.stateFilePath = path.resolve(__dirname, '..', '.deployment-state.json');
    this.healthCheckTimeout = 30000;
    this.healthCheckInterval = 5000;
    this.nginxConfigPath = path.resolve(__dirname, '..', 'nginx', 'nginx.conf');
    this.nginxDockerConfigPath = path.resolve(__dirname, '..', 'nginx', 'nginx.docker.conf');
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const state = JSON.parse(fs.readFileSync(this.stateFilePath, 'utf-8'));
        this.currentEnvironment = state.currentEnvironment || 'blue';
        this.nextEnvironment = state.nextEnvironment || 'green';
        this.lastDeployment = state.lastDeployment || null;
        this.deploymentHistory = state.deploymentHistory || [];
      } else {
        this.currentEnvironment = 'blue';
        this.nextEnvironment = 'green';
        this.lastDeployment = null;
        this.deploymentHistory = [];
        this.saveState();
      }
    } catch (error) {
      console.warn('Error loading state, using defaults:', error.message);
      this.currentEnvironment = 'blue';
      this.nextEnvironment = 'green';
      this.lastDeployment = null;
      this.deploymentHistory = [];
    }
  }

  saveState() {
    try {
      const state = {
        currentEnvironment: this.currentEnvironment,
        nextEnvironment: this.nextEnvironment,
        lastDeployment: this.lastDeployment,
        deploymentHistory: this.deploymentHistory.slice(-10), // Keep last 10 deployments
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(this.stateFilePath, JSON.stringify(state, null, 2));
    } catch (error) {
      console.error('Error saving state:', error.message);
    }
  }

  addDeploymentRecord(version, environment, status, error = null) {
    const record = {
      version,
      environment,
      status,
      timestamp: new Date().toISOString(),
      error: error ? error.message : null
    };
    this.deploymentHistory.push(record);
    this.lastDeployment = record;
    this.saveState();
  }

  async deploy(version = 'dev', options = {}) {
    const { skipDbSync = false, skipTrafficSwitch = false, canaryPercentage = 0 } = options;

    console.log(`\n🚀 Starting deployment of version ${version} to ${this.nextEnvironment} environment`);
    console.log(`Current live environment: ${this.currentEnvironment}`);
    console.log(`Target environment: ${this.nextEnvironment}`);

    try {
      // Pre-deployment cleanup
      await this.preDeploymentCleanup();

      // Pre-deployment validation
      await this.validatePreDeployment(this.nextEnvironment);

      // Step 1: Sync database if needed
      if (!skipDbSync) {
        console.log('\n📊 Step 1: Syncing database...');
        await this.syncDatabase();
      }

      // Step 2: Build and deploy
      console.log('\n🔨 Step 2: Building and deploying...');
      await this.buildAndDeployNextEnvironment(version);

      // Step 3: Health checks
      console.log('\n🏥 Step 3: Performing health checks...');
      const isHealthy = await this.performHealthChecks(this.nextEnvironment);
      if (!isHealthy) {
        console.error('❌ Health checks failed. Rolling back staged resources.');
        await this.rollbackDeployment(this.nextEnvironment);
        this.addDeploymentRecord(version, this.nextEnvironment, 'failed', new Error('Health checks failed'));
        return false;
      }

      // Step 4: Traffic switching
      if (!skipTrafficSwitch) {
        console.log('\n🔄 Step 4: Switching traffic...');
        if (canaryPercentage > 0 && canaryPercentage < 100) {
          await this.switchTrafficGradual(this.nextEnvironment, canaryPercentage);
        } else {
          await this.switchTraffic(this.nextEnvironment);
          this.swapEnvironments();
        }
      }

      console.log(`\n✅ Successfully deployed version ${version}. Live environment: ${this.nextEnvironment}`);
      this.addDeploymentRecord(version, this.nextEnvironment, 'success');
      return true;
    } catch (error) {
      console.error('\n❌ Deployment failed:', error);
      await this.rollbackDeployment(this.nextEnvironment);
      this.addDeploymentRecord(version, this.nextEnvironment, 'failed', error);
      return false;
    }
  }

  async preDeploymentCleanup() {
    console.log('🧹 Performing pre-deployment cleanup...');

    const dirsToClean = [
      path.resolve('frontend', 'build'),
      path.resolve('frontend', 'build-blue'),
      path.resolve('frontend', 'build-green'),
      path.resolve('frontend', 'node_modules', '.cache')
    ];

    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        try {
          await this.forceDelete(dir);
          console.log(`✅ Cleaned: ${path.basename(dir)}`);
        } catch (error) {
          console.warn(`⚠️  Could not clean ${dir}: ${error.message}`);
        }
      }
    }
  }

  async forceDelete(dirPath) {
    try {
      // Change file attributes to remove read-only flags (Windows specific)
      const removeReadOnly = (dir) => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach((file) => {
            const curPath = path.join(dir, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              removeReadOnly(curPath);
            } else {
              try {
                fs.chmodSync(curPath, 0o666); // Make writable
              } catch (e) {
                // Ignore permission errors on individual files
              }
            }
          });
        }
      };

      removeReadOnly(dirPath);
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3 });

    } catch (error) {
      throw new Error(`Failed to delete directory ${dirPath}: ${error.message}`);
    }
  }

  async validatePreDeployment(environment) {
    console.log(`Validating ${environment} environment...`);

    // Check if target environment files exist
    const envDir = path.resolve('backend', environment);
    if (!fs.existsSync(envDir)) {
      throw new Error(`Environment directory ${envDir} does not exist`);
    }

    // Check if backend service is running and accessible
    const port = environment === 'blue' ? 5000 : 5001;
    try {
      const testConn = await fetch(`http://localhost:${port}/health`, { timeout: 3000 });
      if (testConn.status === 200) {
        const health = await testConn.json();
        console.log(`✅ ${environment} backend is running and healthy`);
        console.log(`   Service: ${health.service}, Database: ${health.database}`);
      } else {
        console.warn(`⚠️ ${environment} backend responded with status ${testConn.status}`);
      }
    } catch (error) {
      console.warn(`⚠️ ${environment} backend not accessible on port ${port}`);
      console.warn(`   This is OK if you're starting it for the first time`);
      console.warn(`   Make sure to start it with: npm run dev:${environment}`);
    }
  }

  async syncDatabase() {
    try {
      const DatabaseMigrator = require('../../database/migrations/migrate-blue-to-green');
      // Sync from current environment to next environment
      const sourceEnv = this.currentEnvironment;
      const targetEnv = this.nextEnvironment;
      console.log(`   Syncing database: ${sourceEnv} → ${targetEnv}`);
      const migrator = new DatabaseMigrator(sourceEnv, targetEnv);
      await migrator.syncDatabases();
      console.log('✅ Database sync completed');
    } catch (error) {
      console.warn('⚠️ Database sync failed, continuing deployment:', error.message);
      // Don't fail deployment if sync fails
    }
  }

  async buildAndDeployNextEnvironment(version) {
    console.log(`Building frontend & deploying backend to ${this.nextEnvironment}...`);
    await this.buildFrontend(this.nextEnvironment, version);
    this.deployBackend(this.nextEnvironment, version);
    await this.waitForServices(this.nextEnvironment);
  }

  async buildFrontend(environment, version) {
    const envFile = path.resolve('frontend', environment === 'blue' ? 'env.blue' : 'env.green');
    const targetEnvFile = path.resolve('frontend', '.env');

    if (!fs.existsSync(envFile)) {
      throw new Error(`Missing frontend env file for ${environment}: ${envFile}`);
    }

    // Copy environment file
    fs.copyFileSync(envFile, targetEnvFile);
    console.log(`📦 Building frontend for ${environment} environment (version: ${version})`);

    try {
      // Install dependencies if needed
      const nodeModulesPath = path.resolve('frontend', 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        console.log('Installing frontend dependencies...');
        execSync('cd frontend && npm install', { stdio: 'inherit' });
      }

      // Build React app
      execSync('cd frontend && npm run build', { stdio: 'inherit' });

      // Move build to environment-specific directory with retry logic
      const srcDir = path.resolve('frontend', 'build');
      const destDir = path.resolve('frontend', environment === 'blue' ? 'build-blue' : 'build-green');

      await this.robustDirectoryMove(srcDir, destDir);
      console.log(`✅ Frontend built successfully: ${destDir}`);
    } catch (error) {
      console.error('Frontend build failed:', error.message);
      throw error;
    }
  }

  async robustDirectoryMove(srcDir, destDir, maxRetries = 5, retryDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // First, ensure destination directory is completely removed
        if (fs.existsSync(destDir)) {
          await this.forceDelete(destDir);
        }

        // Wait a bit for any locks to be released
        await this.sleep(500);

        // Now rename the source directory
        fs.renameSync(srcDir, destDir);
        return; // Success!

      } catch (error) {
        if (attempt === maxRetries) {
          // Final fallback: use copy instead of rename
          console.log('🔄 Final attempt: Using copy instead of rename...');
          await this.copyDirectory(srcDir, destDir);
          return;
        }

        console.log(`⚠️  Attempt ${attempt}/${maxRetries} failed: ${error.message}. Retrying in ${retryDelay}ms...`);
        await this.sleep(retryDelay);

        // Increase delay for next attempt (exponential backoff)
        retryDelay *= 1.5;
      }
    }
  }

  async copyDirectory(src, dest) {
    if (!fs.existsSync(src)) {
      throw new Error(`Source directory does not exist: ${src}`);
    }

    if (fs.existsSync(dest)) {
      await this.forceDelete(dest);
    }

    fs.mkdirSync(dest, { recursive: true });

    const files = fs.readdirSync(src);
    for (const file of files) {
      const srcPath = path.join(src, file);
      const destPath = path.join(dest, file);

      if (fs.lstatSync(srcPath).isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }

    // Delete source after successful copy
    await this.forceDelete(src);
  }

  deployBackend(environment) {
    const envDir = path.resolve('backend', environment);
    const envSource = path.join(envDir, 'env');
    const envFile = path.join(envDir, '.env');

    // Copy environment file if it exists
    if (fs.existsSync(envSource)) {
      fs.copyFileSync(envSource, envFile);
    } else if (!fs.existsSync(envFile)) {
      console.warn(`⚠️ No environment file found for ${environment}, using defaults`);
    }

    const port = environment === 'blue' ? 5000 : 5001;
    const serviceName = `backend-${environment}`;
    console.log(`🚀 Deploying backend service ${serviceName} on port ${port}`);

    // Check if PM2 is available
    let pm2Available = false;
    try {
      execSync('pm2 --version', { stdio: 'ignore' });
      pm2Available = true;
    } catch {
      console.warn('⚠️ PM2 not found. Backend will need to be started manually.');
    }

    if (pm2Available) {
      const ecosystemConfig = {
        apps: [{
          name: serviceName,
          script: path.resolve('backend', 'shared', 'server.js'),
          cwd: path.resolve('backend', 'shared'),
          env: {
            NODE_ENV: 'production',
            PORT: port,
            APP_ENVIRONMENT: environment,
            MONGODB_URI: `mongodb://localhost:27017/mernapp_${environment}`,
            SERVICE_NAME: serviceName,
            ENV_FILE: envFile
          },
          instances: 1,
          exec_mode: 'fork',
          watch: false,
          autorestart: true,
          max_restarts: 10,
          min_uptime: '10s'
        }]
      };

      const ecosystemPath = path.join(envDir, 'ecosystem.config.js');
      fs.writeFileSync(ecosystemPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);

      try {
        // Stop existing service
        execSync(`pm2 delete ${serviceName}`, { stdio: 'ignore' });
      } catch {
        // Service doesn't exist, that's fine
      }

      // Start new service
      execSync(`pm2 start ${ecosystemPath}`, { stdio: 'inherit' });
      console.log(`✅ Backend ${serviceName} started with PM2`);
    } else {
      console.log(`ℹ️ To start backend manually, run: cd backend/${environment} && node ../shared/server.js`);
      console.log(`   Or set environment variables and run: npm run dev:${environment}`);
    }
  }

  async waitForServices(environment) {
    console.log(`Waiting for ${environment} services to warm up...`);
    await this.sleep(5000);
  }

  async performHealthChecks(environment) {
    const port = environment === 'blue' ? 5000 : 5001;
    const healthEndpoint = `http://localhost:${port}/health`;
    const start = Date.now();
    let attempts = 0;
    const maxAttempts = Math.floor(this.healthCheckTimeout / this.healthCheckInterval);

    console.log(`Checking health of ${environment} environment at ${healthEndpoint}...`);

    while (Date.now() - start < this.healthCheckTimeout) {
      attempts++;
      try {
        const response = await fetch(healthEndpoint, { timeout: 3000 });
        const data = await response.json();

        if (response.status === 200 && data.status === 'healthy') {
          console.log(`✅ Health check passed for ${environment} (attempt ${attempts}/${maxAttempts})`);
          console.log(`   Status: ${data.status}, Database: ${data.database}, Environment: ${data.environment}`);
          return true;
        } else {
          console.log(`⚠️ Health check returned status ${response.status}: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        console.log(`⏳ Health check attempt ${attempts}/${maxAttempts} failed: ${error.message}`);
      }

      if (attempts < maxAttempts) {
        await this.sleep(this.healthCheckInterval);
      }
    }

    console.error(`❌ Health checks timed out for ${environment} after ${attempts} attempts`);
    return false;
  }

  async switchTraffic(targetEnvironment) {
    console.log(`🔄 Switching traffic to ${targetEnvironment} environment...`);

    // Validate target environment is healthy before switching
    console.log(`\n🏥 Verifying ${targetEnvironment} environment health before switch...`);
    const health = await this.checkEnvironmentHealth(targetEnvironment);
    if (health.status !== 'healthy') {
      throw new Error(`Cannot switch to ${targetEnvironment}: environment is not healthy. Status: ${health.status}`);
    }
    console.log(`✅ ${targetEnvironment} environment is healthy, proceeding with switch`);

    // Check if nginx is running in Docker
    let isDocker = false;
    try {
      const dockerCheck = execSync('docker ps --filter name=blue-green-nginx --format "{{.Names}}"', { encoding: 'utf-8', stdio: 'pipe' });
      isDocker = dockerCheck.trim() === 'blue-green-nginx';
    } catch (error) {
      // Docker not available or container not running
    }

    // Generate updated nginx config based on which file to use
    let configPath, config;
    if (isDocker) {
      configPath = this.nginxDockerConfigPath;
      // Read Docker config template
      if (!fs.existsSync(configPath)) {
        throw new Error(`Docker nginx config not found: ${configPath}`);
      }
      config = fs.readFileSync(configPath, 'utf-8');
    } else {
      configPath = this.nginxConfigPath;
      // Read regular config template
      if (!fs.existsSync(configPath)) {
        throw new Error(`Nginx config not found: ${configPath}`);
      }
      config = fs.readFileSync(configPath, 'utf-8');
    }

    // Replace the active environment variable
    const originalConfig = config;
    let newConfig = config;

    // Try multiple patterns to find and replace the set statement
    // Pattern 1: Standard format - set $active_environment "blue" or "green"
    newConfig = config.replace(
      /(set\s+\$active_environment\s+")(blue|green)(";?)/g,
      `$1${targetEnvironment}$3`
    );

    // Pattern 2: Any quoted value (if pattern 1 didn't match)
    if (newConfig === config) {
      newConfig = config.replace(
        /(set\s+\$active_environment\s+")([^"]*)(";?)/g,
        `$1${targetEnvironment}$3`
      );
    }

    // Pattern 3: Handle tabs or different spacing
    if (newConfig === config) {
      newConfig = config.replace(
        /(set[ \t]+\$active_environment[ \t]+")([^"]*)(";?)/g,
        `$1${targetEnvironment}$3`
      );
    }

    // If still not replaced, check if it's already set to target OR show helpful error
    if (newConfig === config) {
      // First check if already set to target - that's OK, not an error
      const alreadySetPattern = new RegExp(`set\\s+\\$active_environment\\s+"${targetEnvironment}"`);
      if (alreadySetPattern.test(config)) {
        console.log(`ℹ️ Nginx config already set to ${targetEnvironment}, no change needed`);
        // Skip the rest, go directly to reload
      } else {
        const lines = config.split('\n');
        // Find the line that has "set" and "active_environment" (not "map")
        const envLineIndex = lines.findIndex(line =>
          line.includes('active_environment') &&
          line.includes('set') &&
          !line.includes('map')
        );

        if (envLineIndex >= 0) {
          const envLine = lines[envLineIndex].trim();
          console.error(`\n❌ Could not match pattern in nginx config.`);
          console.error(`   Found line ${envLineIndex + 1}: ${envLine}`);
          console.error(`   Looking for: set $active_environment "(blue|green)"`);
          console.error(`   Trying to set to: ${targetEnvironment}`);
          console.error(`   Config file: ${configPath}`);

          // Show a few lines around it for context
          const start = Math.max(0, envLineIndex - 2);
          const end = Math.min(lines.length, envLineIndex + 3);
          console.error(`   Context:`);
          for (let i = start; i < end; i++) {
            const marker = i === envLineIndex ? '>>>' : '   ';
            console.error(`   ${marker} ${i + 1}: ${lines[i]}`);
          }

          throw new Error(`Failed to update active_environment in nginx config.\nFound: "${envLine}"\nExpected pattern: set $active_environment "(blue|green)"`);
        } else {
          throw new Error(`active_environment SET statement not found in nginx config file: ${configPath}\n(Found map statements but not the set statement)`);
        }
      }
    }

    config = newConfig;

    // Verify the change was made OR the value was already correct
    if (config === originalConfig) {
      // Check if already set to target - that's OK
      const alreadySetPattern = new RegExp(`set\\s+\\$active_environment\\s+"${targetEnvironment}"`);
      if (alreadySetPattern.test(originalConfig)) {
        console.log(`ℹ️ Nginx config already set to ${targetEnvironment}, no change needed`);
      } else {
        throw new Error(`Config replacement failed - config unchanged. Target: ${targetEnvironment}`);
      }
    }

    // Write updated config
    fs.writeFileSync(configPath, config);
    console.log(`✅ Nginx configuration updated: ${path.basename(configPath)}`);
    console.log(`   Active environment set to: ${targetEnvironment}`);

    // Reload nginx
    if (isDocker) {
      try {
        // Since the config is mounted as a volume, updating the host file should update the container
        // Wait a moment for file system to sync
        await this.sleep(300);

        // Test the config to make sure it's valid
        console.log(`   Testing nginx configuration...`);
        execSync('docker exec blue-green-nginx nginx -t', { stdio: 'pipe' });

        // Reload nginx in Docker container (will read the updated config from volume)
        console.log(`   Reloading nginx...`);
        execSync('docker exec blue-green-nginx nginx -s reload', { stdio: 'pipe' });
        console.log(`✅ Nginx reloaded successfully in Docker container`);
      } catch (error) {
        // If reload fails, try restarting the container (picks up volume changes)
        console.warn(`⚠️ Nginx reload failed (${error.message}), restarting container...`);
        try {
          execSync('docker restart blue-green-nginx', { stdio: 'pipe' });
          await this.sleep(2000); // Wait for container to restart
          console.log(`✅ Nginx container restarted with new configuration`);
        } catch (restartError) {
          console.error(`❌ Failed to reload/restart nginx in Docker`);
          console.error(`   The config file has been updated on the host: ${configPath}`);
          console.error(`   Please manually reload nginx:`);
          console.error(`   1. docker exec blue-green-nginx nginx -t`);
          console.error(`   2. docker exec blue-green-nginx nginx -s reload`);
          console.error(`   Or restart: docker restart blue-green-nginx`);
          // Don't throw - the config is updated, just needs manual reload
        }
      }
    } else {
      // Try to reload nginx on host
      try {
        // Test config first
        execSync('nginx -t', { stdio: 'inherit' });
        execSync('nginx -s reload', { stdio: 'inherit' });
        console.log(`✅ Nginx reloaded successfully`);
      } catch (error) {
        console.error(`❌ Failed to reload nginx: ${error.message}`);
        console.error(`   Please reload manually: nginx -s reload`);
        throw error;
      }
    }

    // Also update state
    this.currentEnvironment = targetEnvironment;
    this.nextEnvironment = targetEnvironment === 'blue' ? 'green' : 'blue';
    this.saveState();

    console.log(`✅ Traffic successfully switched to ${targetEnvironment} environment`);
    console.log(`   Current live: ${this.currentEnvironment}`);
    console.log(`   Next deployment: ${this.nextEnvironment}`);
  }

  async switchTrafficGradual(targetEnvironment, percentage) {
    console.log(`🔄 Gradually switching ${percentage}% traffic to ${targetEnvironment}...`);
    // For now, this is a placeholder for canary deployment
    // In production, you'd use nginx split_clients or similar
    console.log(`⚠️ Gradual traffic switching not fully implemented. Switching 100% traffic.`);
    await this.switchTraffic(targetEnvironment);
  }

  generateNginxConfig(activeEnvironment) {
    // This method is kept for backward compatibility
    // The actual config generation is now done in switchTraffic()
    const template = fs.readFileSync(this.nginxConfigPath, 'utf-8');
    return template.replace(
      /set \$active_environment "(blue|green)"/g,
      `set $active_environment "${activeEnvironment}"`
    );
  }

  swapEnvironments() {
    [this.currentEnvironment, this.nextEnvironment] = [this.nextEnvironment, this.currentEnvironment];
  }

  async rollbackDeployment(environment) {
    console.log(`Rolling back deployment artifacts for ${environment}`);
    try {
      execSync(`pm2 stop backend-${environment}`, { stdio: 'ignore' });
    } catch {
      /* ignore */
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getStatus() {
    const blueHealth = await this.checkEnvironmentHealth('blue');
    const greenHealth = await this.checkEnvironmentHealth('green');

    return {
      currentEnvironment: this.currentEnvironment,
      nextEnvironment: this.nextEnvironment,
      lastDeployment: this.lastDeployment,
      blue: {
        health: blueHealth,
        port: 5000,
        url: 'http://localhost:5000'
      },
      green: {
        health: greenHealth,
        port: 5001,
        url: 'http://localhost:5001'
      },
      deploymentHistory: this.deploymentHistory.slice(-5)
    };
  }

  async checkEnvironmentHealth(environment) {
    const port = environment === 'blue' ? 5000 : 5001;
    try {
      const response = await fetch(`http://localhost:${port}/health`, { timeout: 3000 });
      if (response.ok) {
        const data = await response.json();
        return {
          status: 'healthy',
          ...data
        };
      }
      return { status: 'unhealthy', httpStatus: response.status };
    } catch (error) {
      return { status: 'unreachable', error: error.message };
    }
  }
}

const run = async () => {
  const command = process.argv[2];
  const deployer = new BlueGreenDeployer();

  try {
    switch (command) {
      case 'blue':
        // Deploy to blue: blue becomes next, current becomes the opposite
        deployer.nextEnvironment = 'blue';
        // If current is already blue, switch to green as current
        if (deployer.currentEnvironment === 'blue') {
          deployer.currentEnvironment = 'green';
        }
        // Otherwise keep current as is (it will be swapped after deployment)
        await deployer.deploy(process.argv[3] || 'manual');
        break;
      case 'green':
        // Deploy to green: green becomes next, current becomes the opposite
        deployer.nextEnvironment = 'green';
        // If current is already green, switch to blue as current
        if (deployer.currentEnvironment === 'green') {
          deployer.currentEnvironment = 'blue';
        }
        // Otherwise keep current as is (it will be swapped after deployment)
        await deployer.deploy(process.argv[3] || 'manual');
        break;
      case 'switch':
        const targetEnv = process.argv[3] || deployer.nextEnvironment;
        await deployer.switchTraffic(targetEnv);
        deployer.swapEnvironments();
        console.log(`✅ Traffic switched to ${deployer.currentEnvironment}`);
        break;
      case 'status':
        const status = await deployer.getStatus();
        console.log('\n📊 Deployment Status:');
        console.log(JSON.stringify(status, null, 2));
        break;
      case 'health':
        const blueHealth = await deployer.checkEnvironmentHealth('blue');
        const greenHealth = await deployer.checkEnvironmentHealth('green');
        console.log('\n🏥 Health Status:');
        console.log('Blue:', JSON.stringify(blueHealth, null, 2));
        console.log('Green:', JSON.stringify(greenHealth, null, 2));
        break;
      case 'cleanup':
        await deployer.preDeploymentCleanup();
        console.log('✅ Cleanup completed');
        break;
      default:
        console.log('Usage:');
        console.log('  node deploy-controller.js blue [version]  - Deploy to blue');
        console.log('  node deploy-controller.js green [version]  - Deploy to green');
        console.log('  node deploy-controller.js switch [env]    - Switch traffic');
        console.log('  node deploy-controller.js status           - Show status');
        console.log('  node deploy-controller.js health           - Check health');
        console.log('  node deploy-controller.js cleanup          - Clean build directories');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  run();
}

module.exports = BlueGreenDeployer;