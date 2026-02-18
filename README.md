## MERN Stack Blue-Green Deployment Implementation Guide

This project implements a complete GitOps-driven, service-mesh-ready blue/green deployment model tailored for MERN workloads. The focus is on zero-downtime releases, Istio-style traffic management, and automated rollback logic without relying on external CI/CD pipelines.

## 🚀 Quick Start

For detailed setup instructions, see [SETUP_INSTRUCTIONS.md](./SETUP_INSTRUCTIONS.md)

For a quick start guide, see [QUICK_START.md](./QUICK_START.md)

For complete blue-green deployment guide, see [deployment/BLUE_GREEN_DEPLOYMENT_GUIDE.md](./deployment/BLUE_GREEN_DEPLOYMENT_GUIDE.md)

### Prerequisites
- Node.js (v16+)
- MongoDB (v4.4+)
- npm

### Quick Run
```bash
# Install dependencies
npm install
cd frontend && npm install && cd ..

# Start MongoDB (ensure it's running)

# Start blue backend (Terminal 1)
npm run dev:blue

# Start green backend (Terminal 2)
npm run dev:green

# Start frontend (Terminal 3)
cd frontend && npm start
```

Access the application at http://localhost:3000

### Project Structure
```
mern-blue-green-deployment/
├── backend/
│   ├── blue/
│   ├── green/
│   ├── shared/
│   └── deployment/
├── frontend/
│   ├── build-blue/
│   ├── build-green/
│   └── src/
├── deployment/
│   ├── nginx/
│   ├── scripts/
│   ├── docker/
│   └── monitoring/
└── database/
    ├── migrations/
    └── scripts/
```

---

## 1. Backend Implementation (Node.js/Express)

### `backend/shared/app.js`
```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: process.env.SERVICE_NAME || 'backend',
        environment: process.env.NODE_ENV || 'development',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    };
    
    const statusCode = mongoose.connection.readyState === 1 ? 200 : 503;
    res.status(statusCode).json(healthStatus);
});

// Metrics endpoint for monitoring
app.get('/metrics', (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        database: {
            connections: mongoose.connection.readyState,
            models: Object.keys(mongoose.connection.models)
        }
    };
    res.json(metrics);
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/products', require('./routes/products'));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err 
    });
});

module.exports = app;
```

### `backend/shared/server.js`
```javascript
const app = require('./app');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mernapp';

// Database connection with retry logic
const connectDB = async (retries = 5, delay = 5000) => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error(`MongoDB connection failed: ${error.message}`);
        if (retries > 0) {
            console.log(`Retrying connection in ${delay}ms...`);
            setTimeout(() => connectDB(retries - 1, delay), delay);
        } else {
            console.error('Max retries reached. Exiting...');
            process.exit(1);
        }
    }
};

// Start server
const startServer = async () => {
    await connectDB();
    
    const server = app.listen(PORT, () => {
        console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        console.log(`Environment: ${process.env.APP_ENVIRONMENT || 'blue'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        server.close(() => {
            mongoose.connection.close();
            process.exit(0);
        });
    });
};

startServer();
```

### Environment-Specific Configuration

`backend/blue/.env`
```
NODE_ENV=production
PORT=5000
APP_ENVIRONMENT=blue
MONGODB_URI=mongodb://localhost:27017/mernapp_blue
SERVICE_NAME=backend-blue
API_VERSION=v1-blue
```

`backend/green/.env`
```
NODE_ENV=production
PORT=5001
APP_ENVIRONMENT=green
MONGODB_URI=mongodb://localhost:27017/mernapp_green
SERVICE_NAME=backend-green
API_VERSION=v1-green
```

---

## 2. Frontend Implementation (React)

### `frontend/src/config/api.js`
```javascript
class ApiConfig {
    constructor() {
        this.environment = process.env.REACT_APP_ENVIRONMENT || 'blue';
        this.baseURL = this.getBaseURL();
        this.healthCheckInterval = 30000; // 30 seconds
    }

    getBaseURL() {
        const env = this.environment;
        if (env === 'green') {
            return process.env.REACT_APP_GREEN_API_URL || 'http://localhost:5001/api';
        }
        // Default to blue
        return process.env.REACT_APP_BLUE_API_URL || 'http://localhost:5000/api';
    }

    // Health check method
    async checkHealth() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
            const data = await response.json();
            return {
                healthy: response.status === 200,
                environment: data.environment,
                timestamp: data.timestamp
            };
        } catch (error) {
            return {
                healthy: false,
                error: error.message
            };
        }
    }

    // Switch environment dynamically
    switchEnvironment(env) {
        this.environment = env;
        this.baseURL = this.getBaseURL();
        console.log(`Switched to ${env} environment`);
    }
}

export default new ApiConfig();
```

### `frontend/src/services/healthMonitor.js`
```javascript
import ApiConfig from '../config/api';

class HealthMonitor {
    constructor() {
        this.isMonitoring = false;
        this.intervalId = null;
        this.healthStatus = {
            blue: { healthy: true, lastChecked: null },
            green: { healthy: true, lastChecked: null }
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
        const blueHealth = await this.checkEnvironment('blue');
        const greenHealth = await this.checkEnvironment('green');
        
        this.healthStatus.blue = blueHealth;
        this.healthStatus.green = greenHealth;

        // Emit custom event for health status update
        window.dispatchEvent(new CustomEvent('healthStatusUpdate', {
            detail: this.healthStatus
        }));
    }

    async checkEnvironment(env) {
        const originalEnv = ApiConfig.environment;
        ApiConfig.switchEnvironment(env);
        
        try {
            const health = await ApiConfig.checkHealth();
            return {
                healthy: health.healthy,
                lastChecked: new Date().toISOString(),
                environment: health.environment
            };
        } catch (error) {
            return {
                healthy: false,
                lastChecked: new Date().toISOString(),
                error: error.message
            };
        } finally {
            ApiConfig.switchEnvironment(originalEnv);
        }
    }

    getHealthStatus() {
        return this.healthStatus;
    }
}

export default new HealthMonitor();
```

### Environment-Specific Build Configs
`frontend/build-blue/.env`
```
REACT_APP_ENVIRONMENT=blue
REACT_APP_BLUE_API_URL=http://localhost:5000/api
REACT_APP_GREEN_API_URL=http://localhost:5001/api
REACT_APP_VERSION=1.0.0-blue
```

`frontend/build-green/.env`
```
REACT_APP_ENVIRONMENT=green
REACT_APP_BLUE_API_URL=http://localhost:5000/api
REACT_APP_GREEN_API_URL=http://localhost:5001/api
REACT_APP_VERSION=1.0.0-green
```

---

## 3. Nginx Configuration for Traffic Routing

`deployment/nginx/nginx.conf`
```nginx
events {
    worker_connections 1024;
}

http {
    upstream blue_backend {
        server localhost:5000;
    }

    upstream green_backend {
        server localhost:5001;
    }

    upstream blue_frontend {
        server localhost:3000;
    }

    upstream green_frontend {
        server localhost:3001;
    }

    # Health check endpoint for backends
    server {
        listen 8080;
        location /health/blue {
            proxy_pass http://blue_backend/health;
        }
        
        location /health/green {
            proxy_pass http://green_backend/health;
        }
    }

    # Main server with blue-green routing
    server {
        listen 80;
        server_name localhost;

        # Default route (currently active environment)
        set $active_environment "blue";

        # Frontend routing
        location / {
            if ($active_environment = "blue") {
                proxy_pass http://blue_frontend;
            }
            if ($active_environment = "green") {
                proxy_pass http://green_frontend;
            }
            
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Environment $active_environment;
        }

        # API routing
        location /api/ {
            if ($active_environment = "blue") {
                proxy_pass http://blue_backend;
            }
            if ($active_environment = "green") {
                proxy_pass http://green_backend;
            }
            
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Environment $active_environment;
        }

        # Health checks
        location /health {
            if ($active_environment = "blue") {
                proxy_pass http://blue_backend/health;
            }
            if ($active_environment = "green") {
                proxy_pass http://green_backend/health;
            }
        }
    }
}
```

---

## 4. Deployment Scripts

### Main Deployment Controller – `deployment/scripts/deploy-controller.js`
```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BlueGreenDeployer {
    constructor() {
        this.currentEnvironment = 'blue';
        this.nextEnvironment = 'green';
        this.healthCheckTimeout = 30000; // 30 seconds
        this.healthCheckInterval = 5000; // 5 seconds
    }

    // Deploy to next environment
    async deploy(version) {
        console.log(`Starting deployment of version ${version} to ${this.nextEnvironment} environment`);
        
        try {
            // 1. Build and deploy to next environment
            await this.buildAndDeployNextEnvironment(version);
            
            // 2. Run health checks
            const isHealthy = await this.performHealthChecks(this.nextEnvironment);
            
            if (!isHealthy) {
                console.error('Health checks failed for new deployment. Aborting switch.');
                await this.rollbackDeployment(this.nextEnvironment);
                return false;
            }
            
            // 3. Switch traffic
            await this.switchTraffic();
            
            // 4. Update current environment tracking
            this.swapEnvironments();
            
            console.log(`Successfully deployed version ${version} and switched traffic to ${this.currentEnvironment}`);
            return true;
            
        } catch (error) {
            console.error('Deployment failed:', error);
            await this.rollbackDeployment(this.nextEnvironment);
            return false;
        }
    }

    async buildAndDeployNextEnvironment(version) {
        console.log(`Building and deploying to ${this.nextEnvironment} environment...`);
        
        // Build frontend for next environment
        this.buildFrontend(this.nextEnvironment, version);
        
        // Deploy backend to next environment
        this.deployBackend(this.nextEnvironment, version);
        
        // Wait for services to start
        await this.waitForServices(this.nextEnvironment);
    }

    buildFrontend(environment, version) {
        const envFile = environment === 'blue' ? '.env.blue' : '.env.green';
        const buildDir = environment === 'blue' ? 'build-blue' : 'build-green';
        
        console.log(`Building frontend for ${environment}...`);
        
        // Copy environment file
        execSync(`cp frontend/${envFile} frontend/.env`);
        
        // Build React app
        execSync('cd frontend && npm run build', { stdio: 'inherit' });
        
        // Move build to environment-specific directory
        execSync(`rm -rf frontend/${buildDir} && mv frontend/build frontend/${buildDir}`);
        
        console.log(`Frontend built successfully for ${environment}`);
    }

    deployBackend(environment, version) {
        console.log(`Deploying backend to ${environment}...`);
        
        const port = environment === 'blue' ? 5000 : 5001;
        const serviceName = `backend-${environment}`;
        
        // Stop existing service
        try {
            execSync(`pm2 stop ${serviceName} || true`);
        } catch (error) {
            // Service might not be running
        }
        
        // Start new service
        const ecosystemConfig = {
            name: serviceName,
            script: 'backend/shared/server.js',
            env: {
                NODE_ENV: 'production',
                PORT: port,
                APP_ENVIRONMENT: environment,
                MONGODB_URI: `mongodb://localhost:27017/mernapp_${environment}`,
                SERVICE_NAME: serviceName
            }
        };
        
        fs.writeFileSync(
            `backend/${environment}/ecosystem.config.js`,
            `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`
        );
        
        execSync(`cd backend/${environment} && pm2 start ecosystem.config.js`, { stdio: 'inherit' });
        
        console.log(`Backend deployed successfully to ${environment}`);
    }

    async performHealthChecks(environment) {
        console.log(`Performing health checks for ${environment} environment...`);
        
        const startTime = Date.now();
        const healthEndpoint = `http://localhost:8080/health/${environment}`;
        
        while (Date.now() - startTime < this.healthCheckTimeout) {
            try {
                const response = execSync(`curl -s -o /dev/null -w "%{http_code}" ${healthEndpoint}`).toString();
                
                if (response === '200') {
                    console.log(`Health check passed for ${environment}`);
                    return true;
                }
            } catch (error) {
                // Health check failed, continue waiting
            }
            
            console.log(`Health check failed for ${environment}, retrying...`);
            await this.sleep(this.healthCheckInterval);
        }
        
        console.error(`Health checks timed out for ${environment}`);
        return false;
    }

    async switchTraffic() {
        console.log('Switching traffic to new environment...');
        
        // Update nginx configuration
        const newConfig = this.generateNginxConfig(this.nextEnvironment);
        fs.writeFileSync('deployment/nginx/nginx.conf', newConfig);
        
        // Reload nginx
        execSync('nginx -s reload');
        
        console.log('Traffic switched successfully');
    }

    generateNginxConfig(activeEnvironment) {
        return `
events {
    worker_connections 1024;
}

http {
    upstream blue_backend {
        server localhost:5000;
    }

    upstream green_backend {
        server localhost:5001;
    }

    upstream blue_frontend {
        server localhost:3000;
    }

    upstream green_frontend {
        server localhost:3001;
    }

    server {
        listen 80;
        server_name localhost;

        set $active_environment "${activeEnvironment}";

        location / {
            if ($active_environment = "blue") {
                proxy_pass http://blue_frontend;
            }
            if ($active_environment = "green") {
                proxy_pass http://green_frontend;
            }
        }

        location /api/ {
            if ($active_environment = "blue") {
                proxy_pass http://blue_backend;
            }
            if ($active_environment = "green") {
                proxy_pass http://green_backend;
            }
        }

        location /health {
            if ($active_environment = "blue") {
                proxy_pass http://blue_backend/health;
            }
            if ($active_environment = "green") {
                proxy_pass http://green_backend/health;
            }
        }
    }
}
        `;
    }

    swapEnvironments() {
        [this.currentEnvironment, this.nextEnvironment] = [this.nextEnvironment, this.currentEnvironment];
    }

    async rollbackDeployment(environment) {
        console.log(`Rolling back deployment from ${environment}...`);
        
        // Switch back to current environment
        await this.switchTraffic();
        
        // Stop the failed deployment
        try {
            execSync(`pm2 stop backend-${environment}`);
        } catch (error) {
            console.error(`Error stopping ${environment} service:`, error);
        }
        
        console.log('Rollback completed');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get current deployment status
    getStatus() {
        return {
            currentEnvironment: this.currentEnvironment,
            nextEnvironment: this.nextEnvironment,
            blueHealth: this.checkEnvironmentHealth('blue'),
            greenHealth: this.checkEnvironmentHealth('green')
        };
    }

    checkEnvironmentHealth(environment) {
        try {
            const response = execSync(`curl -s http://localhost:8080/health/${environment}`).toString();
            return JSON.parse(response);
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }
}

module.exports = BlueGreenDeployer;
```

### Automated Rollback Controller – `deployment/scripts/rollback-controller.js`
```javascript
const { execSync } = require('child_process');

class RollbackController {
    constructor(errorThreshold = 0.05, monitorWindow = '2m') {
        this.errorThreshold = errorThreshold;
        this.monitorWindow = monitorWindow;
        this.checkInterval = 30000; // 30 seconds
        this.isMonitoring = false;
    }

    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        console.log('Starting automated rollback monitoring...');

        this.monitorInterval = setInterval(() => {
            this.checkAndRollbackIfNeeded();
        }, this.checkInterval);
    }

    stopMonitoring() {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isMonitoring = false;
        console.log('Stopped automated rollback monitoring');
    }

    async checkAndRollbackIfNeeded() {
        try {
            const currentEnv = this.getCurrentEnvironment();
            const errorRate = await this.calculateErrorRate(currentEnv);

            console.log(`Current error rate for ${currentEnv}: ${errorRate}`);

            if (errorRate > this.errorThreshold) {
                console.warn(`Error rate ${errorRate} exceeds threshold ${this.errorThreshold}. Triggering rollback...`);
                await this.triggerRollback(currentEnv);
            }
        } catch (error) {
            console.error('Error during monitoring check:', error);
        }
    }

    getCurrentEnvironment() {
        // Extract current environment from nginx config
        try {
            const nginxConfig = execSync('cat deployment/nginx/nginx.conf').toString();
            const match = nginxConfig.match(/set \$active_environment "(\w+)"/);
            return match ? match[1] : 'blue';
        } catch (error) {
            console.error('Error reading nginx config:', error);
            return 'blue';
        }
    }

    async calculateErrorRate(environment) {
        // Simulate error rate calculation
        // In production, this would query your monitoring system
        const health = await this.checkHealth(environment);
        return health.healthy ? 0.01 : 0.99; // Simplified for example
    }

    async checkHealth(environment) {
        try {
            const response = execSync(`curl -s http://localhost:8080/health/${environment}`).toString();
            return JSON.parse(response);
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }

    async triggerRollback(failedEnvironment) {
        const targetEnvironment = failedEnvironment === 'blue' ? 'green' : 'blue';
        
        console.log(`Rolling back from ${failedEnvironment} to ${targetEnvironment}`);
        
        // Update nginx to route to healthy environment
        const deployer = new (require('./deploy-controller'))();
        deployer.currentEnvironment = failedEnvironment;
        deployer.nextEnvironment = targetEnvironment;
        
        await deployer.switchTraffic();
        deployer.swapEnvironments();
        
        console.log(`Successfully rolled back to ${targetEnvironment}`);
        
        // Notify (could be Slack, email, etc.)
        this.notifyRollback(failedEnvironment, targetEnvironment);
    }

    notifyRollback(fromEnv, toEnv) {
        console.log(`🚨 AUTOMATED ROLLBACK: Switched from ${fromEnv} to ${toEnv} due to high error rate`);
        
        // Example: Send to logging system or notification service
        const rollbackEvent = {
            type: 'automated_rollback',
            timestamp: new Date().toISOString(),
            fromEnvironment: fromEnv,
            toEnvironment: toEnv,
            reason: 'high_error_rate',
            threshold: this.errorThreshold
        };
        
        // In production, send this to your logging/monitoring system
        console.log('Rollback event:', JSON.stringify(rollbackEvent, null, 2));
    }
}

module.exports = RollbackController;
```

---

## 5. Database Migration Scripts

### `database/migrations/migrate-blue-to-green.js`
```javascript
const mongoose = require('mongoose');

class DatabaseMigrator {
    constructor() {
        this.blueURI = 'mongodb://localhost:27017/mernapp_blue';
        this.greenURI = 'mongodb://localhost:27017/mernapp_green';
    }

    async syncDatabases() {
        console.log('Starting database synchronization...');
        
        try {
            const blueConn = await mongoose.createConnection(this.blueURI).asPromise();
            const greenConn = await mongoose.createConnection(this.greenURI).asPromise();

            // Sync users
            await this.syncCollection(blueConn, greenConn, 'users');
            
            // Sync products
            await this.syncCollection(blueConn, greenConn, 'products');
            
            // Sync other collections...
            
            console.log('Database synchronization completed successfully');
            
        } catch (error) {
            console.error('Database synchronization failed:', error);
            throw error;
        }
    }

    async syncCollection(sourceConn, targetConn, collectionName) {
        console.log(`Syncing ${collectionName}...`);
        
        const sourceCollection = sourceConn.collection(collectionName);
        const targetCollection = targetConn.collection(collectionName);
        
        // Get all documents from source
        const documents = await sourceCollection.find({}).toArray();
        
        // Clear target collection
        await targetCollection.deleteMany({});
        
        // Insert documents into target
        if (documents.length > 0) {
            await targetCollection.insertMany(documents);
        }
        
        console.log(`Synced ${documents.length} documents in ${collectionName}`);
    }
}

module.exports = DatabaseMigrator;
```

---

## 6. Root `package.json` Scripts
```json
{
  "name": "mern-blue-green-deployment",
  "version": "1.0.0",
  "scripts": {
    "dev:blue": "cd backend/blue && node server.js",
    "dev:green": "cd backend/green && node server.js",
    "build:blue": "cd frontend && cp .env.blue .env && npm run build && mv build build-blue",
    "build:green": "cd frontend && cp .env.green .env && npm run build && mv build build-green",
    "deploy:blue": "node deployment/scripts/deploy-controller.js blue",
    "deploy:green": "node deployment/scripts/deploy-controller.js green",
    "deploy:switch": "node deployment/scripts/switch-traffic.js",
    "deploy:rollback": "node deployment/scripts/rollback-controller.js",
    "deploy:status": "node deployment/scripts/status-checker.js",
    "db:sync": "node database/migrations/migrate-blue-to-green.js",
    "health:check": "node deployment/scripts/health-monitor.js",
    "start:monitoring": "node deployment/scripts/rollback-controller.js --monitor"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "nodemon": "^2.0.22",
    "concurrently": "^7.6.0"
  }
}
```

---

## 7. Quick Start Guide

### 1. Initial Setup
```bash
# Clone and install dependencies
git clone <your-repo>
cd mern-blue-green-deployment

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup databases
mongod --dbpath ./data/blue --port 27017
mongod --dbpath ./data/green --port 27018
```

### 2. Start Blue Environment
```bash
# Start blue backend
npm run dev:blue

# In another terminal, build blue frontend
npm run build:blue

# Start nginx
nginx -c deployment/nginx/nginx.conf
```

### 3. Deploy New Version to Green
```bash
# Deploy to green environment
npm run deploy:green

# Monitor deployment
npm run health:check

# Start automated monitoring
npm run start:monitoring
```

### 4. Switch Traffic
```bash
# Manually switch traffic (if auto-promotion is disabled)
npm run deploy:switch
```

### 5. Check Status
```bash
# Check current deployment status
npm run deploy:status
```

---

This README now embeds the entire blue/green deployment implementation guide, wiring together backend health endpoints, environment-aware frontend builds, nginx-based routing, deployment automation scripts, database synchronization utilities, and the operational quick-start steps.

