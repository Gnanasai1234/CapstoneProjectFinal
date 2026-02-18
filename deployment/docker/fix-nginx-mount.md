# Fixing Nginx Docker Volume Mount Issue

## Problem
When nginx config is mounted as read-only (`:ro`), Docker can't update it with `docker cp`, causing "device or resource busy" errors.

## Solution
The config files have been updated to use read-write mounts (`:rw`), and the deployment script now:
1. Updates the config file on the host
2. Waits for file system sync
3. Tests the config
4. Reloads nginx (which reads the updated config from the volume)

## If You Still Get Errors

### Option 1: Restart the Container
```powershell
docker restart blue-green-nginx
```

### Option 2: Recreate Container with Updated Mount
```powershell
# Stop and remove
docker stop blue-green-nginx
docker rm blue-green-nginx

# Restart with updated script
.\deployment\docker\run-nginx.ps1
```

### Option 3: Manual Reload
```powershell
# Test config
docker exec blue-green-nginx nginx -t

# Reload
docker exec blue-green-nginx nginx -s reload
```

## Verification
After deployment, verify the switch worked:
```powershell
curl http://localhost:80/health
# Should show the environment you deployed to
```

