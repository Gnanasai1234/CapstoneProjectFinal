const fetch = require('node-fetch');
const { execSync } = require('child_process');

class RollbackController {
  constructor(errorThreshold = 0.05, intervalMs = 30000) {
    this.errorThreshold = errorThreshold;
    this.intervalMs = intervalMs;
    this.monitorInterval = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = 3;
  }

  startMonitoring() {
    if (this.monitorInterval) {
      console.log('⚠️ Monitoring already running');
      return;
    }
    
    console.log('🔍 Starting automated rollback monitoring');
    this.monitorInterval = setInterval(() => this.checkAndRollback(), this.intervalMs);
    
    // Immediate first check
    this.checkAndRollback();
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('🛑 Rollback monitoring stopped');
    }
  }

  async checkAndRollback() {
    try {
      const currentEnv = await this.getCurrentEnvironment();
      const errorRate = await this.calculateRealErrorRate(currentEnv);
      
      console.log(`📊 ${currentEnv} error rate: ${(errorRate * 100).toFixed(2)}%`);
      
      if (errorRate > this.errorThreshold) {
        this.consecutiveFailures++;
        console.warn(`🚨 High error rate detected (${this.consecutiveFailures}/${this.maxConsecutiveFailures})`);
        
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          await this.triggerRollback(currentEnv, errorRate);
          this.consecutiveFailures = 0;
        }
      } else {
        this.consecutiveFailures = 0; // Reset on healthy state
      }
    } catch (error) {
      console.error('❌ Rollback monitor error:', error.message);
      this.consecutiveFailures++;
    }
  }

  async getCurrentEnvironment() {
    // Try to read from deployment state file first
    const fs = require('fs');
    const path = require('path');
    const stateFile = path.resolve(__dirname, '..', '.deployment-state.json');
    
    try {
      if (fs.existsSync(stateFile)) {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
        if (state.currentEnvironment) {
          return state.currentEnvironment;
        }
      }
    } catch (error) {
      // Fall through to other methods
    }

    // Fallback: Check nginx config
    try {
      const nginxConfigPath = path.resolve(__dirname, '..', 'nginx', 'nginx.conf');
      if (fs.existsSync(nginxConfigPath)) {
        const nginxConfig = fs.readFileSync(nginxConfigPath, 'utf-8');
        const match = nginxConfig.match(/set \$active_environment "(\w+)"/);
        if (match) {
          return match[1];
        }
      }
    } catch (error) {
      // Ignore
    }

    // Default fallback
    return 'blue';
  }

  async calculateRealErrorRate(environment) {
    const port = environment === 'blue' ? 5000 : 5001;
    try {
      const response = await fetch(`http://localhost:${port}/health`, { timeout: 5000 });
      
      if (response.status !== 200) {
        return 1.0; // Complete failure
      }
      
      const health = await response.json();
      
      // Check health status
      if (health.status !== 'healthy') {
        return 0.8; // Degraded state
      }
      
      // Check database connection
      if (health.database !== 'connected') {
        return 0.6; // Database issues
      }
      
      // In production, you'd query your metrics database (Prometheus, Datadog, etc.)
      // For now, simulate based on health check response time
      const responseTime = Date.now() - new Date(health.timestamp).getTime();
      if (responseTime > 5000) {
        return 0.3; // Slow response
      }
      
      // Healthy - low error rate
      return Math.random() * 0.02; // 0-2% error rate for healthy systems
      
    } catch (error) {
      console.error(`❌ Error calculating error rate for ${environment}:`, error.message);
      return 1.0; // Treat connection errors as 100% failure
    }
  }

  async triggerRollback(failedEnvironment, errorRate) {
    const targetEnvironment = failedEnvironment === 'blue' ? 'green' : 'blue';
    
    console.log(`🔄 Triggering rollback from ${failedEnvironment} to ${targetEnvironment}`);
    
    try {
      // Verify target environment is healthy before switching
      const targetHealth = await fetch(`http://localhost:8080/health/${targetEnvironment}`, { timeout: 5000 });
      if (targetHealth.status !== 200) {
        throw new Error(`Target environment ${targetEnvironment} is not healthy`);
      }

      // Switch traffic using deploy controller
      const BlueGreenDeployer = require('./deploy-controller');
      const deployer = new BlueGreenDeployer();
      
      deployer.currentEnvironment = failedEnvironment;
      deployer.nextEnvironment = targetEnvironment;
      
      await deployer.switchTraffic(targetEnvironment);
      deployer.swapEnvironments();
      
      this.notifyRollback(failedEnvironment, targetEnvironment, errorRate);
      console.log(`✅ Successfully rolled back to ${targetEnvironment}`);
      
    } catch (error) {
      console.error(`💥 Rollback failed: ${error.message}`);
      await this.emergencyProcedure(failedEnvironment, error);
    }
  }

  notifyRollback(fromEnv, toEnv, errorRate) {
    const message = {
      event: 'automated_rollback',
      timestamp: new Date().toISOString(),
      from_environment: fromEnv,
      to_environment: toEnv,
      error_rate: errorRate,
      threshold: this.errorThreshold,
      reason: 'high_error_rate'
    };
    
    console.log('🚨 AUTOMATED ROLLBACK TRIGGERED:', JSON.stringify(message, null, 2));
    
    // In production, send to Slack/email/etc.
    // this.sendNotification(message);
  }

  async emergencyProcedure(failedEnvironment, error) {
    console.error(`🚨 EMERGENCY: Rollback failed for ${failedEnvironment}`);
    console.error('Error:', error.message);
    
    // Implement emergency procedures here
    // - Alert on-call engineer
    // - Attempt to restart services
    // - Fallback to static maintenance page
    
    // For now, just log and exit
    process.exit(1);
  }
}

// Command line interface
if (require.main === module) {
  const controller = new RollbackController();
  
  if (process.argv.includes('--monitor')) {
    console.log('Starting continuous monitoring...');
    controller.startMonitoring();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down monitor...');
      controller.stopMonitoring();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down monitor...');
      controller.stopMonitoring();
      process.exit(0);
    });
  } else {
    // Single check
    controller.checkAndRollback()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Rollback check failed:', error);
        process.exit(1);
      });
  }
}

module.exports = RollbackController;