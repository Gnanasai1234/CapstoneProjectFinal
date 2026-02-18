# Nginx Docker Setup Guide

## Quick Start

### Option 1: Using Docker Compose (Recommended)

```bash
# Navigate to deployment/docker directory
cd deployment/docker

# Start nginx
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f nginx

# Stop nginx
docker-compose down
```

### Option 2: Using Docker Run Command

#### For Windows/Mac (Docker Desktop)
```bash
docker run -d \
  --name blue-green-nginx \
  -p 80:80 \
  -p 8080:8080 \
  -v "$(pwd)/deployment/nginx/nginx.docker.conf:/etc/nginx/nginx.conf:ro" \
  --add-host=host.docker.internal:host-gateway \
  nginx:alpine
```

#### For Linux
```bash
docker run -d \
  --name blue-green-nginx \
  --network host \
  -v "$(pwd)/deployment/nginx/nginx.docker.conf:/etc/nginx/nginx.conf:ro" \
  nginx:alpine
```

## Configuration

### Windows/Mac Docker Desktop
- Uses `host.docker.internal` to access host services
- Use `nginx.docker.conf` configuration file
- Ports are mapped: `80:80` and `8080:8080`

### Linux
- Uses `host` network mode to access host services directly
- Use `nginx.docker.conf` configuration file
- No port mapping needed (uses host network)

## Verify Nginx is Running

```bash
# Check container status
docker ps | grep nginx

# Test nginx
curl http://localhost:8080/health/blue
curl http://localhost:8080/health/green

# Check nginx logs
docker logs blue-green-nginx
```

## Troubleshooting

### Issue: Cannot connect to backend services

**Solution for Windows/Mac:**
- Ensure `host.docker.internal` is accessible
- Check if Docker Desktop is running
- Verify backend services are running on host

**Solution for Linux:**
- Use `--network host` mode
- Or use `host.docker.internal:host-gateway` with extra_hosts

### Issue: Port already in use

```bash
# Check what's using the port
netstat -ano | findstr :80    # Windows
lsof -i :80                    # Linux/Mac

# Stop existing nginx
docker stop blue-green-nginx
docker rm blue-green-nginx
```

### Issue: Configuration file not found

```bash
# Ensure you're in the correct directory
cd deployment/docker

# Check file exists
ls -la ../nginx/nginx.docker.conf

# Use absolute path if needed
docker run -d \
  --name blue-green-nginx \
  -p 80:80 \
  -p 8080:8080 \
  -v "D:/Capstone/deployment/nginx/nginx.docker.conf:/etc/nginx/nginx.conf:ro" \
  --add-host=host.docker.internal:host-gateway \
  nginx:alpine
```

## Update Configuration

After changing nginx configuration:

```bash
# Reload nginx in container
docker exec blue-green-nginx nginx -s reload

# Or restart container
docker-compose restart nginx
```

## Stop and Remove

```bash
# Stop container
docker stop blue-green-nginx

# Remove container
docker rm blue-green-nginx

# Or with docker-compose
docker-compose down
```

## Integration with Deployment Scripts

The deployment scripts will automatically update the nginx configuration. After deployment:

```bash
# Reload nginx configuration
docker exec blue-green-nginx nginx -s reload
```

Or add this to your deployment script to auto-reload nginx in Docker.

