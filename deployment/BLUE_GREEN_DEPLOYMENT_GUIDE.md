# Blue-Green Deployment Guide

## Overview

This guide explains how to use the complete blue-green deployment system with all its features.

## Core Concepts

### Blue-Green Deployment
- **Blue Environment**: Current production environment (port 5000)
- **Green Environment**: Staging/new version environment (port 5001)
- **Traffic Switching**: Seamlessly move traffic from one environment to another
- **Zero Downtime**: Users experience no interruption during deployment

## Deployment Workflow

### 1. Initial Setup

```bash
# Start both environments
npm run dev:blue    # Terminal 1
npm run dev:green   # Terminal 2
```

### 2. Deploy New Version

#### Deploy to Green (Recommended)
```bash
npm run deploy:green v1.2.0
```

This will:
1. ✅ Validate pre-deployment requirements
2. 📊 Sync database from blue to green
3. 🔨 Build frontend for green environment
4. 🚀 Deploy backend to green environment
5. 🏥 Perform health checks
6. 🔄 Switch traffic to green
7. 📝 Record deployment history

#### Deploy to Blue
```bash
npm run deploy:blue v1.2.0
```

### 3. Check Deployment Status

```bash
npm run deploy:status
```

Shows:
- Current live environment
- Health status of both environments
- Recent deployment history
- Configuration details

### 4. Health Monitoring

```bash
# One-time health check
npm run health:check

# Continuous monitoring with auto-rollback
npm run start:monitoring
```

### 5. Manual Traffic Switching

```bash
# Switch to green
npm run deploy:switch green

# Switch to blue
npm run deploy:switch blue
```

## Advanced Features

### State Persistence

The deployment system maintains state in `.deployment-state.json`:
- Current live environment
- Next environment
- Deployment history
- Last deployment details

### Health Checks

Health checks are performed:
- **Direct**: Checks backend directly (ports 5000/5001)
- **Comprehensive**: Validates service, database, and environment
- **Retry Logic**: Multiple attempts with timeout
- **Detailed Reporting**: Shows status, database connection, timestamps

### Database Synchronization

Before switching traffic, the system:
1. Connects to both databases
2. Syncs all collections (users, products, etc.)
3. Ensures data consistency
4. Continues deployment even if sync has warnings

### Automated Rollback

The rollback controller:
- Monitors error rates continuously
- Triggers automatic rollback on high error rates (>5%)
- Verifies target environment health before switching
- Logs all rollback events

### Deployment History

Tracks:
- Version deployed
- Environment targeted
- Success/failure status
- Timestamps
- Error messages (if any)

## Command Reference

### Deployment Commands

```bash
# Deploy to specific environment
npm run deploy:blue [version]     # Deploy to blue
npm run deploy:green [version]    # Deploy to green

# Traffic management
npm run deploy:switch [env]       # Switch traffic (blue/green)
npm run deploy:rollback            # Manual rollback

# Status and monitoring
npm run deploy:status             # Show deployment status
npm run health:check              # Check health of both environments
npm run start:monitoring          # Start automated monitoring

# Database
npm run db:sync                   # Sync databases manually
```

### Direct Script Usage

```bash
# Using deploy-controller directly
node deployment/scripts/deploy-controller.js blue v1.0.0
node deployment/scripts/deploy-controller.js green v1.0.0
node deployment/scripts/deploy-controller.js switch green
node deployment/scripts/deploy-controller.js status
node deployment/scripts/deploy-controller.js health

# Using other scripts
node deployment/scripts/status-checker.js
node deployment/scripts/health-monitor.js
node deployment/scripts/rollback-controller.js --monitor
```

## Deployment Scenarios

### Scenario 1: Standard Deployment

```bash
# 1. Deploy new version to green
npm run deploy:green v1.2.0

# 2. Verify deployment
npm run deploy:status

# 3. Test green environment manually
curl http://localhost:5001/health

# 4. If everything looks good, traffic is already switched
# If you need to switch back:
npm run deploy:switch blue
```

### Scenario 2: Rollback on Issues

```bash
# 1. Deploy to green
npm run deploy:green v1.2.0

# 2. Start monitoring
npm run start:monitoring

# 3. If issues detected, automatic rollback occurs
# Or manually rollback:
npm run deploy:rollback
```

### Scenario 3: Database Migration

```bash
# 1. Sync databases before deployment
npm run db:sync

# 2. Deploy new version
npm run deploy:green v1.2.0

# 3. Database sync happens automatically during deployment
```

## Health Check Details

### What Gets Checked

1. **HTTP Status**: 200 OK response
2. **Service Status**: "healthy" status
3. **Database Connection**: MongoDB connection state
4. **Response Time**: Health check latency
5. **Environment Info**: Service name, environment, timestamp

### Health Check Endpoints

- Blue: `http://localhost:5000/health`
- Green: `http://localhost:5001/health`
- Metrics: `http://localhost:5000/metrics` or `http://localhost:5001/metrics`

## Troubleshooting

### Deployment Fails at Health Check

```bash
# Check backend logs
pm2 logs backend-blue
pm2 logs backend-green

# Check health directly
curl http://localhost:5000/health
curl http://localhost:5001/health

# Check MongoDB connection
# Ensure MongoDB is running
```

### Traffic Not Switching

```bash
# Check nginx configuration
cat deployment/nginx/nginx.conf | grep active_environment

# Manually reload nginx
nginx -s reload

# Or restart nginx
nginx -c deployment/nginx/nginx.conf
```

### State File Issues

```bash
# View current state
cat deployment/.deployment-state.json

# Reset state (if needed)
rm deployment/.deployment-state.json
# Next deployment will recreate it
```

## Best Practices

1. **Always Check Status First**
   ```bash
   npm run deploy:status
   ```

2. **Verify Health Before Switching**
   ```bash
   npm run health:check
   ```

3. **Use Version Tags**
   ```bash
   npm run deploy:green v1.2.0
   ```

4. **Monitor After Deployment**
   ```bash
   npm run start:monitoring
   ```

5. **Keep Deployment History**
   - History is automatically maintained
   - Last 10 deployments are kept
   - Check with `npm run deploy:status`

## Integration with CI/CD

### Example CI/CD Pipeline

```yaml
# Example GitHub Actions workflow
- name: Deploy to Green
  run: npm run deploy:green ${{ github.sha }}

- name: Health Check
  run: npm run health:check

- name: Switch Traffic
  run: npm run deploy:switch green
  if: success()
```

## Monitoring and Alerts

### Automated Monitoring

The rollback controller monitors:
- Error rates (threshold: 5%)
- Health check failures
- Consecutive failures (max: 3)
- Response times

### Alert Integration

To add alerts (Slack, email, etc.), modify:
- `deployment/scripts/rollback-controller.js`
- `notifyRollback()` method

## Security Considerations

1. **JWT Secrets**: Use different secrets per environment
2. **Database Access**: Secure MongoDB connections
3. **API Keys**: Store in environment files, not in code
4. **Nginx**: Configure SSL/TLS for production
5. **State File**: Contains deployment history (not sensitive)

## Performance Tips

1. **Health Check Timeout**: Adjustable in deploy-controller (default: 30s)
2. **Retry Interval**: Configurable (default: 5s)
3. **Database Sync**: Can be skipped with `skipDbSync` option
4. **Gradual Rollout**: Canary deployment support (future enhancement)

## Next Steps

- Review deployment history regularly
- Monitor error rates
- Test rollback procedures
- Document environment-specific configurations
- Set up production monitoring

---

For more details, see:
- [SETUP_INSTRUCTIONS.md](../SETUP_INSTRUCTIONS.md)
- [HOW_TO_RUN.md](../HOW_TO_RUN.md)
- [PROJECT_COMPLETION_SUMMARY.md](../PROJECT_COMPLETION_SUMMARY.md)

