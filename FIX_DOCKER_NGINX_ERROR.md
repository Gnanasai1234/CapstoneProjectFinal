# Fix: Docker Nginx "device or resource busy" Error

## Problem
When deploying, you get this error:
```
Error response from daemon: unlinkat /etc/nginx/nginx.conf: device or resource busy
```

This happens because the nginx config file is mounted as a volume, and Docker can't overwrite it with `docker cp`.

## Solution Applied

✅ **Fixed the deployment script** - Now it:
1. Updates the config file on the host
2. Waits for file system sync
3. Tests the config
4. Reloads nginx (reads updated config from volume)

✅ **Updated Docker scripts** - Changed volume mounts from `:ro` (read-only) to `:rw` (read-write)

## Quick Fix Steps

### Step 1: Recreate the Nginx Container

Since your current container was created with the old settings, recreate it:

```powershell
# Stop and remove existing container
docker stop blue-green-nginx
docker rm blue-green-nginx

# Restart with updated script (now uses :rw mount)
.\deployment\docker\run-nginx.ps1
```

### Step 2: Try Deployment Again

```powershell
# Deploy to green
npm run deploy:green v1.0.0

# Or deploy to blue
npm run deploy:blue v1.0.0
```

## How It Works Now

1. **Deployment script updates** `nginx.docker.conf` on the host
2. **Volume mount** automatically reflects the change in the container
3. **Nginx reload** reads the updated config
4. **No docker cp needed** - the volume mount handles it

## If You Still Get Errors

### Option 1: Manual Reload
```powershell
# The config is already updated on host, just reload nginx
docker exec blue-green-nginx nginx -t
docker exec blue-green-nginx nginx -s reload
```

### Option 2: Restart Container
```powershell
# Restart picks up volume changes
docker restart blue-green-nginx
```

### Option 3: Check Volume Mount
```powershell
# Verify the mount is working
docker inspect blue-green-nginx | Select-String -Pattern "Mounts" -Context 0,10
```

## Verification

After deployment, check which environment is active:
```powershell
curl http://localhost:80/health
# Should show the environment you deployed to
```

## Files Changed

- ✅ `deployment/scripts/deploy-controller.js` - Improved reload logic
- ✅ `deployment/docker/run-nginx.ps1` - Changed to `:rw` mount
- ✅ `deployment/docker/run-nginx.sh` - Changed to `:rw` mount  
- ✅ `deployment/docker/docker-compose.yml` - Changed to `:rw` mount

The error should now be fixed! 🎉

