# Frontend API URL Fix - Using Nginx Routing

## Problem
The frontend was using hardcoded backend URLs (e.g., `http://localhost:5000/api` or `http://localhost:5001/api`) that were baked into the build. When nginx switched environments, the frontend still pointed to the old backend.

## Solution Applied

✅ **Changed to Relative URLs** - Frontend now uses `/api` (relative URL)
✅ **Nginx Routes Automatically** - Nginx routes `/api` to the correct backend based on active environment
✅ **No Rebuild Needed** - Frontend doesn't need to be rebuilt when switching environments

## How It Works Now

1. **Frontend uses relative URL**: `/api` (instead of `http://localhost:5000/api`)
2. **Nginx routes `/api`**: Based on `$active_environment`, nginx routes to:
   - Blue backend (port 5000) when `active_environment = "blue"`
   - Green backend (port 5001) when `active_environment = "green"`
3. **Automatic switching**: When nginx switches environments, all API calls automatically go to the new backend

## Changes Made

### Frontend Code
- ✅ `frontend/src/config/api.js` - Now returns `/api` (relative URL)
- ✅ All components updated to use `${ApiConfig.baseURL}/...` directly
- ✅ Removed `.replace('/api', '')/api/...` pattern

### Nginx Configuration
- ✅ Updated to serve static files from `build-blue` or `build-green` directories
- ✅ Routes `/api` to correct backend based on active environment
- ✅ Docker setup mounts frontend build directories

## Rebuild Frontend

Since the frontend code changed, you need to rebuild:

```powershell
# Rebuild blue frontend
npm run build:blue

# Rebuild green frontend  
npm run build:green
```

## Restart Nginx with New Mounts

After rebuilding, restart nginx to mount the new build directories:

```powershell
# Stop and remove
docker stop blue-green-nginx
docker rm blue-green-nginx

# Restart with updated mounts
.\deployment\docker\run-nginx.ps1
```

## Verify It Works

1. **Deploy to green**:
   ```powershell
   npm run deploy:green v1.0.0
   ```

2. **Check frontend**:
   - Open browser: http://localhost:80
   - Open DevTools → Network tab
   - Make an API call (login, etc.)
   - Check the request URL - should be `/api/...` (relative)
   - Check response headers - should show `X-Environment: green`

3. **Switch to blue**:
   ```powershell
   npm run deploy:switch blue
   ```

4. **Check again**:
   - API calls should now go to blue backend
   - Response headers should show `X-Environment: blue`

## Benefits

- ✅ **No frontend rebuild needed** when switching environments
- ✅ **Automatic routing** through nginx
- ✅ **Single frontend build** works for both environments
- ✅ **Simpler deployment** process

## Development vs Production

- **Development**: Frontend can still use direct URLs for testing
- **Production**: Uses relative URLs through nginx

The frontend will now automatically use the correct backend when nginx switches environments! 🎉

