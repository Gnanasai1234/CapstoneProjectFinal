class ApiConfig {
  constructor() {
    this.environment = null; // Set dynamically by fetchActiveEnvironment()
    this._listeners = [];
    this.baseURL = this.getBaseURL();
    this.healthCheckInterval = 30000;
  }

  getBaseURL() {
    // Always use relative URL so the proxy routes to the correct backend
    return '/api';
  }

  /**
   * Fetches the active environment from the backend.
   * This is the SINGLE SOURCE OF TRUTH — no build-time variables.
   */
  async fetchActiveEnvironment() {
    try {
      const response = await fetch(`${this.baseURL}/environment`);
      if (response.ok) {
        const data = await response.json();
        const changed = this.environment !== data.environment;
        this.environment = data.environment;
        if (changed) this._notifyListeners();
        return data.environment;
      }
    } catch (err) {
      console.warn('[ApiConfig] Failed to fetch active environment:', err.message);
    }
    // Fallback only on first load if backend is unreachable
    if (!this.environment) this.environment = 'unknown';
    return this.environment;
  }

  /** Subscribe to environment changes. Returns an unsubscribe function. */
  onEnvironmentChange(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  _notifyListeners() {
    this._listeners.forEach(cb => cb(this.environment));
  }

  // Get direct backend URL for health checks (bypasses proxy)
  getDirectBackendURL(environment) {
    if (environment === 'green') {
      return process.env.REACT_APP_GREEN_API_URL?.replace('/api', '') || 'http://localhost:5001';
    }
    return process.env.REACT_APP_BLUE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  }

  async checkHealth(environment = null) {
    try {
      const env = environment || this.environment || 'blue';
      const healthURL = this.getDirectBackendURL(env);
      const response = await fetch(`${healthURL}/health`);
      const data = await response.json();
      return {
        healthy: response.status === 200,
        environment: data.environment,
        timestamp: data.timestamp,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
      };
    }
  }

  /** Used internally by HealthMonitor — does NOT trigger listeners */
  switchEnvironment(env) {
    this.environment = env;
  }
}

// Export as ES6 module (React uses ES modules)
const apiConfig = new ApiConfig();
export default apiConfig;

