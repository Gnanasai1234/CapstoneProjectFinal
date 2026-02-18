import ApiConfig from '../config/api';

class HealthMonitor {
  constructor() {
    this.intervalId = null;
    this.isMonitoring = false;
    this.healthStatus = {
      blue: { healthy: true, lastChecked: null },
      green: { healthy: true, lastChecked: null },
    };
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.intervalId = setInterval(() => {
      this.checkBothEnvironments();
    }, ApiConfig.healthCheckInterval);
    console.log('Health monitoring started');
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
    console.log('Health monitoring stopped');
  }

  async checkBothEnvironments() {
    const blue = await this.checkEnvironment('blue');
    const green = await this.checkEnvironment('green');

    this.healthStatus.blue = blue;
    this.healthStatus.green = green;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('healthStatusUpdate', { detail: this.healthStatus })
      );
    }

    return this.healthStatus;
  }

  /**
   * Check a specific environment's health directly (bypasses proxy).
   * Uses getDirectBackendURL() instead of mutating ApiConfig.environment,
   * which was causing the environment state to become stale/inconsistent.
   */
  async checkEnvironment(env) {
    try {
      const result = await ApiConfig.checkHealth(env);
      return {
        healthy: result.healthy,
        lastChecked: new Date().toISOString(),
        environment: result.environment || env,
      };
    } catch (error) {
      return {
        healthy: false,
        lastChecked: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  getHealthStatus() {
    return this.healthStatus;
  }
}

// Export as ES6 module (React uses ES modules)
const healthMonitor = new HealthMonitor();
export default healthMonitor;
